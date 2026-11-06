import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectsView } from "@/components/projects/projects-view";
import { PageLoader } from "@/components/loading/ripple";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={<PageLoader />}
    >
      <ProjectsView />
    </Suspense>
  );
}
