import { describe, expect, it } from "vitest";
import { createLoginLimiter } from "./rate-limit";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

function limiter() {
  return createLoginLimiter({ maxFailures: 5, baseLockMs: 30 * SECOND, maxLockMs: 10 * MINUTE, windowMs: 15 * MINUTE });
}

describe("login limiter", () => {
  it("allows the first few wrong guesses", () => {
    const l = limiter();
    for (let i = 0; i < 4; i++) {
      expect(l.check("ip", 0).allowed).toBe(true);
      l.fail("ip", 0);
    }
    expect(l.check("ip", 0).allowed).toBe(true);
  });

  it("locks after the limit and says how long to wait", () => {
    const l = limiter();
    for (let i = 0; i < 5; i++) l.fail("ip", 0);
    const r = l.check("ip", 10 * SECOND);
    expect(r).toEqual({ allowed: false, retryAfterMs: 20 * SECOND });
  });

  it("lets the person in again once the lock ends, and doubles it on the next failure", () => {
    const l = limiter();
    for (let i = 0; i < 5; i++) l.fail("ip", 0);
    expect(l.check("ip", 31 * SECOND).allowed).toBe(true);
    l.fail("ip", 31 * SECOND);
    expect(l.check("ip", 32 * SECOND)).toEqual({ allowed: false, retryAfterMs: 59 * SECOND });
  });

  it("never locks for longer than the cap", () => {
    // A long window, so the failures aren't forgotten while the locks build up.
    const l = createLoginLimiter({ maxFailures: 5, baseLockMs: 30 * SECOND, maxLockMs: 10 * MINUTE, windowMs: 1000 * MINUTE });
    let t = 0;
    for (let i = 0; i < 20; i++) {
      l.fail("ip", t);
      const r = l.check("ip", t);
      if (!r.allowed) t += r.retryAfterMs + 1;
    }
    l.fail("ip", t);
    const r = l.check("ip", t);
    expect(!r.allowed && r.retryAfterMs).toBeLessThanOrEqual(10 * MINUTE);
  });

  it("clears everything after a correct password", () => {
    const l = limiter();
    for (let i = 0; i < 4; i++) l.fail("ip", 0);
    l.succeed("ip");
    for (let i = 0; i < 4; i++) l.fail("ip", 1);
    expect(l.check("ip", 1).allowed).toBe(true);
  });

  it("forgets old failures after the window", () => {
    const l = limiter();
    for (let i = 0; i < 4; i++) l.fail("ip", 0);
    l.fail("ip", 16 * MINUTE);
    expect(l.check("ip", 16 * MINUTE).allowed).toBe(true);
  });

  it("keeps different people apart", () => {
    const l = limiter();
    for (let i = 0; i < 5; i++) l.fail("a", 0);
    expect(l.check("a", 0).allowed).toBe(false);
    expect(l.check("b", 0).allowed).toBe(true);
  });
});
