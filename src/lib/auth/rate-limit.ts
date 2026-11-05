export type LoginLimiterOptions = {
  maxFailures: number; // wrong guesses allowed before a lock
  baseLockMs: number; // the first lock; each later one doubles
  maxLockMs: number;
  windowMs: number; // failures older than this are forgotten
};

type Entry = { failures: number; firstAt: number; lockedUntil: number; lockCount: number };

/**
 * Slows down password guessing. State is in memory, so on a serverless host each
 * instance counts for itself. That still blocks a guessing loop from one place,
 * but it is not a hard global limit.
 */
export function createLoginLimiter(options: LoginLimiterOptions) {
  const entries = new Map<string, Entry>();

  function prune(now: number) {
    if (entries.size <= 1000) return;
    for (const [key, e] of entries) if (e.lockedUntil < now && now - e.firstAt > options.windowMs) entries.delete(key);
  }

  return {
    check(key: string, now: number): { allowed: true } | { allowed: false; retryAfterMs: number } {
      const e = entries.get(key);
      if (e && e.lockedUntil > now) return { allowed: false, retryAfterMs: e.lockedUntil - now };
      return { allowed: true };
    },
    fail(key: string, now: number): void {
      let e = entries.get(key);
      if (!e || now - e.firstAt > options.windowMs) e = { failures: 0, firstAt: now, lockedUntil: 0, lockCount: 0 };
      e.failures += 1;
      if (e.failures >= options.maxFailures) {
        e.lockedUntil = now + Math.min(options.baseLockMs * 2 ** e.lockCount, options.maxLockMs);
        e.lockCount += 1;
      }
      entries.set(key, e);
      prune(now);
    },
    succeed(key: string): void {
      entries.delete(key);
    },
  };
}
