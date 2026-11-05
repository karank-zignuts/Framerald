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

type SignedUpload = { assetId: string; ext: string; path: string; uploadUrl: string };

/** Uploads straight to storage (Vercel functions reject bodies over 4.5 MB), then asks the server to check and record it. */
export async function uploadReference(file: File): Promise<AssetDto> {
  const json = { "content-type": "application/json" };
  const signed = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: json,
    body: JSON.stringify({ contentType: file.type, size: file.size }),
  }).then((r) => readJson<SignedUpload>(r));

  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", file);
  const put = await fetch(signed.uploadUrl, { method: "PUT", headers: { "x-upsert": "false" }, body });
  if (!put.ok) throw new Error("The upload didn't go through. Try again.");

  return fetch("/api/uploads/complete", {
    method: "POST",
    headers: json,
    body: JSON.stringify({ assetId: signed.assetId, ext: signed.ext, path: signed.path }),
  }).then((r) => readJson<AssetDto>(r));
}

export function fetchReRunSettings(generationId: string): Promise<ReRunSettings> {
  return fetch(`/api/generations/${generationId}`).then((r) => readJson<ReRunSettings>(r));
}

export function fetchAsset(assetId: string): Promise<AssetDto> {
  return fetch(`/api/assets/${assetId}`).then((r) => readJson<AssetDto>(r));
}
