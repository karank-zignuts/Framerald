import { describe, expect, it } from "vitest";
import { generateRequestSchema } from "./schemas";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("generateRequestSchema", () => {
  it("fills defaults for a bare prompt", () => {
    const r = generateRequestSchema.parse({ prompt: "  a red door  " });
    expect(r).toMatchObject({
      prompt: "a red door",
      model: "default",
      aspectRatio: "1:1",
      imageSize: "1K",
      count: 1,
      referenceAssetIds: [],
    });
  });

  it("rejects an empty or whitespace prompt", () => {
    expect(generateRequestSchema.safeParse({ prompt: "   " }).success).toBe(false);
  });

  it("allows 1 to 4 images, no more", () => {
    expect(generateRequestSchema.safeParse({ prompt: "x", count: 4 }).success).toBe(true);
    expect(generateRequestSchema.safeParse({ prompt: "x", count: 5 }).success).toBe(false);
    expect(generateRequestSchema.safeParse({ prompt: "x", count: 0 }).success).toBe(false);
  });

  it("rejects an unknown aspect ratio", () => {
    expect(generateRequestSchema.safeParse({ prompt: "x", aspectRatio: "7:3" }).success).toBe(false);
  });

  it("allows at most 14 reference images, all valid ids", () => {
    const ok = Array.from({ length: 14 }, () => uuid);
    expect(generateRequestSchema.safeParse({ prompt: "x", referenceAssetIds: ok }).success).toBe(true);
    expect(generateRequestSchema.safeParse({ prompt: "x", referenceAssetIds: [...ok, uuid] }).success).toBe(false);
    expect(generateRequestSchema.safeParse({ prompt: "x", referenceAssetIds: ["nope"] }).success).toBe(false);
  });

  it("only allows sizes the chosen model supports", () => {
    expect(generateRequestSchema.safeParse({ prompt: "x", model: "fast", imageSize: "2K" }).success).toBe(false);
    expect(generateRequestSchema.safeParse({ prompt: "x", model: "fast", imageSize: "1K" }).success).toBe(true);
    expect(generateRequestSchema.safeParse({ prompt: "x", model: "pro", imageSize: "4K" }).success).toBe(true);
  });
});
