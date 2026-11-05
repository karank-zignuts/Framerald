import { describe, expect, it } from "vitest";
import { imageStudioUrl, parsePrefill, parseVideoPrefill, videoRatioFor, videoStudioUrl } from "./prefill";

describe("image studio prefill", () => {
  it("round-trips a prompt full of awkward characters and a ratio", () => {
    const prompt = 'Wide shot: "rain" & neon #1 / 100% — café\nnew line';
    const url = imageStudioUrl({ prompt, aspectRatio: "16:9" });
    expect(url.startsWith("/image?")).toBe(true);
    const params = new URL(url, "http://x").searchParams;
    expect(parsePrefill(params)).toEqual({ prompt, aspectRatio: "16:9" });
  });

  it("returns nothing when there's nothing valid", () => {
    expect(parsePrefill(new URLSearchParams(""))).toBeNull();
    expect(parsePrefill(new URLSearchParams("prompt=%20%20"))).toBeNull();
  });

  it("ignores a ratio that isn't one of ours but keeps the prompt", () => {
    expect(parsePrefill(new URLSearchParams("prompt=a+door&ratio=7:3"))).toEqual({ prompt: "a door" });
  });

  it("keeps a valid ratio even without a prompt", () => {
    expect(parsePrefill(new URLSearchParams("ratio=9:16"))).toEqual({ aspectRatio: "9:16" });
  });

  it("cuts an over-long prompt to the 4,000 character limit", () => {
    const r = parsePrefill(new URLSearchParams({ prompt: "x".repeat(5000) }));
    expect(r?.prompt).toHaveLength(4000);
  });
});

describe("video studio prefill", () => {
  it("maps any shot ratio to a ratio Veo can make", () => {
    expect(videoRatioFor("16:9")).toBe("16:9");
    expect(videoRatioFor("9:16")).toBe("9:16");
    expect(videoRatioFor("21:9")).toBe("16:9");
    expect(videoRatioFor("1:1")).toBe("16:9");
    expect(videoRatioFor("4:5")).toBe("9:16");
    expect(videoRatioFor("3:4")).toBe("9:16");
  });

  it("builds a /video link and reads it back", () => {
    const url = videoStudioUrl({ prompt: "A door & a dolly #1", aspectRatio: "4:5" });
    expect(url.startsWith("/video?")).toBe(true);
    expect(parseVideoPrefill(new URL(url, "http://x").searchParams)).toEqual({ prompt: "A door & a dolly #1", aspectRatio: "9:16" });
  });

  it("ignores a ratio Veo can't make", () => {
    expect(parseVideoPrefill(new URLSearchParams("prompt=a+door&ratio=1:1"))).toEqual({ prompt: "a door" });
  });
});
