import { describe, expect, it } from "vitest";
import { imageStudioUrl, parsePrefill } from "./prefill";

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
