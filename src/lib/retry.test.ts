import { describe, expect, it } from "vitest";
import { isTransientError, withRetry } from "./retry";

const opts = { retries: 2, delayMs: 0, isRetryable: () => true };

describe("withRetry", () => {
  it("returns the first success without retrying", async () => {
    let calls = 0;
    const r = await withRetry(async () => (++calls, "ok"), opts);
    expect([r, calls]).toEqual(["ok", 1]);
  });

  it("retries a failing call and returns the later success", async () => {
    let calls = 0;
    const r = await withRetry(async () => {
      if (++calls < 3) throw new Error("busy");
      return "ok";
    }, opts);
    expect([r, calls]).toEqual(["ok", 3]);
  });

  it("gives up after the retry budget and throws the last error", async () => {
    let calls = 0;
    await expect(
      withRetry(async () => {
        throw new Error(`fail ${++calls}`);
      }, opts),
    ).rejects.toThrow("fail 3");
    expect(calls).toBe(3);
  });

  it("does not retry errors that are not retryable", async () => {
    let calls = 0;
    await expect(
      withRetry(async () => (++calls, Promise.reject(new Error("bad prompt"))), { ...opts, isRetryable: () => false }),
    ).rejects.toThrow("bad prompt");
    expect(calls).toBe(1);
  });
});

describe("isTransientError", () => {
  it("treats 429 and 503 as transient", () => {
    expect(isTransientError({ status: 429 })).toBe(true);
    expect(isTransientError({ status: 503 })).toBe(true);
    expect(isTransientError(new Error('{"error":{"status":"RESOURCE_EXHAUSTED"}}'))).toBe(true);
  });
  it("does not retry client mistakes", () => {
    expect(isTransientError({ status: 400 })).toBe(false);
    expect(isTransientError(new Error("invalid argument"))).toBe(false);
  });
});
