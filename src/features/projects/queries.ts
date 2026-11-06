import { useQuery } from "@tanstack/react-query";
import { fetchDeletedProjects, fetchProjects } from "./api";

export const projectKeys = { all: ["projects"] as const, trash: ["projects", "trash"] as const };

/** The projects and how much unsorted work there is. */
export const useProjectsData = () => useQuery({ queryKey: projectKeys.all, queryFn: fetchProjects, staleTime: 30_000 });

/** Just the project list. Shares one request with useProjectsData. */
export const useProjects = () => useQuery({ queryKey: projectKeys.all, queryFn: fetchProjects, staleTime: 30_000, select: (d) => d.projects });

export const useDeletedProjects = () => useQuery({ queryKey: projectKeys.trash, queryFn: fetchDeletedProjects, staleTime: 0 });

// The project you were last in. Remembered in this browser so the old addresses (/image, /library) and the home page know where to go.
const STORAGE_KEY = "framerald.project";

export function lastProjectId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage can be blocked; the app works without remembering
  }
}

export function rememberProject(id: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore: see lastProjectId()
  }
}
