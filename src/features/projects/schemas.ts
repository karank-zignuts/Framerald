import { z } from "zod";

export const projectNameSchema = z.object({
  name: z.string().trim().min(1, "Give the project a name.").max(80, "Keep the name under 80 characters."),
});

/** A project on something new: a project id, null for "no project", or left out. */
export const projectFieldSchema = z.uuid().nullable().optional();

export type ProjectDto = { id: string; name: string };
