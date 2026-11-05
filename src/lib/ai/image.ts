import "server-only";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { MODELS, type ImageModelKey, type ImageSize } from "./models";
import type { ImageUsage } from "./cost";
import { vertex } from "./vertex";
import { isTransientError, withRetry } from "@/lib/retry";

export class ImageGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageGenerationError";
  }
}

export type ImageRequest = {
  modelKey: ImageModelKey;
  prompt: string;
  aspectRatio: string;
  imageSize: ImageSize;
  references: { bytes: Buffer; mimeType: string }[];
};

export type ImageResult = {
  bytes: Buffer;
  mimeType: string;
  usage: ImageUsage | undefined;
  modelId: string;
};

// The slice of Vertex's response we read.
type ModelResponse = {
  candidates?: {
    finishReason?: string;
    content?: { parts?: { text?: string; inlineData?: { data?: string; mimeType?: string } }[] };
  }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: ImageUsage;
};

/** Pulls the picture out of a response, or throws a message you can show as is. */
export function extractImage(res: ModelResponse): { bytes: Buffer; mimeType: string } {
  if (res.promptFeedback?.blockReason) {
    throw new ImageGenerationError(
      `Google blocked this prompt (${res.promptFeedback.blockReason}). Try rewording it.`,
    );
  }
  const candidate = res.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const image = parts.find((p) => p.inlineData?.data);
  if (image?.inlineData?.data) {
    return {
      bytes: Buffer.from(image.inlineData.data, "base64"),
      mimeType: image.inlineData.mimeType ?? "image/png",
    };
  }
  const reason = candidate?.finishReason;
  if (reason && /SAFETY|PROHIBITED|BLOCKLIST|IMAGE_OTHER/.test(reason)) {
    throw new ImageGenerationError(`Google stopped this image for safety reasons (${reason}). Try rewording the prompt.`);
  }
  const text = parts.find((p) => p.text)?.text;
  if (text) {
    throw new ImageGenerationError(`The model replied with text instead of an image: "${text.slice(0, 200)}"`);
  }
  throw new ImageGenerationError(`The model returned no image${reason ? ` (${reason})` : ""}. Try again.`);
}

const REQUEST_TIMEOUT_MS = 240_000;

export async function generateImage(req: ImageRequest): Promise<ImageResult> {
  const spec = MODELS.image[req.modelKey];
  if (process.env.E2E_MOCK_AI === "1" && process.env.NODE_ENV !== "production") {
    return mockImage(req, spec.id);
  }

  const parts = [
    { text: req.prompt },
    ...req.references.map((r) => ({ inlineData: { data: r.bytes.toString("base64"), mimeType: r.mimeType } })),
  ];
  const res = await withRetry(
    () =>
      vertex(spec.location).models.generateContent({
        model: spec.id,
        contents: [{ role: "user", parts }],
        config: {
          httpOptions: { timeout: REQUEST_TIMEOUT_MS }, // a hung call fails clearly instead of running into the route limit
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: req.aspectRatio, imageSize: req.imageSize },
        },
      }),
    { retries: 2, delayMs: 2000, isRetryable: isTransientError },
  );
  return { ...extractImage(res as ModelResponse), usage: res.usageMetadata, modelId: spec.id };
}

// ─── e2e mock ────────────────────────────────────────────────────────────────
// Tests never spend credits. The picture is a gradient whose colors come from
// the prompt, so different prompts look different. Usage matches the real
// call we measured on 2026-11-05 (1K image), so cost shows up as about $0.039.

async function mockImage(req: ImageRequest, modelId: string): Promise<ImageResult> {
  if (req.prompt.includes("[fail]")) {
    throw new ImageGenerationError("Mock failure: the prompt asked for it.");
  }
  const [w, h] = req.aspectRatio.split(":").map(Number);
  const scale = 640 / Math.max(w, h);
  const width = Math.max(64, Math.round(w * scale));
  const height = Math.max(64, Math.round(h * scale));
  const hue = createHash("sha256").update(req.prompt).digest().readUInt16BE(0) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue},70%,38%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360},60%,12%)"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${width * 0.5}" cy="${height * 0.5}" r="${Math.min(width, height) * 0.22}" fill="#34d399" fill-opacity="0.85"/>
  </svg>`;
  const bytes = await sharp(Buffer.from(svg)).png().toBuffer();
  return {
    bytes,
    mimeType: "image/png",
    modelId,
    usage: {
      promptTokenCount: 14,
      thoughtsTokenCount: 721,
      candidatesTokensDetails: [{ modality: "IMAGE", tokenCount: 1120 }],
    },
  };
}
