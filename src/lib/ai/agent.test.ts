import { afterEach, describe, expect, it, vi } from "vitest";
import { shotListSchema } from "@/features/agent/schemas";
import { agentErrorMessage, refinePrompt, streamAgentReply, type AgentStreamEvent } from "./agent";

afterEach(() => vi.unstubAllEnvs());

const ask = (text: string) => [{ role: "user" as const, parts: [{ text }] }];

async function collect(text: string): Promise<AgentStreamEvent[]> {
  const out: AgentStreamEvent[] = [];
  for await (const e of streamAgentReply(ask(text))) out.push(e);
  return out;
}

describe("streamAgentReply with the e2e mock", () => {
  it("streams text in pieces, then a valid shot list, then usage", async () => {
    vi.stubEnv("E2E_MOCK_AI", "1");
    const events = await collect("a lighthouse in a storm");
    const kinds = events.map((e) => e.type);
    expect(kinds.filter((k) => k === "text").length).toBeGreaterThan(1);
    expect(kinds.indexOf("shots")).toBeGreaterThan(kinds.lastIndexOf("text"));
    expect(kinds.at(-1)).toBe("usage");

    const shots = events.find((e) => e.type === "shots");
    const parsed = shotListSchema.safeParse(shots && shots.type === "shots" ? shots.shotList : null);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.shots.length).toBe(3);
    expect(parsed.success && parsed.data.shots[0].prompt).toContain("a lighthouse in a storm");
  });

  it("can reply without a shot list", async () => {
    vi.stubEnv("E2E_MOCK_AI", "1");
    const events = await collect("just chatting [noshots]");
    expect(events.some((e) => e.type === "shots")).toBe(false);
    expect(events.some((e) => e.type === "text")).toBe(true);
  });

  it("fails on demand so the error path can be tested", async () => {
    vi.stubEnv("E2E_MOCK_AI", "1");
    await expect(collect("[fail] please")).rejects.toThrow(/Mock failure/);
  });
});

describe("refinePrompt with the e2e mock", () => {
  it("returns a longer prompt that keeps the original words", async () => {
    vi.stubEnv("E2E_MOCK_AI", "1");
    const r = await refinePrompt({ prompt: "a red door" });
    expect(r.prompt).toContain("a red door");
    expect(r.prompt.length).toBeGreaterThan("a red door".length);
    expect(r.usage.promptTokenCount).toBeGreaterThan(0);
  });
});

describe("agentErrorMessage", () => {
  it("explains rate limits in plain words", () => {
    expect(agentErrorMessage({ status: 429 })).toMatch(/too many requests|wait/i);
  });
  it("explains a timeout", () => {
    expect(agentErrorMessage(new Error("The operation was aborted due to timeout"))).toMatch(/took too long/i);
  });
  it("passes a short message through and hides a huge raw one", () => {
    expect(agentErrorMessage(new Error("Mock failure: boom"))).toBe("Mock failure: boom");
    expect(agentErrorMessage(new Error("x".repeat(900)))).toBe("The agent hit an error. Try again.");
  });
});
