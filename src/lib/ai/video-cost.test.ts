import { describe, expect, it } from "vitest";
import { videoCostUsd } from "./cost";

// Google's Vertex price list, per second of video (no audio / with audio).
describe("videoCostUsd", () => {
  it("prices the cheapest clip: Lite, 4 s, 720p, no audio = 4 x $0.03", () => {
    expect(videoCostUsd("veo-3.1-lite-generate-001", { seconds: 4, resolution: "720p", audio: false })).toBe(0.12);
  });
  it("prices Fast with audio at 1080p: 8 s x $0.12", () => {
    expect(videoCostUsd("veo-3.1-fast-generate-001", { seconds: 8, resolution: "1080p", audio: true })).toBe(0.96);
  });
  it("prices standard 4K without audio: 8 s x $0.40", () => {
    expect(videoCostUsd("veo-3.1-generate-001", { seconds: 8, resolution: "4k", audio: false })).toBe(3.2);
  });
  it("multiplies by the number of videos", () => {
    expect(videoCostUsd("veo-3.1-lite-generate-001", { seconds: 4, resolution: "720p", audio: true, videos: 2 })).toBe(0.4);
  });
  it("is unknown for a model with no video price", () => {
    expect(videoCostUsd("gemini-omni-1.1-flash-preview", { seconds: 4, resolution: "720p", audio: false })).toBeNull();
    expect(videoCostUsd("nope", { seconds: 4, resolution: "720p", audio: false })).toBeNull();
  });
  it("is unknown for a resolution the model can't make", () => {
    expect(videoCostUsd("veo-3.1-lite-generate-001", { seconds: 8, resolution: "4k", audio: false })).toBeNull();
  });
});
