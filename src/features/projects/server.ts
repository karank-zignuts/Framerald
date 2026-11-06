import "server-only";
import { db, OWNER_ID } from "@/lib/supabase/server";
import { HttpError } from "@/lib/http";
import { signedUrlMap } from "@/lib/storage";
import type { ProjectDto, ProjectsDto } from "./schemas";
import { summarizeProjects, type AssetBrief } from "./summary";

const COLUMNS = "id,name,created_at,deleted_at";
type Row = { id: string; name: string; created_at: string; deleted_at: string | null };

/** Adds the counts and the cover to project rows, with one query for all their items. */
async function withSummaries(rows: Row[]): Promise<ProjectDto[]> {
  if (rows.length === 0) return [];
  const { data, error } = await db()
    .from("assets")
    .select("project_id,kind,thumbnail_path,storage_path,created_at")
    .eq("owner_id", OWNER_ID)
    .eq("source", "generated")
    .is("deleted_at", null)
    .in("project_id", rows.map((r) => r.id))
    .order("created_at", { ascending: false })
    .limit(5000); // plenty for one person; the counts would stop adding up past this
  if (error) throw new Error(`Couldn't count what is in your projects: ${error.message}`);
  const briefs = (data ?? []).map(
    (r): AssetBrief => ({ project_id: r.project_id as string, kind: r.kind as "image" | "video", thumb: (r.thumbnail_path ?? (r.kind === "image" ? r.storage_path : null)) as string | null, created_at: r.created_at as string }),
  );
  const summaries = summarizeProjects(briefs);
  const urls = await signedUrlMap([...summaries.values()].flatMap((s) => (s.coverPath ? [s.coverPath] : [])));
  return rows.map((r) => {
    const s = summaries.get(r.id);
    return {
      id: r.id,
      name: r.name,
      images: s?.images ?? 0,
      videos: s?.videos ?? 0,
      coverUrl: s?.coverPath ? (urls.get(s.coverPath) ?? null) : null,
      createdAt: r.created_at,
      deletedAt: r.deleted_at,
    };
  });
}

export async function listProjects(): Promise<ProjectsDto> {
  const [{ data, error }, unsorted] = await Promise.all([
    db().from("projects").select(COLUMNS).eq("owner_id", OWNER_ID).is("deleted_at", null).order("created_at", { ascending: true }),
    db().from("assets").select("id", { count: "exact", head: true }).eq("owner_id", OWNER_ID).eq("source", "generated").is("deleted_at", null).is("project_id", null),
  ]);
  if (error) throw new Error(`Couldn't load your projects: ${error.message}`);
  if (unsorted.error) throw new Error(`Couldn't count your unsorted work: ${unsorted.error.message}`);
  return { projects: await withSummaries(data as Row[]), unsortedCount: unsorted.count ?? 0 };
}

/** Projects in the trash, newest deleted first. */
export async function listDeletedProjects(): Promise<ProjectDto[]> {
  const { data, error } = await db()
    .from("projects")
    .select(COLUMNS)
    .eq("owner_id", OWNER_ID)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw new Error(`Couldn't load the trash: ${error.message}`);
  return withSummaries(data as Row[]);
}

export async function createProject(name: string): Promise<ProjectDto> {
  const { data, error } = await db().from("projects").insert({ owner_id: OWNER_ID, name }).select(COLUMNS).single();
  if (error) throw new Error(`Couldn't create the project: ${error.message}`);
  return (await withSummaries([data as Row]))[0];
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
  return (await withSummaries([data as Row]))[0];
}

/** Soft delete: the project goes to the trash with everything in it, and Restore brings it all back. */
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

export async function restoreProject(id: string): Promise<ProjectDto> {
  const { data, error } = await db()
    .from("projects")
    .update({ deleted_at: null })
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw new Error(`Couldn't restore the project: ${error.message}`);
  if (!data) throw new HttpError(404, "That project isn't in the trash.");
  return (await withSummaries([data as Row]))[0];
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
