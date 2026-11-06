"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectProvider } from "@/features/projects/context";
import { rememberProject, useProjectsData } from "@/features/projects/queries";
import { UNSORTED } from "@/features/projects/schemas";

/** Checks the project in the address, remembers it as the last one, and shares it with the page below. */
export function ProjectScope({ children }: { children: React.ReactNode }) {
  const { projectId } = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const projects = useProjectsData();

  const isUnsorted = projectId === UNSORTED;
  const known = projects.data?.projects.some((p) => p.id === projectId) ?? false;
  const unsortedHasWork = (projects.data?.unsortedCount ?? 0) > 0;
  // Unsorted is a place to look at old work, so it only has the Library.
  const inLibrary = pathname.endsWith("/library");
  const valid = isUnsorted ? unsortedHasWork && inLibrary : known;

  useEffect(() => {
    if (!projects.isSuccess) return;
    if (valid) {
      if (!isUnsorted) rememberProject(projectId);
      return;
    }
    router.replace("/projects");
  }, [projects.isSuccess, valid, isUnsorted, projectId, router]);

  if (!projects.isSuccess || !valid) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-5" role="status" aria-label="Loading">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-32 w-full max-w-sm rounded-lg" />
      </div>
    );
  }
  return <ProjectProvider id={projectId}>{children}</ProjectProvider>;
}
