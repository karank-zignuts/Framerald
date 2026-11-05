import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { GenerateVideosOperation } from "@google/genai";
import { MODELS, type VideoModelKey } from "./models";
import { vertex } from "./vertex";
import { isTransientError, withRetry } from "@/lib/retry";
import { friendlyVideoError } from "@/features/videos/job";

export type FrameInput = { bytes: Buffer; mimeType: string };

export type VideoStartInput = {
  modelKey: VideoModelKey;
  prompt: string;
  aspectRatio: string;
  durationSeconds: number;
  resolution: string;
  generateAudio: boolean;
  firstFrame?: FrameInput;
  lastFrame?: FrameInput;
};

export type VideoPoll = {
  done: boolean;
  errorMessage?: string;
  /** Present when the clip is ready and Google returned the bytes. */
  video?: { bytes?: Buffer; uri?: string; mimeType: string };
};

export class VideoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VideoError";
  }
}

const mocking = () => process.env.E2E_MOCK_AI === "1" && process.env.NODE_ENV !== "production";
const REQUEST_TIMEOUT_MS = 60_000; // starting and polling are short calls; the clip itself takes minutes

/** Starts a clip and returns the operation to poll. Returns at once; Google keeps working. */
export async function startVideo(input: VideoStartInput): Promise<{ operationName: string }> {
  if (mocking()) return { operationName: mockOperationName(input.prompt) };

  const spec = MODELS.video[input.modelKey];
  try {
    const operation = await withRetry(
      () =>
        vertex(spec.location).models.generateVideos({
          model: spec.id,
          prompt: input.prompt,
          ...(input.firstFrame && {
            image: { imageBytes: input.firstFrame.bytes.toString("base64"), mimeType: input.firstFrame.mimeType },
          }),
          config: {
            numberOfVideos: 1,
            aspectRatio: input.aspectRatio,
            durationSeconds: input.durationSeconds,
            resolution: input.resolution,
            generateAudio: input.generateAudio,
            ...(input.lastFrame && {
              lastFrame: { imageBytes: input.lastFrame.bytes.toString("base64"), mimeType: input.lastFrame.mimeType },
            }),
            httpOptions: { timeout: REQUEST_TIMEOUT_MS },
          },
        }),
      { retries: 2, delayMs: 2000, isRetryable: isTransientError },
    );
    if (!operation.name) throw new Error("Google didn't return a job to follow.");
    return { operationName: operation.name };
  } catch (error) {
    throw new VideoError(friendlyVideoError(error instanceof Error ? error.message : ""));
  }
}

/** Asks Google how a clip is doing. Cheap enough to call every few seconds. */
export async function pollVideo(operationName: string, modelKey?: VideoModelKey): Promise<VideoPoll> {
  if (operationName.startsWith("mock-op:")) return pollMock(operationName);

  const spec = MODELS.video[modelKey ?? "fast"];
  try {
    const operation = Object.assign(new GenerateVideosOperation(), { name: operationName });
    const result = await withRetry(
      () => vertex(spec.location).operations.getVideosOperation({ operation, config: { httpOptions: { timeout: REQUEST_TIMEOUT_MS } } }),
      { retries: 2, delayMs: 1500, isRetryable: isTransientError },
    );
    if (!result.done) return { done: false };

    if (result.error) return { done: true, errorMessage: String(result.error.message ?? JSON.stringify(result.error)) };
    const filtered = result.response?.raiMediaFilteredReasons;
    const video = result.response?.generatedVideos?.[0]?.video;
    if (!video && filtered?.length) return { done: true, errorMessage: `Blocked by Google's safety filters: ${filtered.join("; ")}` };
    if (!video) return { done: true };
    return {
      done: true,
      video: {
        bytes: video.videoBytes ? Buffer.from(video.videoBytes, "base64") : undefined,
        uri: video.uri,
        mimeType: video.mimeType ?? "video/mp4",
      },
    };
  } catch (error) {
    throw new VideoError(friendlyVideoError(error instanceof Error ? error.message : ""));
  }
}

// ─── e2e mock ────────────────────────────────────────────────────────────────
// A job that finishes after a couple of seconds and returns a tiny real mp4. The
// operation name carries everything, so polling needs no memory between requests:
//   mock-op:<startedAtMs>:<ok|fail>:<durationMs>
// "[fail]" in the prompt ends in an error; "[slow]" takes 8 seconds so a test can reload mid-job.

const MOCK_FAST_MS = 2000;
const MOCK_SLOW_MS = 8000;

function mockOperationName(prompt: string): string {
  const outcome = prompt.includes("[fail]") ? "fail" : "ok";
  const duration = prompt.includes("[slow]") ? MOCK_SLOW_MS : MOCK_FAST_MS;
  return `mock-op:${Date.now()}:${outcome}:${duration}`;
}

async function pollMock(name: string): Promise<VideoPoll> {
  const [, startedAt, outcome, duration] = name.split(":");
  if (Date.now() - Number(startedAt) < Number(duration)) return { done: false };
  if (outcome === "fail") return { done: true, errorMessage: "Mock failure: the prompt asked for it." };
  const bytes = await readFile(path.join(process.cwd(), "test", "fixtures", "mock-clip.mp4"));
  return { done: true, video: { bytes, mimeType: "video/mp4" } };
}
