import { z } from "zod";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
const EXTENSIONS = ["png", "jpg", "webp"] as const;

export const signUploadSchema = z.object({
  contentType: z.enum(CONTENT_TYPES, "Use a png, jpeg or webp image."),
  size: z.number().int().min(1, "That file is empty.").max(MAX_UPLOAD_BYTES, "That image is over 10 MB. Use a smaller one."),
});

export const completeUploadSchema = z.object({
  assetId: z.uuid(),
  ext: z.enum(EXTENSIONS),
});

export function extForContentType(contentType: (typeof CONTENT_TYPES)[number]): (typeof EXTENSIONS)[number] {
  return contentType === "image/jpeg" ? "jpg" : contentType === "image/webp" ? "webp" : "png";
}
