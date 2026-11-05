// The only place model IDs live. Confirmed against this project's Vertex AI
// model list on 2026-11-05. Google renames models often, so re-check with the
// `gemini-api-dev` skill at the start of each phase.
//
// `location` matters: Veo and some other models are not served from "global",
// so each model says where to call it.
//
// Prices are NOT here yet. Add `costUsd` per unit from Google's current Vertex AI
// pricing page in Phase 1, before the first usage_events row is written.

export type ModelSpec = {
  id: string;
  label: string;
  location: "global" | "us-central1";
};

export const MODELS = {
  // Images. Verified present; first real image call happens in Phase 1.
  image: {
    default: {
      id: "gemini-nano-banana-2.1",
      label: "Nano Banana 2.1",
      location: "global",
    },
    pro: {
      id: "gemini-3-pro-image",
      label: "Gemini 3 Pro Image",
      location: "global",
    },
    fast: {
      id: "gemini-3.1-flash-image",
      label: "Gemini 3.1 Flash Image",
      location: "global",
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
