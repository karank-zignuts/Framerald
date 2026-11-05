import { describe, expect, it } from "vitest";
import { decideJobAction, friendlyVideoError, VIDEO_TIMEOUT_MS } from "./job";

const min = 60_000;

describe("decideJobAction", () => {
  it("leaves a finished job alone", () => {
    for (const status of ["succeeded", "failed", "canceled"] as const) {
      expect(decideJobAction({ status, ageMs: 5 * min, operation: { done: true, hasVideo: true } })).toEqual({ action: "final" });
    }
  });

  it("waits while Google is still working", () => {
    expect(decideJobAction({ status: "running", ageMs: 2 * min, operation: { done: false } })).toEqual({ action: "wait" });
    expect(decideJobAction({ status: "running", ageMs: 2 * min, operation: null })).toEqual({ action: "wait" });
  });

  it("finalizes when the operation is done and has a video", () => {
    expect(decideJobAction({ status: "running", ageMs: 3 * min, operation: { done: true, hasVideo: true } })).toEqual({ action: "finalize" });
  });

  it("fails with the reason when the operation finished with an error", () => {
    const r = decideJobAction({ status: "running", ageMs: min, operation: { done: true, errorMessage: "Prompt blocked by safety filter" } });
    expect(r.action).toBe("fail");
    expect(r.action === "fail" && r.reason).toMatch(/blocked/i);
  });

  it("fails when it finished without a video", () => {
    const r = decideJobAction({ status: "running", ageMs: min, operation: { done: true, hasVideo: false } });
    expect(r).toEqual({ action: "fail", reason: expect.stringMatching(/no video/i) });
  });

  it("gives up after the timeout, whatever Google says", () => {
    const r = decideJobAction({ status: "running", ageMs: VIDEO_TIMEOUT_MS + 1, operation: { done: false } });
    expect(r).toEqual({ action: "fail", reason: expect.stringMatching(/took too long/i) });
  });

  it("still finalizes a finished clip even if it is past the timeout", () => {
    expect(decideJobAction({ status: "running", ageMs: VIDEO_TIMEOUT_MS + 5 * min, operation: { done: true, hasVideo: true } })).toEqual({ action: "finalize" });
  });
});

describe("friendlyVideoError", () => {
  it("explains safety blocks and quota", () => {
    expect(friendlyVideoError("The prompt violates our safety policy (code 58061214)")).toMatch(/blocked/i);
    expect(friendlyVideoError("Quota exceeded for aiplatform.googleapis.com")).toMatch(/limit|quota/i);
  });
  it("passes a short message through and hides a long raw one", () => {
    expect(friendlyVideoError("Image is too small")).toBe("Image is too small");
    expect(friendlyVideoError("x".repeat(900))).toBe("Google couldn't make this clip. Try again.");
  });
});
