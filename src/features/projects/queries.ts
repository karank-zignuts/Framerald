import { useQuery } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";
import { fetchProjects } from "./api";

export const projectKeys = { all: ["projects"] as const };

export const useProjects = () => useQuery({ queryKey: projectKeys.all, queryFn: fetchProjects, staleTime: 60_000 });

// The project new work goes into. Remembered in this browser so every studio follows it.
const STORAGE_KEY = "framerald.project";
const CHANGED = "framerald:project";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

function read(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage can be blocked; the app works without remembering
  }
}

/** The current project id (null for none) and a setter. A deleted project counts as none. */
export function useCurrentProject(): [string | null, (id: string | null) => void] {
  const projects = useProjects();
  const stored = useSyncExternalStore(subscribe, read, () => null);
  const id = stored && projects.data?.some((p) => p.id === stored) ? stored : null;
  const set = useCallback((next: string | null) => {
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, next);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore: see read()
    }
    window.dispatchEvent(new Event(CHANGED));
  }, []);
  return [id, set];
}
