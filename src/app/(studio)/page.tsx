import { Suspense } from "react";
import { LegacyRedirect } from "@/components/projects/legacy-redirect";

// The home page opens the Image studio of your current project.
export default function Home() {
  return (
    <Suspense fallback={null}>
      <LegacyRedirect section="image" />
    </Suspense>
  );
}
