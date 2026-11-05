import { describe, expect, it } from "vitest";
import { imageCostUsd } from "./cost";

// Worked example from a real Nano Banana 2.1 call (1K square image):
// 14 prompt tokens, 721 thinking tokens, 1120 image tokens.
// Google's list prices: $1.50 / $7.50 / $30.00 per 1M tokens.
// 14*1.5e-6 + 721*7.5e-6 + 1120*30e-6 = 0.0390285, stored to 4 decimals.
const realUsage = {
  promptTokenCount: 14,
  thoughtsTokenCount: 721,
  candidatesTokensDetails: [{ modality: "IMAGE", tokenCount: 1120 }],
};

describe("imageCostUsd", () => {
  it("prices a real Nano Banana 2.1 call from its token counts", () => {
    expect(imageCostUsd("gemini-nano-banana-2.1", realUsage)).toBe(0.039);
  });

  it("charges image output at the image rate and text output at the text rate", () => {
    const usage = {
      promptTokenCount: 0,
      thoughtsTokenCount: 0,
      candidatesTokensDetails: [
        { modality: "IMAGE", tokenCount: 1_000_000 },
        { modality: "TEXT", tokenCount: 1_000_000 },
      ],
    };
    expect(imageCostUsd("gemini-nano-banana-2.1", usage)).toBe(37.5);
  });

  it("uses each model's own prices", () => {
    const usage = { promptTokenCount: 1_000_000, thoughtsTokenCount: 0, candidatesTokensDetails: [] };
    expect(imageCostUsd("gemini-3-pro-image", usage)).toBe(2);
    expect(imageCostUsd("gemini-3.1-flash-lite-image", usage)).toBe(0.25);
  });

  it("returns null (unknown) for a model without a known price", () => {
    expect(imageCostUsd("some-future-model", realUsage)).toBeNull();
  });

  it("returns null when the response had no usage or no output token breakdown", () => {
    expect(imageCostUsd("gemini-nano-banana-2.1", undefined)).toBeNull();
    expect(imageCostUsd("gemini-nano-banana-2.1", { promptTokenCount: 14 })).toBeNull();
  });
});
