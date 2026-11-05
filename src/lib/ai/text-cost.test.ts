import { describe, expect, it } from "vitest";
import { textCostUsd } from "./cost";

const before = new Date("2026-11-05T12:00:00Z");
const after = new Date("2027-01-01T00:00:00Z");

describe("textCostUsd", () => {
  it("prices a call at the intro rate before 2027 (input $0.75, output $3.75 per 1M)", () => {
    // 100 in at 0.75e-6 = 0.000075; (200 out + 100 thinking) at 3.75e-6 = 0.001125
    expect(textCostUsd("gemini-3.8-flash", { promptTokenCount: 100, candidatesTokenCount: 200, thoughtsTokenCount: 100 }, before)).toEqual({
      inputUsd: 0.000075,
      outputUsd: 0.001125,
      totalUsd: 0.0012,
    });
  });

  it("switches to the 2027 rate on 1 January (input $1.50, output $7.50 per 1M)", () => {
    expect(textCostUsd("gemini-3.8-flash", { promptTokenCount: 1_000_000, candidatesTokenCount: 1_000_000 }, after)).toEqual({
      inputUsd: 1.5,
      outputUsd: 7.5,
      totalUsd: 9,
    });
  });

  it("still uses the intro rate on the last day of 2026", () => {
    const lastDay = new Date("2026-12-31T23:59:59Z");
    expect(textCostUsd("gemini-3.8-flash", { promptTokenCount: 1_000_000 }, lastDay)?.inputUsd).toBe(0.75);
  });

  it("counts thinking tokens as output", () => {
    const r = textCostUsd("gemini-3.8-flash", { thoughtsTokenCount: 1_000_000 }, before);
    expect(r?.outputUsd).toBe(3.75);
  });

  it("returns null for a model with no known price, or no usage at all", () => {
    expect(textCostUsd("gemini-3.5-flash", { promptTokenCount: 10 }, before)).toBeNull();
    expect(textCostUsd("gemini-3.8-flash", undefined, before)).toBeNull();
  });
});
