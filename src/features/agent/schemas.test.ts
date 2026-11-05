import { describe, expect, it } from "vitest";
import { refinePromptSchema, sendMessageSchema, shotListSchema, shotListToolSchema, titleFromMessage } from "./schemas";

const shot = { prompt: "A lighthouse in a storm", aspectRatio: "16:9" };

describe("shotListSchema", () => {
  it("accepts a title and shots, with label and notes optional", () => {
    const r = shotListSchema.parse({ title: "Storm", shots: [shot, { ...shot, label: "Wide", notes: "Slow push in" }] });
    expect(r.shots).toHaveLength(2);
    expect(r.shots[0].label).toBeUndefined();
  });
  it("needs 1 to 12 shots", () => {
    expect(shotListSchema.safeParse({ title: "x", shots: [] }).success).toBe(false);
    expect(shotListSchema.safeParse({ title: "x", shots: Array(12).fill(shot) }).success).toBe(true);
    expect(shotListSchema.safeParse({ title: "x", shots: Array(13).fill(shot) }).success).toBe(false);
  });
  it("rejects an unknown aspect ratio and an empty prompt", () => {
    expect(shotListSchema.safeParse({ title: "x", shots: [{ ...shot, aspectRatio: "7:3" }] }).success).toBe(false);
    expect(shotListSchema.safeParse({ title: "x", shots: [{ ...shot, prompt: "  " }] }).success).toBe(false);
  });
});

describe("shotListToolSchema", () => {
  const strip = JSON.stringify(shotListToolSchema);
  it("is a plain object schema Gemini accepts: no $schema, no additionalProperties", () => {
    expect(shotListToolSchema).toMatchObject({ type: "object" });
    expect(strip).not.toContain("$schema");
    expect(strip).not.toContain("additionalProperties");
  });
  it("lists the allowed aspect ratios so the model can only pick real ones", () => {
    expect(strip).toContain('"16:9"');
    expect(strip).toContain('"21:9"');
  });
});

describe("request schemas", () => {
  it("trims the message and refuses an empty or huge one", () => {
    expect(sendMessageSchema.parse({ text: "  hello  " }).text).toBe("hello");
    expect(sendMessageSchema.safeParse({ text: "   " }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ text: "x".repeat(8001) }).success).toBe(false);
  });
  it("refine takes a prompt and an optional aspect ratio", () => {
    expect(refinePromptSchema.parse({ prompt: "a door" })).toEqual({ prompt: "a door" });
    expect(refinePromptSchema.safeParse({ prompt: "a door", aspectRatio: "7:3" }).success).toBe(false);
  });
});

describe("titleFromMessage", () => {
  it("collapses whitespace and cuts to 60 characters", () => {
    expect(titleFromMessage("  a   lighthouse\n\nin a storm ")).toBe("a lighthouse in a storm");
    expect(titleFromMessage("x".repeat(100))).toHaveLength(60);
  });
});
