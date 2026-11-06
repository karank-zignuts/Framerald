"use client";

import { createContext, useCallback, useContext } from "react";
import { UNSORTED } from "./schemas";

const ProjectContext = createContext<string | null>(null);

export function ProjectProvider({ id, children }: { id: string; children: React.ReactNode }) {
  return <ProjectContext.Provider value={id}>{children}</ProjectContext.Provider>;
}

/** The project in the address (/p/<id>/...). The id "unsorted" means the work made before projects existed. */
export function useProjectId(): string {
  const id = useContext(ProjectContext);
  if (!id) throw new Error("useProjectId was used outside a project page.");
  return id;
}

const SECTIONS = ["/image", "/video", "/agent", "/library"];

/** "/video?from=x" becomes "/p/<id>/video?from=x". Anything that isn't a studio address is left alone. */
export function scopeHref(projectId: string, href: string): string {
  return SECTIONS.some((s) => href === s || href.startsWith(`${s}?`) || href.startsWith(`${s}/`)) ? `/p/${projectId}${href}` : href;
}

/** A function that puts a studio address inside the current project. */
export function useScopedHref(): (href: string) => string {
  const id = useProjectId();
  // Old, unsorted work has no project to put a link in. The plain address sends you to your current project.
  return useCallback((href: string) => (id === UNSORTED ? href : scopeHref(id, href)), [id]);
}
