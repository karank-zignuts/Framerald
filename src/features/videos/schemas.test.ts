import { describe, expect, it } from "vitest";
import { generateVideoSchema } from "./schemas";

const uuid = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";

describe("generateVideoSchema", () => {
  it("fills cheap, safe defaults for a bare prompt", () => {
    expect(generateVideoSchema.parse({ prompt: "  a slow dolly in on a red door " })).toMatchObject({
      prompt: "a slow dolly in on a red door",
      model: "fast",
      aspectRatio: "16:9",
      durationSeconds: 4,
      resolution: "720p",
      generateAudio: false,
    });
  });

  it("refuses an empty prompt and one that is too long", () => {
    expect(generateVideoSchema.safeParse({ prompt: "  " }).success).toBe(false);
    expect(generateVideoSchema.safeParse({ prompt: "x".repeat(2001) }).success).toBe(false);
  });

  it("only allows 16:9 and 9:16", () => {
    expect(generateVideoSchema.safeParse({ prompt: "x", aspectRatio: "9:16" }).success).toBe(true);
    expect(generateVideoSchema.safeParse({ prompt: "x", aspectRatio: "1:1" }).success).toBe(false);
  });

  it("only allows 4, 6 or 8 seconds", () => {
    for (const d of [4, 6, 8]) expect(generateVideoSchema.safeParse({ prompt: "x", durationSeconds: d }).success).toBe(true);
    expect(generateVideoSchema.safeParse({ prompt: "x", durationSeconds: 5 }).success).toBe(false);
  });

  it("allows 1080p and 4K only at 8 seconds", () => {
    expect(generateVideoSchema.safeParse({ prompt: "x", resolution: "1080p", durationSeconds: 4 }).success).toBe(false);
    expect(generateVideoSchema.safeParse({ prompt: "x", resolution: "1080p", durationSeconds: 8 }).success).toBe(true);
    expect(generateVideoSchema.safeParse({ prompt: "x", model: "default", resolution: "4k", durationSeconds: 8 }).success).toBe(true);
  });

  it("refuses a resolution the chosen model can't make", () => {
    const r = generateVideoSchema.safeParse({ prompt: "x", model: "lite", resolution: "4k", durationSeconds: 8 });
    expect(r.success).toBe(false);
  });

  it("needs a first frame before a last frame, and they must differ", () => {
    expect(generateVideoSchema.safeParse({ prompt: "x", lastFrameAssetId: uuid }).success).toBe(false);
    expect(generateVideoSchema.safeParse({ prompt: "x", firstFrameAssetId: uuid, lastFrameAssetId: other }).success).toBe(true);
    expect(generateVideoSchema.safeParse({ prompt: "x", firstFrameAssetId: uuid, lastFrameAssetId: uuid }).success).toBe(false);
    expect(generateVideoSchema.safeParse({ prompt: "x", firstFrameAssetId: "nope" }).success).toBe(false);
  });
});
