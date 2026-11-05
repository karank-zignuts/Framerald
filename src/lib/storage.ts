import "server-only";
import { db } from "@/lib/supabase/server";

export const MEDIA_BUCKET = "media";
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** `<owner_id>/<yyyy>/<mm>/<asset_id>[.thumb].<ext>` */
export function mediaPath(ownerId: string, assetId: string, ext: string, variant: "original" | "thumb" = "original") {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${ownerId}/${yyyy}/${mm}/${assetId}${variant === "thumb" ? ".thumb" : ""}.${ext}`;
}

/** A one-time URL the browser can PUT a file to directly, so it never passes through a size-limited function. */
export async function createUploadUrl(path: string): Promise<string> {
  const { data, error } = await db().storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`Couldn't prepare the upload: ${error?.message ?? "no URL"}`);
  return data.signedUrl;
}

export async function uploadMedia(path: string, bytes: Buffer, contentType: string): Promise<void> {
  const { error } = await db().storage.from(MEDIA_BUCKET).upload(path, bytes, { contentType, upsert: false });
  if (error) throw new Error(`Couldn't save the file: ${error.message}`);
}

export async function downloadMedia(path: string): Promise<Buffer> {
  const { data, error } = await db().storage.from(MEDIA_BUCKET).download(path);
  if (error || !data) throw new Error(`Couldn't read a stored file: ${error?.message ?? "missing"}`);
  return Buffer.from(await data.arrayBuffer());
}

/** The stored size in bytes, read from metadata so a huge file is never loaded. Null when it can't be found. */
export async function storedSize(path: string): Promise<number | null> {
  const slash = path.lastIndexOf("/");
  const { data, error } = await db()
    .storage.from(MEDIA_BUCKET)
    .list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 5 });
  if (error) return null;
  const size = data?.find((f) => f.name === path.slice(slash + 1))?.metadata?.size;
  return typeof size === "number" ? size : null;
}

/** One request for many links. Paths that can't be signed are left out. */
export async function signedUrlMap(paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths)];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data, error } = await db().storage.from(MEDIA_BUCKET).createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  if (error) throw new Error(`Couldn't link to stored files: ${error.message}`);
  for (const item of data ?? []) if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  return map;
}

/** Best effort: used to clean up after a failed save, so it never throws. */
export async function removeMedia(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await db().storage.from(MEDIA_BUCKET).remove(paths).catch(() => {});
}
