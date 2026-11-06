import { test, expect } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

// Projects, search, spend and the cron switch over HTTP, with the AI mocked. Test data is named "[e2e] ..."
// so the teardown can delete it.

type Asset = { id: string; kind: string; projectId: string | null; mimeType: string; generation: { id: string; prompt: string } | null };
type Result = { id: string; status: string; costUsd: number | null; assets: Asset[] };
type Project = { id: string; name: string };
type Page = { items: Asset[]; nextCursor: string | null };

const tag = (s: string) => `[e2e] ${s} ${Math.random().toString(36).slice(2, 8)}`;
const unique = () => Math.random().toString(36).slice(2, 10);

async function makeProject(request: APIRequestContext, name = tag("project")) {
  const res = await request.post("/api/projects", { data: { name } });
  expect(res.status()).toBe(200);
  return (await res.json()) as Project;
}

async function makeImage(request: APIRequestContext, prompt: string, extra: Record<string, unknown> = {}) {
  const res = await request.post("/api/generations", { data: { prompt, ...extra } });
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()) as Result;
}

const library = async (request: APIRequestContext, query: string) =>
  (await (await request.get(`/api/library?limit=60&${query}`)).json()) as Page;

test("projects: create, list, rename, soft delete", async ({ request }) => {
  const p = await makeProject(request);
  expect(((await (await request.get("/api/projects")).json()) as { projects: Project[] }).projects.map((x) => x.id)).toContain(p.id);

  const name = tag("renamed");
  expect((await (await request.patch(`/api/projects/${p.id}`, { data: { name } })).json()).name).toBe(name);

  const empty = await request.post("/api/projects", { data: { name: "   " } });
  expect(empty.status()).toBe(400);
  expect((await empty.json()).error).toBe("Give the project a name.");

  expect((await request.delete(`/api/projects/${p.id}`)).status()).toBe(200);
  expect(((await (await request.get("/api/projects")).json()) as { projects: Project[] }).projects.map((x) => x.id)).not.toContain(p.id);
  expect((await request.delete(`/api/projects/${p.id}`)).status()).toBe(404);
  expect((await request.patch(`/api/projects/not-a-uuid`, { data: { name: "x" } })).status()).toBe(400);
});

