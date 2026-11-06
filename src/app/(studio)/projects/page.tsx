import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectsView } from "@/components/projects/projects-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-3" role="status" aria-label="Loading">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full rounded-2xl" />
          ))}
        </div>
      }
    >
      <ProjectsView />
    </Suspense>
  );
}
