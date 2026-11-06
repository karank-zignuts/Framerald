import type { Metadata } from "next";
import { Suspense } from "react";
import { LibraryView } from "@/components/library/library-view";
import { Skeleton } from "@/components/ui/skeleton";

// The project layout waits for the project list before showing a page, so there is no instant shell to validate here.
export const instant = false;

export const metadata: Metadata = { title: "Library" };

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-3 xl:grid-cols-4" role="status" aria-label="Loading">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-lg" />
          ))}
        </div>
      }
    >
      <LibraryView />
    </Suspense>
  );
}
