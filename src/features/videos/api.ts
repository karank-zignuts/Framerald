import { readJson } from "@/features/generations/api";
import type { GenerateVideoRequest } from "./schemas";
import type { VideoJobDto, VideoReRunSettings } from "./types";

export type StartVideoInput = Omit<GenerateVideoRequest, "firstFrameAssetId" | "lastFrameAssetId" | "sourceGenerationId"> & {
  firstFrameAssetId?: string;
  lastFrameAssetId?: string;
  sourceGenerationId?: string;
};

export const fetchVideoJobs = (projectId: string) => fetch(`/api/videos?limit=30&project=${projectId}`).then((r) => readJson<VideoJobDto[]>(r));

/** Also asks Google how the clip is doing, and saves it when it's ready. */
export const fetchVideoJob = (id: string) => fetch(`/api/videos/${id}`).then((r) => readJson<VideoJobDto>(r));

export const startVideo = (input: StartVideoInput) =>
  fetch("/api/videos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }).then((r) =>
    readJson<VideoJobDto>(r),
  );

export const fetchVideoReRunSettings = (generationId: string) =>
  fetch(`/api/videos/${generationId}/settings`).then((r) => readJson<VideoReRunSettings>(r));
