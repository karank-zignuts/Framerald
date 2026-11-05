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
  imageOutPerM: number;
};

export type ImageSize = "1K" | "2K" | "4K";

export type ModelSpec = {
  id: string;
  label: string;
  location: "global" | "us-central1";
  pricing?: Pricing;
  imageSizes?: readonly ImageSize[];
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

  // Video. Verified present; Veo is only listed in us-central1.
  video: {
    default: {
      id: "veo-3.1-generate-001",
      label: "Veo 3.1",
      location: "us-central1",
    },
    fast: {
      id: "veo-3.1-fast-generate-001",
      label: "Veo 3.1 Fast",
      location: "us-central1",
    },
    lite: {
      id: "veo-3.1-lite-generate-001",
      label: "Veo 3.1 Lite",
      location: "us-central1",
    },
    omni: {
      id: "gemini-omni-1.1-flash-preview",
      label: "Gemini Omni 1.1 Flash (preview)",
      location: "global",
    },
  },

  // Agent (planning, prompt refinement). gemini-3.5-flash answered a real call.
  agent: {
    default: {
      id: "gemini-3.5-flash",
      label: "Gemini 3.5 Flash",
      location: "global",
    },
    deep: {
      id: "gemini-3.1-pro-preview",
      label: "Gemini 3.1 Pro (preview)",
      location: "global",
    },
  },
} as const satisfies Record<string, Record<string, ModelSpec>>;

export type ImageModelKey = keyof typeof MODELS.image;
export const IMAGE_MODEL_KEYS = Object.keys(MODELS.image) as ImageModelKey[];

/** Friendly name for a stored model id, falling back to the id itself. */
export function modelLabel(modelId: string): string {
  for (const group of Object.values(MODELS)) {
    for (const m of Object.values(group) as ModelSpec[]) {
      if (m.id === modelId) return m.label;
    }
  }
  return modelId;
}

export function findPricing(modelId: string): Pricing | undefined {
  for (const group of Object.values(MODELS)) {
    for (const m of Object.values(group) as ModelSpec[]) {
      if (m.id === modelId) return m.pricing;
    }
  }
  return undefined;
}
