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

// ─── Video Studio ────────────────────────────────────────────────────────────

const VIDEO_RATIOS = ["16:9", "9:16"] as const;

/** Veo only makes 16:9 and 9:16. Portrait shots go to 9:16; wide and square ones to 16:9. */
export function videoRatioFor(ratio: string): (typeof VIDEO_RATIOS)[number] {
  const [w, h] = ratio.split(":").map(Number);
  return w < h ? "9:16" : "16:9";
}

export function videoStudioUrl(shot: { prompt: string; aspectRatio: string }): string {
  const params = new URLSearchParams({ prompt: shot.prompt, ratio: videoRatioFor(shot.aspectRatio) });
  return `/video?${params}`;
}

/** Reads `?prompt=` and `?ratio=` for the Video Studio. A ratio Veo can't make is ignored. */
export function parseVideoPrefill(params: URLSearchParams): Prefill | null {
  const prompt = params.get("prompt")?.trim().slice(0, MAX_PROMPT);
  const ratio = params.get("ratio");
  const out: Prefill = {};
  if (prompt) out.prompt = prompt;
  if (ratio && (VIDEO_RATIOS as readonly string[]).includes(ratio)) out.aspectRatio = ratio;
  return Object.keys(out).length ? out : null;
}
