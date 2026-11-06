import { Suspense } from "react";
import { ProjectScope } from "@/components/projects/project-scope";

// Every page under /p/<id>/ belongs to one project. ProjectScope checks the id and shares it with the page.
export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ProjectScope>{children}</ProjectScope>
    </Suspense>
  );
}
