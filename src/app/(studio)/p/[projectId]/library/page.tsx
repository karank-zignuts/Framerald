import type { Metadata } from "next";
import { Suspense } from "react";
import { LibraryView } from "@/components/library/library-view";
import { PageLoader } from "@/components/loading/ripple";

// The project layout waits for the project list before showing a page, so there is no instant shell to validate here.
export const instant = false;

export const metadata: Metadata = { title: "Library" };

export default function LibraryPage() {
  return (
    <Suspense
      fallback={<PageLoader />}
    >
      <LibraryView />
    </Suspense>
  );
}
