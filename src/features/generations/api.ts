import type { GenerateRequest } from "./schemas";
import type { GenerationResult } from "./types";
import type { AssetDto, ReRunSettings } from "@/features/library/types";

// Browser-side calls to our own routes. Components never call these directly;
// they go through queries.ts or an event handler.

export async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Something went wrong. Try again.");
  }
  return (await res.json()) as T;
}

export type GenerateInput = Omit<GenerateRequest, "referenceAssetIds" | "sourceGenerationId"> & {
  referenceAssetIds?: string[];
  sourceGenerationId?: string;
};

export function generate(input: GenerateInput): Promise<GenerationResult> {
  return fetch("/api/generations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => readJson<GenerationResult>(r));
}

export function uploadReference(file: File): Promise<AssetDto> {
  const form = new FormData();
  form.set("file", file);
  return fetch("/api/uploads", { method: "POST", body: form }).then((r) => readJson<AssetDto>(r));
}

export function fetchReRunSettings(generationId: string): Promise<ReRunSettings> {
  return fetch(`/api/generations/${generationId}`).then((r) => readJson<ReRunSettings>(r));
}

export function fetchAsset(assetId: string): Promise<AssetDto> {
  return fetch(`/api/assets/${assetId}`).then((r) => readJson<AssetDto>(r));
}
