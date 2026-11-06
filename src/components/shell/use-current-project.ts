"use client";

import { usePathname } from "next/navigation";
import { lastProjectId, useProjectsData } from "@/features/projects/queries";
import { UNSORTED, type ProjectDto } from "@/features/projects/schemas";

export type CurrentProject = {
  /** The id in the address, or the one you were last in when the page isn't inside a project. */
  id: string | null;
  project: ProjectDto | null;
  isUnsorted: boolean;
  /** "image", "video", "agent" or "library" when the page is inside a project. */
  section: string | null;
  /** True when the address itself holds the project (/p/<id>/...). */
  inProject: boolean;
};

const IN_PROJECT = /^\/p\/([^/]+)(?:\/([^/?#]+))?/;

export function useCurrentProject(): CurrentProject {
  const pathname = usePathname();
  const data = useProjectsData().data;
  const match = IN_PROJECT.exec(pathname);
  const inAddress = match?.[1] ?? null;
  const list = data?.projects ?? [];
  const fallback = inAddress ? null : (list.find((p) => p.id === lastProjectId()) ?? list[0] ?? null);
  const id = inAddress ?? fallback?.id ?? null;
  return {
    id,
    project: list.find((p) => p.id === id) ?? null,
    isUnsorted: id === UNSORTED,
    section: match?.[2] ?? null,
    inProject: Boolean(inAddress),
  };
}
