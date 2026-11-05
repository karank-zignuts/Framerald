import { z } from "zod";
import { MODELS, VIDEO_MODEL_KEYS } from "@/lib/ai/models";

export const VIDEO_RATIOS = ["16:9", "9:16"] as const;
export const VIDEO_DURATIONS = [4, 6, 8] as const;
export const VIDEO_RESOLUTIONS = ["720p", "1080p", "4k"] as const;
export const MAX_VIDEO_PROMPT = 2000;

export const generateVideoSchema = z
  .object({
    prompt: z.string().trim().min(1, "Write a prompt first.").max(MAX_VIDEO_PROMPT, "Keep the prompt under 2,000 characters."),
    model: z.enum(VIDEO_MODEL_KEYS).default("fast"),
    aspectRatio: z.enum(VIDEO_RATIOS).default("16:9"),
    durationSeconds: z.union([z.literal(4), z.literal(6), z.literal(8)]).default(4),
    resolution: z.enum(VIDEO_RESOLUTIONS).default("720p"),
    generateAudio: z.boolean().default(false),
    firstFrameAssetId: z.uuid().optional(),
    lastFrameAssetId: z.uuid().optional(),
    // Set when this request re-runs an earlier generation.
    sourceGenerationId: z.uuid().optional(),
  })
  .superRefine((r, ctx) => {
    const supported = MODELS.video[r.model].videoResolutions as readonly string[];
    if (!supported.includes(r.resolution)) {
      ctx.addIssue({ code: "custom", path: ["resolution"], message: "That model can't make this resolution." });
    }
    if (r.resolution !== "720p" && r.durationSeconds !== 8) {
      ctx.addIssue({ code: "custom", path: ["durationSeconds"], message: "1080p and 4K clips are 8 seconds long." });
    }
    if (r.lastFrameAssetId && !r.firstFrameAssetId) {
      ctx.addIssue({ code: "custom", path: ["lastFrameAssetId"], message: "Add a first frame before a last frame." });
    }
    if (r.lastFrameAssetId && r.lastFrameAssetId === r.firstFrameAssetId) {
      ctx.addIssue({ code: "custom", path: ["lastFrameAssetId"], message: "The first and last frame must be different images." });
    }
  });

export type GenerateVideoRequest = z.infer<typeof generateVideoSchema>;

const LONG_SIDE = { "720p": [1280, 720], "1080p": [1920, 1080], "4k": [3840, 2160] } as const;

/** Pixel size of a clip, from its resolution and ratio. */
export function videoDimensions(resolution: string, aspectRatio: string): { width: number; height: number } {
  const [w, h] = LONG_SIDE[resolution as keyof typeof LONG_SIDE] ?? LONG_SIDE["720p"];
  return aspectRatio === "9:16" ? { width: h, height: w } : { width: w, height: h };
}
