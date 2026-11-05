import "server-only";
import { randomUUID } from "node:crypto";
import { db, OWNER_ID } from "@/lib/supabase/server";
import { mediaPath, removeMedia, uploadMedia } from "@/lib/storage";
import { inspectImage, makeThumbnail } from "@/lib/image-processing";
import { HttpError } from "@/lib/http";
import { ASSET_SELECT, toAssetDtos, type AssetRow } from "@/features/library/server";
import type { AssetDto } from "@/features/library/types";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Stores a reference image the user picked from their computer. */
export async function saveUpload(file: File): Promise<AssetDto> {
  if (file.size === 0) throw new HttpError(400, "That file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(400, "That image is over 10 MB. Use a smaller one.");

  const bytes = Buffer.from(await file.arrayBuffer());
  let info;
  try {
    info = await inspectImage(bytes); // checks the real bytes, not the filename or the header the browser sent
  } catch (error) {
    throw new HttpError(400, error instanceof Error ? error.message : "That file isn't a usable image.");
  }

  const id = randomUUID();
  const storagePath = mediaPath(OWNER_ID, id, info.ext);
  const thumbPath = mediaPath(OWNER_ID, id, "webp", "thumb");
  try {
    await Promise.all([
      uploadMedia(storagePath, bytes, info.mimeType),
      makeThumbnail(bytes).then((t) => uploadMedia(thumbPath, t, "image/webp")),
    ]);
  } catch (error) {
    await removeMedia([storagePath, thumbPath]); // one file may have landed; don't leave it behind
    throw error;
  }

  const { data, error } = await db()
    .from("assets")
    .insert({
      id,
      owner_id: OWNER_ID,
      kind: "image",
      source: "upload",
      storage_path: storagePath,
      thumbnail_path: thumbPath,
      mime_type: info.mimeType,
      bytes: bytes.length,
      width: info.width,
      height: info.height,
    })
    .select(ASSET_SELECT)
    .single();
  if (error) {
    await removeMedia([storagePath, thumbPath]); // no row, so don't leave the files behind
    throw new Error(`Couldn't record the upload: ${error.message}`);
  }
  const [dto] = await toAssetDtos([data as unknown as AssetRow]);
  return dto;
}
