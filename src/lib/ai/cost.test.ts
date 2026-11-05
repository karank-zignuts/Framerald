import { describe, expect, it } from "vitest";
import { estimateImageCostUsd, imageCostUsd } from "./cost";

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

describe("estimateImageCostUsd", () => {
  it("matches the real 1K Nano Banana 2.1 call it is based on", () => {
    expect(estimateImageCostUsd("gemini-nano-banana-2.1", "1K", 1, 0)).toBe(0.039);
  });
  it("multiplies by the number of images", () => {
    expect(estimateImageCostUsd("gemini-nano-banana-2.1", "1K", 4, 0)).toBe(0.1561);
  });
  it("costs more at 4K, where an image takes more tokens", () => {
    const at1k = estimateImageCostUsd("gemini-nano-banana-2.1", "1K", 1, 0)!;
    expect(estimateImageCostUsd("gemini-nano-banana-2.1", "4K", 1, 0)!).toBeGreaterThan(at1k);
  });
  it("adds the input cost of each reference image", () => {
    const none = estimateImageCostUsd("gemini-3-pro-image", "1K", 1, 0)!;
    expect(estimateImageCostUsd("gemini-3-pro-image", "1K", 1, 3)!).toBeGreaterThan(none);
  });
  it("is null for a model with no known price", () => {
    expect(estimateImageCostUsd("no-such-model", "1K", 1, 0)).toBeNull();
  });
});
