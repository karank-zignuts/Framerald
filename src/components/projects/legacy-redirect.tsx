"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { createProjectRequest } from "@/features/projects/api";
import { defaultProjectName } from "@/features/projects/name";
import { lastProjectId, projectKeys, useProjectsData } from "@/features/projects/queries";
import { PageLoader } from "@/components/loading/ripple";

/**
 * The old addresses (/image, /video, /agent, /library) and the home page. They send you to the same page inside the project you
 * were last in, or the first one. With no project yet, one is made first, because every generation belongs to a project.
 */
export function LegacyRedirect({ section }: { section: "image" | "video" | "agent" | "library" }) {
  const router = useRouter();
  const qc = useQueryClient();
  const params = useSearchParams();
  const projects = useProjectsData();
  const creating = useRef(false);

  useEffect(() => {
    if (!projects.isSuccess) return;
    const list = projects.data.projects;
    const search = params.size ? `?${params}` : "";
    const go = (id: string) => router.replace(`/p/${id}/${section}${search}`);
    const last = lastProjectId();
    const target = list.find((p) => p.id === last) ?? list[0];
    if (target) return go(target.id);
    if (creating.current) return;
    creating.current = true;
    void createProjectRequest(defaultProjectName()).then(async (made) => {
      await qc.invalidateQueries({ queryKey: projectKeys.all });
      go(made.id);
    });
  }, [projects.isSuccess, projects.data, params, router, section, qc]);

  return <PageLoader />;
}
