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

  if (imageOut > 0 && pricing.imageOutPerM === undefined) return null; // image tokens but no image price
  const usd =
    (input * pricing.inputPerM + textOut * pricing.textOutPerM + imageOut * (pricing.imageOutPerM ?? 0)) / PER_M;
  return Math.round(usd * 10_000) / 10_000;
}

export type TextUsage = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
};

export type TextCost = { inputUsd: number; outputUsd: number; totalUsd: number };

const round6 = (n: number) => Math.round(n * 1_000_000) / 1_000_000;

/**
 * Estimated cost of one text call in USD, to 6 decimals (agent calls cost
 * fractions of a cent). Thinking tokens bill as output. Null when the price or
 * the usage is unknown.
 */
export function textCostUsd(modelId: string, usage: TextUsage | undefined, at: Date = new Date()): TextCost | null {
  const pricing = findPricing(modelId, at);
  if (!pricing || !usage) return null;
  const inTokens = usage.promptTokenCount ?? 0;
  const outTokens = (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0);
  const inputUsd = (inTokens * pricing.inputPerM) / PER_M;
  const outputUsd = (outTokens * pricing.textOutPerM) / PER_M;
  return { inputUsd: round6(inputUsd), outputUsd: round6(outputUsd), totalUsd: round6(inputUsd + outputUsd) };
}

function sumTokens(usage: ImageUsage, modality: string): number {
  return (usage.candidatesTokensDetails ?? [])
    .filter((d) => d.modality === modality)
    .reduce((n, d) => n + (d.tokenCount ?? 0), 0);
}
