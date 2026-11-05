// The decision a status check makes, kept pure so every case can be tested.

/** How long a clip may stay "running" before we stop waiting for it. */
export const VIDEO_TIMEOUT_MS = 30 * 60_000;

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

export type OperationSnapshot = { done: boolean; errorMessage?: string; hasVideo?: boolean };

export type JobAction =
  | { action: "final" } // nothing to do, the job already ended
  | { action: "wait" }
  | { action: "finalize" } // Google has the clip; fetch and save it
  | { action: "fail"; reason: string };

export function decideJobAction(input: { status: JobStatus; ageMs: number; operation: OperationSnapshot | null }): JobAction {
  const { status, ageMs, operation } = input;
  if (status !== "running" && status !== "queued") return { action: "final" };

  if (operation?.done) {
    if (operation.errorMessage) return { action: "fail", reason: friendlyVideoError(operation.errorMessage) };
    if (!operation.hasVideo) {
      return { action: "fail", reason: "Google finished but returned no video. The prompt or image may have been blocked." };
    }
    return { action: "finalize" }; // a finished clip is saved even if it took longer than the timeout
  }
  if (ageMs > VIDEO_TIMEOUT_MS) return { action: "fail", reason: "This clip took too long, so we stopped waiting for it." };
  return { action: "wait" };
}

/** A reason that is safe and useful to show. */
export function friendlyVideoError(raw: string): string {
  if (/safety|blocked|violat|prohibit|policy/i.test(raw)) {
    return "Google blocked this clip for safety reasons. Try rewording the prompt or using a different image.";
  }
  if (/quota|resource.?exhausted|rate.?limit|\b429\b/i.test(raw)) {
    return "Google's video limit was reached. Wait a few minutes and try again.";
  }
  if (raw && raw.length <= 300) return raw;
  return "Google couldn't make this clip. Try again.";
}
