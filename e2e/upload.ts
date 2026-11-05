import { expect, type APIRequestContext } from "@playwright/test";
import { trackAsset } from "./cleanup";

// Uploads the way the browser does: ask for a one-time URL, PUT the file straight to storage,
// then ask the server to check and record it.

export type Signed = { assetId: string; ext: string; path: string; uploadUrl: string };
export type UploadedAsset = { id: string; kind: string; mimeType: string; width: number | null; thumbnailUrl: string; url: string };

export async function sign(request: APIRequestContext, contentType: string, size: number): Promise<Signed> {
  const res = await request.post("/api/uploads/sign", { data: { contentType, size } });
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()) as Signed;
}

export async function putToStorage(signed: Signed, bytes: Buffer, contentType: string): Promise<void> {
  const form = new FormData();
  form.append("cacheControl", "3600");
  form.append("", new Blob([new Uint8Array(bytes)], { type: contentType }), "file");
  const res = await fetch(signed.uploadUrl, { method: "PUT", headers: { "x-upsert": "false" }, body: form });
  expect(res.ok, `storage said ${res.status}`).toBe(true);
}

export async function complete(request: APIRequestContext, signed: Signed) {
  return request.post("/api/uploads/complete", { data: { assetId: signed.assetId, ext: signed.ext, path: signed.path } });
}

/** The whole flow for a good image. The asset is tracked so the teardown deletes it. */
export async function uploadImage(request: APIRequestContext, bytes: Buffer, contentType = "image/png"): Promise<UploadedAsset> {
  const signed = await sign(request, contentType, bytes.length);
  await putToStorage(signed, bytes, contentType);
  const res = await complete(request, signed);
  expect(res.status(), await res.text()).toBe(200);
  const asset = (await res.json()) as UploadedAsset;
  trackAsset(asset.id);
  return asset;
}
