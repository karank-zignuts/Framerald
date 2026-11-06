/** One generated item, as far as a project card needs to know it. */
/** `thumb` is a picture file for the item, or null when it has none (a clip without a thumbnail). */
export type AssetBrief = { project_id: string; kind: "image" | "video"; thumb: string | null; created_at: string };

export type ProjectSummary = { images: number; videos: number; coverPath: string | null };

/** How many images and clips each project holds, and the thumbnail of its newest item (its cover). */
export function summarizeProjects(rows: AssetBrief[]): Map<string, ProjectSummary> {
  const out = new Map<string, ProjectSummary & { newest: string }>();
  for (const r of rows) {
    const s = out.get(r.project_id) ?? { images: 0, videos: 0, coverPath: null, newest: "" };
    if (r.kind === "image") s.images += 1;
    else s.videos += 1;
    // Only an item with a real picture can be the cover, so a clip that has no thumbnail never is.
    if (r.thumb && r.created_at > s.newest) {
      s.newest = r.created_at;
      s.coverPath = r.thumb;
    }
    out.set(r.project_id, s);
  }
  return out;
}
