import { Suspense } from "react";
import { LegacyRedirect } from "@/components/projects/legacy-redirect";

// The old address. It sends you to the same page inside your current project.
export default function AgentRedirect() {
  return (
    <Suspense fallback={null}>
      <LegacyRedirect section="agent" />
    </Suspense>
  );
}
