export type RetryOptions = {
  retries: number;
  delayMs: number; // doubles on every retry
  isRetryable: (error: unknown) => boolean;
};

export async function withRetry<T>(fn: () => Promise<T>, { retries, delayMs, isRetryable }: RetryOptions): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries || !isRetryable(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs * 2 ** attempt));
    }
  }
}

/** Google's "try again" errors: rate limit (429) and temporary outage (503). */
export function isTransientError(error: unknown): boolean {
  const status = (error as { status?: unknown })?.status;
  if (status === 429 || status === 503) return true;
  const message = error instanceof Error ? error.message : "";
  return /RESOURCE_EXHAUSTED|UNAVAILABLE/.test(message);
}
