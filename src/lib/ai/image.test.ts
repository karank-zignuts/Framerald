import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateImage, extractImage, ImageGenerationError } from "./image";

afterEach(() => vi.unstubAllEnvs());

const b64 = Buffer.from("fake-png-bytes").toString("base64");

describe("extractImage", () => {
  it("returns the image bytes and mime type", () => {
    const r = extractImage({ candidates: [{ content: { parts: [{ inlineData: { data: b64, mimeType: "image/png" } }] } }] });
    expect(r.mimeType).toBe("image/png");
    expect(r.bytes.toString()).toBe("fake-png-bytes");
  });

  it("explains a blocked prompt in plain words", () => {
    expect(() => extractImage({ promptFeedback: { blockReason: "PROHIBITED_CONTENT" } })).toThrow(/blocked this prompt.*reword/i);
  });

  it("explains a safety stop", () => {
    expect(() => extractImage({ candidates: [{ finishReason: "IMAGE_SAFETY", content: { parts: [] } }] })).toThrow(/safety/i);
  });

  it("reports a text-only reply", () => {
    expect(() => extractImage({ candidates: [{ content: { parts: [{ text: "I can't draw that." }] } }] })).toThrow(
      /text instead of an image.*I can't draw that/i,
    );
  });

  it("has a clear message for an empty reply", () => {
    expect(() => extractImage({})).toThrow(ImageGenerationError);
    expect(() => extractImage({})).toThrow(/no image/i);
  });
});

describe("generateImage with the e2e mock", () => {
  const req = { modelKey: "default" as const, prompt: "a red door", aspectRatio: "16:9", imageSize: "1K" as const, references: [] };

  it("makes a real png with the requested aspect ratio, without calling Google", async () => {
    vi.stubEnv("E2E_MOCK_AI", "1");
    const r = await generateImage(req);
    const meta = await sharp(r.bytes).metadata();
    expect(meta.format).toBe("png");
    expect(Math.round((meta.width! / meta.height!) * 100)).toBe(Math.round((16 / 9) * 100));
    expect(r.modelId).toBe("gemini-nano-banana-2.1");
    expect(r.usage?.candidatesTokensDetails?.[0]).toEqual({ modality: "IMAGE", tokenCount: 1120 });
  });

  it("makes different pictures for different prompts", async () => {
    vi.stubEnv("E2E_MOCK_AI", "1");
    const a = await generateImage(req);
    const b = await generateImage({ ...req, prompt: "a blue window" });
    expect(a.bytes.equals(b.bytes)).toBe(false);
  });

  it("fails on demand so the error path can be tested", async () => {
    vi.stubEnv("E2E_MOCK_AI", "1");
    await expect(generateImage({ ...req, prompt: "[fail] boom" })).rejects.toThrow(ImageGenerationError);
  });
});
