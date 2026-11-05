import { findPricing } from "./models";

// The part of Vertex's `usageMetadata` we use. Kept structural so tests and the
// mock don't need the SDK types.
export type ImageUsage = {
  promptTokenCount?: number;
  thoughtsTokenCount?: number;
  candidatesTokensDetails?: { modality?: string; tokenCount?: number }[];
};

const PER_M = 1_000_000;

/**
 * Estimated cost in USD of one image call, rounded to 4 decimals (the column's
 * precision). Returns null when we can't know: no usage in the response, no
 * output token breakdown, or a model without a known price.
 */
export function imageCostUsd(modelId: string, usage: ImageUsage | undefined): number | null {
  const pricing = findPricing(modelId);
  if (!pricing || !usage?.candidatesTokensDetails) return null;

  const imageOut = sumTokens(usage, "IMAGE");
  const textOut = sumTokens(usage, "TEXT") + (usage.thoughtsTokenCount ?? 0);
  const input = usage.promptTokenCount ?? 0;

  const usd =
    (input * pricing.inputPerM + textOut * pricing.textOutPerM + imageOut * pricing.imageOutPerM) / PER_M;
  return Math.round(usd * 10_000) / 10_000;
}

function sumTokens(usage: ImageUsage, modality: string): number {
  return (usage.candidatesTokensDetails ?? [])
    .filter((d) => d.modality === modality)
    .reduce((n, d) => n + (d.tokenCount ?? 0), 0);
}
