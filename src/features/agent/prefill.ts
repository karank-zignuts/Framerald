import { ASPECT_RATIOS } from "@/features/generations/schemas";

const MAX_PROMPT = 4000;

export type Prefill = { prompt?: string; aspectRatio?: string };

/** Reads `?prompt=` and `?ratio=` for the Image Studio. Anything invalid is ignored. */
export function parsePrefill(params: URLSearchParams): Prefill | null {
  const prompt = params.get("prompt")?.trim().slice(0, MAX_PROMPT);
  const ratio = params.get("ratio");
  const out: Prefill = {};
  if (prompt) out.prompt = prompt;
  if (ratio && (ASPECT_RATIOS as readonly string[]).includes(ratio)) out.aspectRatio = ratio;
  return Object.keys(out).length ? out : null;
}

/** The link that opens the Image Studio with a shot ready to generate. */
export function imageStudioUrl(shot: { prompt: string; aspectRatio: string }): string {
  const params = new URLSearchParams({ prompt: shot.prompt, ratio: shot.aspectRatio });
  return `/image?${params}`;
}