test("new images and clips can be put in a project, and the Library filters by it", async ({ request }) => {
  const a = await makeProject(request);
  const b = await makeProject(request);
  const inA = (await makeImage(request, tag("in a"), { projectId: a.id })).assets[0];
  const inB = (await makeImage(request, tag("in b"), { projectId: b.id })).assets[0];
  const none = (await makeImage(request, tag("in none"))).assets[0];
  expect(inA.projectId).toBe(a.id);
  expect(none.projectId).toBeNull();

  const onlyA = (await library(request, `project=${a.id}`)).items.map((x) => x.id);
  expect(onlyA).toContain(inA.id);
  expect(onlyA).not.toContain(inB.id);
  expect(onlyA).not.toContain(none.id);

  // Move one item to the other project, then out of all projects.
  expect((await request.patch(`/api/assets/${inA.id}`, { data: { projectId: b.id } })).status()).toBe(200);
  expect((await library(request, `project=${b.id}`)).items.map((x) => x.id)).toEqual(expect.arrayContaining([inA.id, inB.id]));
  expect((await request.patch(`/api/assets/${inA.id}`, { data: { projectId: null } })).status()).toBe(200);
  expect((await library(request, `project=${b.id}`)).items.map((x) => x.id)).not.toContain(inA.id);

  const nothing = await request.patch(`/api/assets/${inA.id}`, { data: {} });
  expect(nothing.status()).toBe(400);
  expect((await nothing.json()).error).toBe("Say what to change.");

  // A clip started in a project saves its file into it.
  const start = await request.post("/api/videos", { data: { prompt: tag("clip in a"), projectId: a.id } });
  expect(start.status()).toBe(200);
  const job = await start.json();
  for (let i = 0; i < 40; i++) {
    const j = await (await request.get(`/api/videos/${job.id}`)).json();
    if (j.status !== "running") {
      expect(j.status).toBe("succeeded");
      expect(j.asset.projectId).toBe(a.id);
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
});

test("a project that doesn't exist, or was deleted, is refused with a plain message", async ({ request }) => {
  const gone = await makeProject(request);
  await request.delete(`/api/projects/${gone.id}`);
  for (const projectId of [gone.id, "00000000-0000-4000-8000-000000000099"]) {
    const res = await request.post("/api/generations", { data: { prompt: tag("x"), projectId } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe("That project doesn't exist any more.");
  }
  const thread = await request.post("/api/agent/threads", { data: { title: tag("t"), projectId: gone.id } });
  expect(thread.status()).toBe(400);
});

test("chats can belong to a project and be moved out of it", async ({ request }) => {
  const p = await makeProject(request);
  const t = await (await request.post("/api/agent/threads", { data: { title: tag("chat"), projectId: p.id } })).json();
  expect(t.projectId).toBe(p.id);
  const moved = await (await request.patch(`/api/agent/threads/${t.id}`, { data: { projectId: null } })).json();
  expect(moved.projectId).toBeNull();
  expect((await request.patch(`/api/agent/threads/${t.id}`, { data: {} })).status()).toBe(400);
});

test("search finds a prompt by its words, ignoring case, and the rest of the filters still apply", async ({ request }) => {
  const word = `zebra${unique()}`;
  const other = `giraffe${unique()}`;
  const p = await makeProject(request);
  const hit = (await makeImage(request, `[e2e] a ${word} crossing`, { projectId: p.id })).assets[0];
  const miss = (await makeImage(request, `[e2e] a ${other} walking`)).assets[0];

  const found = (await library(request, `q=${word.toUpperCase()}`)).items.map((x) => x.id);
  expect(found).toContain(hit.id);
  expect(found).not.toContain(miss.id);

  expect((await library(request, `q=${word}&project=${p.id}`)).items.map((x) => x.id)).toEqual([hit.id]);
  expect((await library(request, `q=${word}&kind=video`)).items).toEqual([]);
  expect((await library(request, `q=${word}&kind=image`)).items.map((x) => x.id)).toEqual([hit.id]);
  // Spaces and a blank search are tidied, not errors.
  expect((await library(request, `q=%20%20${word}%20%20`)).items.map((x) => x.id)).toEqual([hit.id]);
  expect((await request.get("/api/library?q=%20%20")).status()).toBe(200);
});

test("search treats % and _ as plain characters and survives filter syntax", async ({ request }) => {
  const stamp = unique();
  const percent = (await makeImage(request, `[e2e] ${stamp} is 100% cotton`)).assets[0];
  const under = (await makeImage(request, `[e2e] ${stamp} has under_score`)).assets[0];
  const plain = (await makeImage(request, `[e2e] ${stamp} plain words`)).assets[0];

  expect((await library(request, `q=${encodeURIComponent("100%")}`)).items.map((x) => x.id)).toContain(percent.id);
  // "%" alone would match everything if it were a wildcard. As text it matches only prompts containing a percent sign.
  const onlyPercent = (await library(request, `q=${encodeURIComponent(`${stamp} is 100%`)}`)).items.map((x) => x.id);
  expect(onlyPercent).toEqual([percent.id]);

  const underscore = (await library(request, `q=${encodeURIComponent(`${stamp} has under_`)}`)).items.map((x) => x.id);
  expect(underscore).toEqual([under.id]); // "_" didn't match "r" in "under score"-like text or any single character
  expect(underscore).not.toContain(plain.id);

  for (const nasty of ["a,b)c(d", "x),or(deleted_at.is.null", "\\", "%_%", "'--"]) {
    const res = await request.get(`/api/library?q=${encodeURIComponent(nasty)}`);
    expect(res.status(), nasty).toBe(200);
    expect((await res.json()).items).toEqual([]); // it changed nothing about which rows are searched
  }

  // Text that Supabase's own firewall refuses as an attack comes back as a plain 400, not a server error.
  const blocked = await request.get(`/api/library?q=${encodeURIComponent('"; drop table assets; --')}`);
  expect(blocked.status()).toBe(400);
  expect((await blocked.json()).error).toBe("That search text was blocked. Try different words.");
});

test("search pages with the cursor and never repeats an item", async ({ request }) => {
  const word = `pager${unique()}`;
  const made = [];
  for (const n of ["one", "two", "three"]) made.push((await makeImage(request, `[e2e] ${word} ${n}`)).assets[0].id);

  const seen: string[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 10; i++) {
    const page: Page = (await (await request.get(`/api/library?limit=1&q=${word}${cursor ? `&cursor=${cursor}` : ""}`)).json()) as Page;
    seen.push(...page.items.map((a) => a.id));
    cursor = page.nextCursor;
    if (!cursor) break;
  }
  expect(seen.sort()).toEqual([...made].sort());
});

test("spend: thirty days, grouped, and it grows when something is made", async ({ request }) => {
  const before = await (await request.get("/api/spend")).json();
  expect(before.summary.byDay).toHaveLength(30);
  expect(before.summary.byDay.at(-1).date).toBe(new Date().toISOString().slice(0, 10));
  expect(typeof before.unknownCostCount).toBe("number");
  const costs = before.expensive.map((g: { costUsd: number }) => g.costUsd);
  expect(costs).toEqual([...costs].sort((a: number, b: number) => b - a));

  await makeImage(request, tag("costs money")); // the mock image is estimated at $0.039
  const after = await (await request.get("/api/spend")).json();
  expect(after.summary.last30Usd).toBeGreaterThanOrEqual(before.summary.last30Usd + 0.039 - 1e-9);
  expect(after.summary.byKind.find((k: { kind: string }) => k.kind === "image")).toBeTruthy();
  const shares = after.summary.byModel.reduce((n: number, m: { share: number }) => n + m.share, 0);
  expect(shares).toBeCloseTo(1, 4);
});

test("the cron route is off unless CRON_SECRET is set", async ({ request }) => {
  const res = await request.get("/api/cron/videos", { headers: { authorization: "Bearer anything" } });
  expect(res.status()).toBe(404);
});

test("the password status says the gate is off on this server", async ({ request }) => {
  expect(await (await request.get("/api/auth/status")).json()).toEqual({ enabled: false });
});
