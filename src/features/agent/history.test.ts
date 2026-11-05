import { describe, expect, it } from "vitest";
import { buildContents, MAX_HISTORY_MESSAGES, type StoredMessage } from "./history";

const msg = (role: "user" | "assistant", text: string, extra: Partial<StoredMessage> = {}): StoredMessage => ({
  role,
  text,
  shotList: null,
  error: null,
  ...extra,
});

describe("buildContents", () => {
  it("maps user to user and assistant to model, in order", () => {
    expect(buildContents([msg("user", "idea"), msg("assistant", "reply")])).toEqual([
      { role: "user", parts: [{ text: "idea" }] },
      { role: "model", parts: [{ text: "reply" }] },
    ]);
  });

  it("turns a past shot list into plain text, never a function call", () => {
    const shotList = { title: "Storm", shots: [{ label: "Wide", prompt: "A lighthouse", aspectRatio: "16:9" as const, notes: "slow push" }] };
    const [, model] = buildContents([msg("user", "plan"), msg("assistant", "Here you go.", { shotList })]);
    const text = (model.parts[0] as { text: string }).text;
    expect(text).toContain("Here you go.");
    expect(text).toContain("Storm");
    expect(text).toContain("Wide");
    expect(text).toContain("A lighthouse");
    expect(text).toContain("16:9");
    expect(text).toContain("slow push");
    expect(JSON.stringify(model)).not.toContain("functionCall");
  });

  it("skips replies that failed", () => {
    const out = buildContents([msg("user", "a"), msg("assistant", "half", { error: "boom" }), msg("user", "b")]);
    expect(out).toEqual([{ role: "user", parts: [{ text: "a\n\nb" }] }]);
  });

  it("merges neighbours with the same role, because the API wants alternating turns", () => {
    const out = buildContents([msg("user", "one"), msg("user", "two"), msg("assistant", "ok")]);
    expect(out.map((c) => c.role)).toEqual(["user", "model"]);
    expect(out[0].parts[0]).toEqual({ text: "one\n\ntwo" });
  });

  it("keeps only the latest messages and always starts with a user turn", () => {
    const many: StoredMessage[] = [];
    for (let i = 0; i < MAX_HISTORY_MESSAGES + 5; i++) many.push(msg(i % 2 === 0 ? "user" : "assistant", `m${i}`));
    const out = buildContents(many);
    expect(out[0].role).toBe("user");
    expect(out.length).toBeLessThanOrEqual(MAX_HISTORY_MESSAGES);
    expect(JSON.stringify(out)).toContain(`m${MAX_HISTORY_MESSAGES + 4}`);
    expect(JSON.stringify(out)).not.toContain('"m0"');
  });

  it("drops empty text", () => {
    expect(buildContents([msg("user", "   "), msg("user", "real")])).toEqual([{ role: "user", parts: [{ text: "real" }] }]);
  });
});
