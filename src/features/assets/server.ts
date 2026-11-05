import "server-only";
import { randomUUID } from "node:crypto";
import { db, OWNER_ID } from "@/lib/supabase/server";
import { createUploadUrl, downloadMedia, mediaPath, removeMedia, storedSize, uploadMedia } from "@/lib/storage";
import { inspectImage, makeThumbnail } from "@/lib/image-processing";
import { HttpError } from "@/lib/http";
import { ASSET_SELECT, toAssetDtos, type AssetRow } from "@/features/library/server";
import type { AssetDto } from "@/features/library/types";
import { extForContentType, MAX_UPLOAD_BYTES, type signUploadSchema, type completeUploadSchema } from "./schemas";
import type { z } from "zod";

// Uploads go from the browser straight to Supabase Storage, because Vercel functions reject
// request bodies over 4.5 MB. Step 1 (sign) hands out a one-time URL; step 2 (complete)
// checks what actually arrived and only then creates the asset.

export type SignedUpload = { assetId: string; ext: string; path: string; uploadUrl: string };

export async function signUpload(input: z.infer<typeof signUploadSchema>): Promise<SignedUpload> {
  const assetId = randomUUID();
  const ext = extForContentType(input.contentType);
  const path = mediaPath(OWNER_ID, assetId, ext);
  return { assetId, ext, path, uploadUrl: await createUploadUrl(path) };
}

const thumbPathFor = (path: string) => path.replace(/\.(png|jpg|webp)$/, ".thumb.webp");

async function existingUpload(assetId: string): Promise<AssetDto | null> {
  const { data, error } = await db().from("assets").select(ASSET_SELECT).eq("owner_id", OWNER_ID).eq("id", assetId).maybeSingle();
  if (error) throw new Error(`Couldn't check the upload: ${error.message}`);
  if (!data) return null;
  return (await toAssetDtos([data as unknown as AssetRow]))[0] ?? null;
}

/** Checks the uploaded file's real bytes, makes the thumbnail and records the asset. Removes everything if any step fails. */
export async function completeUpload(input: z.infer<typeof completeUploadSchema>): Promise<AssetDto> {
  const { assetId, ext, path } = input;
  const shape = new RegExp(`^${OWNER_ID}/\\d{4}/\\d{2}/${assetId}\\.${ext}$`);
  if (!shape.test(path)) throw new HttpError(400, "That upload isn't valid.");

  const already = await existingUpload(assetId); // calling complete twice is harmless
  if (already) return already;

  const thumbPath = thumbPathFor(path);
  const cleanup = () => removeMedia([path, thumbPath]);

  const stored = await storedSize(path);
  if (stored !== null && stored > MAX_UPLOAD_BYTES) {
    await cleanup(); // too big to even read into memory
    throw new HttpError(400, "That image is over 10 MB. Use a smaller one.");
  }

  let bytes: Buffer;
  try {
    bytes = await downloadMedia(path);
  } catch {
    throw new HttpError(400, "That upload didn't arrive. Try again.");
  }
  if (bytes.length === 0 || bytes.length > MAX_UPLOAD_BYTES) {
    await cleanup();
    throw new HttpError(400, bytes.length === 0 ? "That file is empty." : "That image is over 10 MB. Use a smaller one.");
  }

  let info;
  try {
    info = await inspectImage(bytes); // the real bytes, not the name or the type the browser claimed
  } catch (error) {
    await cleanup();
    throw new HttpError(400, error instanceof Error ? error.message : "That file isn't a usable image.");
  }
  if (info.ext !== ext) {
    await cleanup();
    throw new HttpError(400, "The file doesn't match the image type it claims to be.");
  }

  try {
    await uploadMedia(thumbPath, await makeThumbnail(bytes), "image/webp");
  } catch (error) {
    await cleanup();
    throw error;
  }

  const { data, error } = await db()
    .from("assets")
    .insert({
      id: assetId,
      owner_id: OWNER_ID,
      kind: "image",
      source: "upload",
      storage_path: path,
      thumbnail_path: thumbPath,
      mime_type: info.mimeType,
      bytes: bytes.length,
      width: info.width,
      height: info.height,
    })
    .select(ASSET_SELECT)
    .single();
  if (error) {
    if (error.code === "23505") {
      // A parallel call recorded this upload first. The files are theirs now, so keep them.
      const winner = await existingUpload(assetId);
      if (winner) return winner;
    }
    await cleanup(); // no row, so don't leave the files behind
    throw new Error(`Couldn't record the upload: ${error.message}`);
  }
  return (await toAssetDtos([data as unknown as AssetRow]))[0];
}
