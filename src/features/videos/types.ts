import type { AssetDto } from "@/features/library/types";
import type { VideoModelKey } from "@/lib/ai/models";

/** A video generation as the browser sees it. */
export type VideoJobDto = {
  id: string;
  status: "running" | "succeeded" | "failed";
  error: string | null;
  prompt: string;
  mode: "text_to_video" | "image_to_video";
  modelLabel: string;
  aspectRatio: string;
  durationSeconds: number;
  resolution: string;
  audio: boolean;
  /** Estimated from Google's per-second price. Null when unknown, or when the job failed. */
  costUsd: number | null;
  createdAt: string;
  asset: AssetDto | null;
};

/** Everything the Video Studio form needs to repeat an earlier clip. */
export type VideoReRunSettings = {
  prompt: string;
  model: VideoModelKey;
  aspectRatio: string;
  durationSeconds: number;
  resolution: string;
  audio: boolean;
  firstFrame: AssetDto | null;
  lastFrame: AssetDto | null;
  /** True when frames this clip was made from have been deleted since. */
  missingFrames: boolean;
};
