import { describe, expect, it } from "vitest";
import { summarizeProjects } from "./summary";

const row = (project_id: string, kind: "image" | "video", thumb: string | null, created_at: string) => ({ project_id, kind, thumb, created_at });

describe("summarizeProjects", () => {
  it("counts images and clips per project", () => {
    const m = summarizeProjects([
      row("a", "image", "a1", "2026-11-05T10:00:00Z"),
      row("a", "image", "a2", "2026-11-05T11:00:00Z"),
      row("a", "video", "a3", "2026-11-05T09:00:00Z"),
      row("b", "image", "b1", "2026-11-04T09:00:00Z"),
    ]);
    expect(m.get("a")).toMatchObject({ images: 2, videos: 1 });
    expect(m.get("b")).toMatchObject({ images: 1, videos: 0 });
  });
  it("uses the newest item as the cover, whatever the row order", () => {
    const m = summarizeProjects([row("a", "image", "old", "2026-11-01T00:00:00Z"), row("a", "image", "new", "2026-11-05T00:00:00Z"), row("a", "image", "mid", "2026-11-03T00:00:00Z")]);
    expect(m.get("a")?.coverPath).toBe("new");
  });
  it("never uses an item without a picture as the cover, even when it is the newest", () => {
    const m = summarizeProjects([row("a", "image", "pic", "2026-11-01T00:00:00Z"), row("a", "video", null, "2026-11-05T00:00:00Z")]);
    expect(m.get("a")).toMatchObject({ images: 1, videos: 1, coverPath: "pic" });
  });
  it("has no cover when nothing has a picture", () => {
    expect(summarizeProjects([row("a", "video", null, "2026-11-05T00:00:00Z")]).get("a")?.coverPath).toBeNull();
  });
  it("has nothing for a project with no items", () => {
    expect(summarizeProjects([]).get("a")).toBeUndefined();
  });
});
