import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { inspectImage, makeThumbnail } from "./image-processing";

async function png(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: "#10b981" } }).png().toBuffer();
}

describe("inspectImage", () => {
  it("reads size and mime type of a real image", async () => {
    expect(await inspectImage(await png(120, 80))).toEqual({ width: 120, height: 80, mimeType: "image/png", ext: "png" });
  });

  it("rejects bytes that are not an image", async () => {
    await expect(inspectImage(Buffer.from("hello"))).rejects.toThrow(/png, jpeg or webp/i);
  });

  it("rejects image formats we don't accept", async () => {
    const gif = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#fff" } }).gif().toBuffer();
    await expect(inspectImage(gif)).rejects.toThrow(/png, jpeg or webp/i);
  });
});

describe("makeThumbnail", () => {
  it("shrinks a wide image to 480px wide webp and keeps the ratio", async () => {
    const t = await makeThumbnail(await png(1920, 1080));
    const meta = await sharp(t).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["webp", 480, 270]);
  });

  it("never enlarges a small image", async () => {
    const meta = await sharp(await makeThumbnail(await png(200, 100))).metadata();
    expect([meta.width, meta.height]).toEqual([200, 100]);
  });
});
