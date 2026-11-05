import { z } from "zod";
import { HttpError } from "@/lib/http";

/** Reads a `[id]` route parameter and refuses anything that isn't a uuid. */
export async function uuidParam(params: Promise<{ id: string }>): Promise<string> {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new HttpError(400, "That id isn't valid.");
  return id;
}
