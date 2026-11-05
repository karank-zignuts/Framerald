// The only place model IDs and prices live. IDs confirmed against this
// project's Vertex AI model list on 2026-11-05. Google renames models often, so
// re-check with the `gemini-api-dev` skill at the start of each phase.
//
// `location` matters: Veo and some other models are not served from "global",
// so each model says where to call it.
//
// Prices are USD per 1M tokens, taken from Google's published Gemini API price
// list on 2026-11-05 (the Vertex pricing page would not load). Treat computed
// costs as estimates. Models with no `pricing` give an unknown cost, not a guess.

export type Pricing = {
  inputPerM: number;
  textOutPerM: number; // visible text and thinking tokens
  imageOutPerM?: number; // image models only
};

export type ImageSize = "1K" | "2K" | "4K";

export type VideoResolution = "720p" | "1080p" | "4k";
/** USD per second of video, by output resolution. A missing resolution means the model can't make it. */
export type VideoRates = Partial<Record<VideoResolution, number>>;

export type ModelSpec = {
  id: string;
  label: string;
  location: "global" | "us-central1";
  pricing?: Pricing;
  /** A lower launch price that ends on a known date (inclusive, UTC). After it, `pricing` applies. */
  introPricing?: { until: string; pricing: Pricing };
  imageSizes?: readonly ImageSize[];
  /** Video models: what they can output, and what a second costs with and without sound. */
  videoResolutions?: readonly VideoResolution[];
  videoPricing?: { audio: VideoRates; silent: VideoRates };
};

export const MODELS = {
  // Images. `default` was verified with real calls on 2026-11-05.
  image: {
    default: {
      id: "gemini-nano-banana-2.1",
      label: "Nano Banana 2.1",
      location: "global",
      pricing: { inputPerM: 1.5, textOutPerM: 7.5, imageOutPerM: 30 },
      imageSizes: ["1K", "2K", "4K"],
    },
    pro: {
      id: "gemini-3-pro-image",
      label: "Nano Banana Pro",
      location: "global",
      pricing: { inputPerM: 2, textOutPerM: 12, imageOutPerM: 120 },
      imageSizes: ["1K", "2K", "4K"],
    },
    fast: {
      id: "gemini-3.1-flash-lite-image",
      label: "Nano Banana 2 Lite",
      location: "global",
      pricing: { inputPerM: 0.25, textOutPerM: 1.5, imageOutPerM: 30 },
      imageSizes: ["1K"],
    },
  },

  // Video. Veo runs in us-central1 only. Prices are Google's Vertex list (read 2026-11-05),
  // shown there as "$ / 1 count" and treated here as per second, the conservative reading.
  video: {
    default: {
      id: "veo-3.1-generate-001",
      label: "Veo 3.1",
      location: "us-central1",
      videoResolutions: ["720p", "1080p", "4k"],
      videoPricing: {
        audio: { "720p": 0.4, "1080p": 0.4, "4k": 0.6 },
        silent: { "720p": 0.2, "1080p": 0.2, "4k": 0.4 },
      },
    },
    fast: {
      id: "veo-3.1-fast-generate-001",
      label: "Veo 3.1 Fast",
      location: "us-central1",
      videoResolutions: ["720p", "1080p"],
      videoPricing: {
        audio: { "720p": 0.1, "1080p": 0.12 },
        silent: { "720p": 0.08, "1080p": 0.1 },
      },
    },
    lite: {
      id: "veo-3.1-lite-generate-001",
      label: "Veo 3.1 Lite (preview)",
      location: "us-central1",
      videoResolutions: ["720p", "1080p"],
      videoPricing: {
        audio: { "720p": 0.05, "1080p": 0.08 },
        silent: { "720p": 0.03, "1080p": 0.05 },
      },
    },
    // Not offered in the Video Studio: it uses the Interactions API, which Vertex refused for the image models.
    omni: {
      id: "gemini-omni-1.1-flash-preview",
      label: "Gemini Omni 1.1 Flash (preview)",
      location: "global",
    },
  },

  // Agent (planning, prompt refinement). `default` streamed text and a tool call in real calls on 2026-11-05.
  agent: {
    default: {
      id: "gemini-3.8-flash",
      label: "Gemini 3.8 Flash",
      location: "global",
      // Google's list: $0.75 / $3.75 per 1M through 2026-12-31, then $1.50 / $7.50.
      pricing: { inputPerM: 1.5, textOutPerM: 7.5 },
      introPricing: { until: "2026-12-31", pricing: { inputPerM: 0.75, textOutPerM: 3.75 } },
    },
    deep: {
      id: "gemini-3.1-pro-preview",
      label: "Gemini 3.1 Pro (preview)",
      location: "global",
      // Prompts up to 200k tokens. Longer prompts cost more and are not priced here.
      pricing: { inputPerM: 2, textOutPerM: 12 },
    },
  },
} as const satisfies Record<string, Record<string, ModelSpec>>;

export type ImageModelKey = keyof typeof MODELS.image;
export const IMAGE_MODEL_KEYS = Object.keys(MODELS.image) as ImageModelKey[];

/** Veo models offered in the Video Studio, cheapest first. */
export type VideoModelKey = "lite" | "fast" | "default";
export const VIDEO_MODEL_KEYS: VideoModelKey[] = ["lite", "fast", "default"];

export function findModel(modelId: string): ModelSpec | undefined {
  for (const group of Object.values(MODELS)) {
    for (const m of Object.values(group) as ModelSpec[]) if (m.id === modelId) return m;
  }
  return undefined;
}

/** Friendly name for a stored model id, falling back to the id itself. */
export function modelLabel(modelId: string): string {
  for (const group of Object.values(MODELS)) {
    for (const m of Object.values(group) as ModelSpec[]) {
      if (m.id === modelId) return m.label;
    }
  }
  return modelId;
}

const DAY_MS = 86_400_000;

/** The price in force at `at` (default now), or undefined when we don't know it. */
export function findPricing(modelId: string, at: Date = new Date()): Pricing | undefined {
  for (const group of Object.values(MODELS)) {
    for (const m of Object.values(group) as ModelSpec[]) {
      if (m.id !== modelId) continue;
      if (m.introPricing && at.getTime() < Date.parse(`${m.introPricing.until}T00:00:00Z`) + DAY_MS) {
        return m.introPricing.pricing;
      }
      return m.pricing;
    }
  }
  return undefined;
}
