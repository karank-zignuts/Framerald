import { z } from "zod";

export type PresetGroup = "camera" | "style";
export type PresetKind = "image" | "video";

export type PresetTemplate = {
  id: string;
  name: string;
  group: PresetGroup;
  /** Either plain text added after the prompt, or text containing {prompt} where the prompt goes. */
  template: string;
  kinds?: PresetKind[];
  /** True for the ones shipped in code; those can't be deleted. */
  builtin?: boolean;
};

/** Adds each preset to the prompt in order. Used at submit time, so the saved prompt is exactly what was sent. */
export function applyPresets(prompt: string, presets: PresetTemplate[]): string {
  let current = prompt.trim();
  for (const preset of presets) {
    current = preset.template.includes("{prompt}")
      ? preset.template.replace("{prompt}", current)
      : `${current.replace(/[.,;:\s]+$/, "")}, ${preset.template}`;
  }
  return current.trim();
}

export const createPresetSchema = z.object({
  name: z.string().trim().min(1, "Give the preset a name.").max(60),
  group: z.enum(["camera", "style"]),
  kinds: z.array(z.enum(["image", "video"])).min(1, "Choose image, video or both."),
  template: z.string().trim().min(1, "Write what the preset adds.").max(300),
});

export type CreatePresetInput = z.infer<typeof createPresetSchema>;

const CAMERA: Omit<PresetTemplate, "group" | "kinds">[] = [
  { id: "cam-static", name: "Static", template: "locked-off static camera, no camera movement" },
  { id: "cam-dolly-in", name: "Slow dolly in", template: "slow dolly in toward the subject" },
  { id: "cam-dolly-out", name: "Dolly out", template: "slow dolly out, revealing the surroundings" },
  { id: "cam-orbit", name: "Orbit", template: "the camera orbits smoothly around the subject" },
  { id: "cam-handheld", name: "Handheld", template: "handheld camera with subtle natural shake" },
  { id: "cam-crane-up", name: "Crane up", template: "crane shot rising up and away from the subject" },
  { id: "cam-whip-pan", name: "Whip pan", template: "fast whip pan across the scene" },
  { id: "cam-tracking", name: "Tracking shot", template: "tracking shot following the subject at walking pace" },
  { id: "cam-push-in", name: "Push in to close-up", template: "slow push in to a close-up of the subject's face" },
];

const STYLE: Omit<PresetTemplate, "group" | "kinds">[] = [
  { id: "style-noir", name: "Film noir", template: "{prompt}, shot as black and white film noir, hard shadows, high contrast" },
  { id: "style-documentary", name: "Documentary", template: "natural documentary look, available light, handheld realism" },
  { id: "style-anime", name: "Anime", template: "hand-drawn anime style, clean line art, painted backgrounds" },
  { id: "style-35mm", name: "35mm film", template: "shot on 35mm film, fine grain, soft halation, warm tones" },
  { id: "style-neon", name: "Neon night", template: "neon-lit night, wet streets, magenta and cyan glow" },
  { id: "style-vhs", name: "Vintage VHS", template: "vintage VHS footage, soft focus, scanlines, colour bleed" },
  { id: "style-teal-orange", name: "Teal and orange", template: "cinematic teal and orange colour grade, anamorphic lens flare" },
  { id: "style-silent", name: "Silent film", template: "black and white silent film, flicker, high contrast, vignette" },
  { id: "style-clay", name: "Claymation", template: "stop-motion claymation, visible fingerprints, handmade miniature sets" },
];

/** Shipped in code so they work without a database change. Your own presets live in the `presets` table. */
export const BUILTIN_PRESETS: PresetTemplate[] = [
  ...CAMERA.map((p) => ({ ...p, group: "camera" as const, kinds: ["video" as const], builtin: true })),
  ...STYLE.map((p) => ({ ...p, group: "style" as const, kinds: ["image" as const, "video" as const], builtin: true })),
];
