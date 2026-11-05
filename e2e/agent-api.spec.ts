import { test, expect } from "@playwright/test";
import { createEventParser, type AgentEvent } from "../src/features/agent/stream";

// The agent routes over HTTP with the AI mocked (E2E_MOCK_AI=1). The mock streams a
// short reply and a 3-shot list. "[fail]" fails the reply; "[noshots]" skips the list.

const tag = (s: string) => `[e2e] ${s} ${Math.random().toString(36).slice(2, 8)}`;

type Thread = { id: string; title: string; updatedAt: string };
type Message = { id: string; role: string; text: string; shotList: { title: string; shots: { prompt: string }[] } | null; error: string | null; costUsd: number | null };

async function newThread(request: import("@playwright/test").APIRequestContext, title?: string) {
  return (await (await request.post("/api/agent/threads", { data: title ? { title } : {} })).json()) as Thread;
}

async function say(request: import("@playwright/test").APIRequestContext, threadId: string, text: string) {
  const res = await request.post(`/api/agent/threads/${threadId}/messages`, { data: { text } });
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/x-ndjson");
  return createEventParser().push(await res.text()) as AgentEvent[];
}

test("threads: create, list, rename, soft delete", async ({ request }) => {
  const title = tag("thread");
  const t = await newThread(request, title);
  expect(t.title).toBe(title);

  const list = (await (await request.get("/api/agent/threads")).json()) as Thread[];
  expect(list.map((x) => x.id)).toContain(t.id);

  const renamed = tag("renamed");
  const res = await request.patch(`/api/agent/threads/${t.id}`, { data: { title: renamed } });
  expect((await res.json()).title).toBe(renamed);

  expect((await request.patch(`/api/agent/threads/${t.id}`, { data: { title: "  " } })).status()).toBe(400);

  expect((await request.delete(`/api/agent/threads/${t.id}`)).status()).toBe(200);
  const after = (await (await request.get("/api/agent/threads")).json()) as Thread[];
  expect(after.map((x) => x.id)).not.toContain(t.id);
  expect((await request.get(`/api/agent/threads/${t.id}/messages`)).status()).toBe(404);
  expect((await request.delete(`/api/agent/threads/${t.id}`)).status()).toBe(404);
});

test("a reply streams text, then a shot list, then done, and is saved", async ({ request }) => {
  const t = await newThread(request);
  const idea = tag("a lighthouse in a storm");
  const events = await say(request, t.id, idea);

  const kinds = events.map((e) => e.type);
  expect(kinds.filter((k) => k === "text").length).toBeGreaterThan(1);
  expect(kinds.indexOf("shots")).toBeGreaterThan(kinds.lastIndexOf("text"));
  expect(kinds.at(-1)).toBe("done");

  const done = events.at(-1);
  if (done?.type !== "done") throw new Error("expected done");
  expect(done.message.shotList?.shots).toHaveLength(3);
  expect(done.message.shotList?.shots[0].prompt).toContain(idea);
  // About $0.00114 with the 6-decimal column, $0.0011 until that migration is applied.
  expect(done.message.costUsd).toBeGreaterThan(0.001);
  expect(done.message.costUsd).toBeLessThan(0.0012);

  const saved = (await (await request.get(`/api/agent/threads/${t.id}/messages`)).json()) as Message[];
  expect(saved.map((m) => m.role)).toEqual(["user", "assistant"]);
  expect(saved[0].text).toBe(idea);
  expect(saved[1].shotList?.title).toContain("Plan:");

  // The first message names the chat.
  const list = (await (await request.get("/api/agent/threads")).json()) as Thread[];
  expect(list.find((x) => x.id === t.id)?.title).toBe(idea.slice(0, 60));
});

test("a second message continues the same chat", async ({ request }) => {
  const t = await newThread(request, tag("two turns"));
  await say(request, t.id, tag("first idea"));
  await say(request, t.id, tag("second idea"));
  const saved = (await (await request.get(`/api/agent/threads/${t.id}/messages`)).json()) as Message[];
  expect(saved.map((m) => m.role)).toEqual(["user", "assistant", "user", "assistant"]);
});

test("a reply can have no shot list", async ({ request }) => {
  const t = await newThread(request, tag("plain"));
  const events = await say(request, t.id, tag("just talking [noshots]"));
  expect(events.some((e) => e.type === "shots")).toBe(false);
  expect(events.at(-1)?.type).toBe("done");
});

test("a failed reply is saved with its reason and the chat carries on", async ({ request }) => {
  const t = await newThread(request, tag("failing"));
  const events = await say(request, t.id, tag("[fail] go"));
  expect(events.at(-1)).toEqual({ type: "error", message: expect.stringContaining("Mock failure") });

  const saved = (await (await request.get(`/api/agent/threads/${t.id}/messages`)).json()) as Message[];
  expect(saved.map((m) => m.role)).toEqual(["user", "assistant"]);
  expect(saved[1].error).toMatch(/Mock failure/);

  const next = await say(request, t.id, tag("try again"));
  expect(next.at(-1)?.type).toBe("done");
});

test("bad requests get plain messages", async ({ request }) => {
  const t = await newThread(request, tag("validation"));
  const empty = await request.post(`/api/agent/threads/${t.id}/messages`, { data: { text: "   " } });
  expect(empty.status()).toBe(400);
  expect((await empty.json()).error).toBe("Write a message first.");

  expect((await request.post(`/api/agent/threads/${t.id}/messages`, { data: { text: "x".repeat(8001) } })).status()).toBe(400);
  expect((await request.post("/api/agent/threads/not-a-uuid/messages", { data: { text: "hi" } })).status()).toBe(400);
  expect((await request.post("/api/agent/threads/00000000-0000-4000-8000-000000000099/messages", { data: { text: "hi" } })).status()).toBe(404);

  const foreign = await request.post(`/api/agent/threads/${t.id}/messages`, {
    headers: { origin: "https://evil.example" },
    data: { text: "hi" },
  });
  expect(foreign.status()).toBe(403);
});

test("refine a prompt: returns a better one and keeps it in the refinements chat", async ({ request }) => {
  const prompt = tag("a red door");
  const res = await request.post("/api/agent/refine-prompt", { data: { prompt, aspectRatio: "16:9" } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.prompt).toContain(prompt);
  expect(body.prompt.length).toBeGreaterThan(prompt.length);

  const empty = await request.post("/api/agent/refine-prompt", { data: { prompt: "  " } });
  expect(empty.status()).toBe(400);

  const threads = (await (await request.get("/api/agent/threads")).json()) as Thread[];
  expect(threads.some((t) => t.title === "Prompt refinements")).toBe(true);
});
