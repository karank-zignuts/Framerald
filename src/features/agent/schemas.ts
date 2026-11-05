import { z } from "zod";
import { ASPECT_RATIOS } from "@/features/generations/schemas";
import { projectFieldSchema } from "@/features/projects/schemas";

export const MAX_SHOTS = 12;
export const MAX_MESSAGE_CHARS = 8000;

export const shotSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  prompt: z.string().trim().min(1).max(2000),
  aspectRatio: z.enum(ASPECT_RATIOS),
  notes: z.string().trim().min(1).max(500).optional(),
});

export const shotListSchema = z.object({
  title: z.string().trim().min(1).max(120),
  shots: z.array(shotSchema).min(1).max(MAX_SHOTS),
});

export type Shot = z.infer<typeof shotSchema>;
export type ShotList = z.infer<typeof shotListSchema>;

/** Gemini rejects some JSON Schema keywords Zod adds; keep only the plain shape. */
function plain(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(plain);
  if (node && typeof node === "object") {
    return Object.fromEntries(
      Object.entries(node)
        .filter(([key]) => key !== "$schema" && key !== "additionalProperties")
        .map(([key, value]) => [key, plain(value)]),
    );
  }
  return node;
}

/** The parameters of the `propose_shot_list` tool, derived from the Zod schema so they can't drift. */
export const shotListToolSchema = plain(z.toJSONSchema(shotListSchema)) as Record<string, unknown>;

export const sendMessageSchema = z.object({
  text: z.string().trim().min(1, "Write a message first.").max(MAX_MESSAGE_CHARS, "Keep the message under 8,000 characters."),
});

export const refinePromptSchema = z.object({
  prompt: z.string().trim().min(1, "Write a prompt first.").max(4000),
  aspectRatio: z.enum(ASPECT_RATIOS).optional(),
  /** Which studio the prompt is for. Video prompts get motion, camera and sound. Default: image. */
  kind: z.enum(["image", "video"]).optional(),
});

export const updateThreadSchema = z
  .object({
    title: z.string().trim().min(1, "Give the chat a name.").max(120).optional(),
    projectId: projectFieldSchema,
  })
  .refine((b) => b.title !== undefined || b.projectId !== undefined, { message: "Say what to change." });

export const createThreadSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  projectId: projectFieldSchema,
});

export const messageDtoSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  text: z.string(),
  shotList: shotListSchema.nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
  costUsd: z.number().nullable(),
});

export type AgentMessageDto = z.infer<typeof messageDtoSchema>;

export type ThreadDto = { id: string; title: string; updatedAt: string; projectId: string | null };

/** A new chat is named after its first message. Used by the server and, for an instant list update, the browser. */
export const titleFromMessage = (text: string): string => text.replace(/\s+/g, " ").trim().slice(0, 60);
