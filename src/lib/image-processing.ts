import "server-only";
import sharp, { type Metadata } from "sharp";

export const THUMBNAIL_WIDTH = 480;

const FORMATS = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" } as const;
type Format = keyof typeof FORMATS;

export type ImageInfo = { width: number; height: number; mimeType: string; ext: string };

/** Reads size and type from the bytes themselves, never from a filename or a header the client sent. */
export async function inspectImage(bytes: Buffer): Promise<ImageInfo> {
  let meta: Metadata;
  try {
    meta = await sharp(bytes).metadata();
  } catch {
    throw new Error("That file isn't an image. Use a png, jpeg or webp.");
  }
  const format = meta.format as string | undefined;
  if (!format || !(format in FORMATS) || !meta.width || !meta.height) {
    throw new Error("That image type isn't supported. Use a png, jpeg or webp.");
  }
  return {
    width: meta.width,
    height: meta.height,
    mimeType: FORMATS[format as Format],
    ext: format === "jpeg" ? "jpg" : format,
  };
}

/** 480px-wide webp for grids. Smaller images are left at their own size. */
export function makeThumbnail(bytes: Buffer): Promise<Buffer> {
  return sharp(bytes)
    .rotate() // honour EXIF orientation before dropping metadata
    .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}
