import { z } from "zod";

export const projectNameSchema = z.object({
  name: z.string().trim().min(1, "Give the project a name.").max(80, "Keep the name under 80 characters."),
});

/** A project on something new: a project id, null for "no project", or left out. */
export const projectFieldSchema = z.uuid().nullable().optional();

export type ProjectDto = {
  id: string;
  name: string;
  /** How many images and clips are in it (items in the trash are not counted). */
  images: number;
  videos: number;
  /** A signed link to the thumbnail of its newest item, or null when it is empty. */
  coverUrl: string | null;
  createdAt: string;
  /** Set only for projects in the trash. */
  deletedAt: string | null;
};

/** What the project list answers with. `unsortedCount` is the work made before projects existed. */
export type ProjectsDto = { projects: ProjectDto[]; unsortedCount: number };

/** The id used in an address for the work made before projects existed. */
export const UNSORTED = "unsorted";
