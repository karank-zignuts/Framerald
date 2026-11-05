import "server-only";
import { db, OWNER_ID } from "@/lib/supabase/server";
import { HttpError } from "@/lib/http";
import type { ProjectDto } from "./schemas";

const COLUMNS = "id,name";

export async function listProjects(): Promise<ProjectDto[]> {
  const { data, error } = await db()
    .from("projects")
    .select(COLUMNS)
    .eq("owner_id", OWNER_ID)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Couldn't load your projects: ${error.message}`);
  return data as ProjectDto[];
}

export async function createProject(name: string): Promise<ProjectDto> {
  const { data, error } = await db().from("projects").insert({ owner_id: OWNER_ID, name }).select(COLUMNS).single();
  if (error) throw new Error(`Couldn't create the project: ${error.message}`);
  return data as ProjectDto;
}

export async function renameProject(id: string, name: string): Promise<ProjectDto> {
  const { data, error } = await db()
    .from("projects")
    .update({ name })
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .is("deleted_at", null)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw new Error(`Couldn't rename the project: ${error.message}`);
  if (!data) throw new HttpError(404, "That project doesn't exist any more.");
  return data as ProjectDto;
}

/** Soft delete: it leaves the lists and pickers. Its items stay, and still show under All. */
export async function deleteProject(id: string): Promise<void> {
  const { data, error } = await db()
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .is("deleted_at", null)
    .select("id");
  if (error) throw new Error(`Couldn't delete the project: ${error.message}`);
  if (!data?.length) throw new HttpError(404, "That project doesn't exist any more.");
}

/** Refuses a project id that isn't one of yours or has been deleted. */
export async function assertProject(id: string): Promise<void> {
  const { data, error } = await db()
    .from("projects")
    .select("id")
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Couldn't check the project: ${error.message}`);
  if (!data) throw new HttpError(400, "That project doesn't exist any more.");
}
