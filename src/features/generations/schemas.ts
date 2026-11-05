import { z } from "zod";
import { IMAGE_MODEL_KEYS, MODELS, type ImageSize } from "@/lib/ai/models";

export const ASPECT_RATIOS = ["1:1", "4:5", "3:4", "2:3", "9:16", "5:4", "4:3", "3:2", "16:9", "21:9"] as const;
export const IMAGE_SIZES = ["1K", "2K", "4K"] as const;
export const MAX_IMAGES = 4;
export const MAX_REFERENCES = 14;

export const generateRequestSchema = z
  .object({
    prompt: z.string().trim().min(1, "Write a prompt first.").max(4000, "Keep the prompt under 4,000 characters."),
    model: z.enum(IMAGE_MODEL_KEYS).default("default"),
    aspectRatio: z.enum(ASPECT_RATIOS).default("1:1"),
    imageSize: z.enum(IMAGE_SIZES).default("1K"),
    count: z.number().int().min(1).max(MAX_IMAGES).default(1),
    referenceAssetIds: z.array(z.uuid()).max(MAX_REFERENCES).default([]),
    // Set when this request re-runs an earlier generation.
    sourceGenerationId: z.uuid().optional(),
  })
  .refine((r) => (MODELS.image[r.model].imageSizes as readonly ImageSize[]).includes(r.imageSize), {
    path: ["imageSize"],
    message: "That model can't make this size.",
  });

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
