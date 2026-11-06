import type { Metadata } from "next";
import { Suspense } from "react";
import { ImageStudio } from "@/components/image-studio/image-studio";
import { Skeleton } from "@/components/ui/skeleton";

// The project layout waits for the project list before showing a page, so there is no instant shell to validate here.
export const instant = false;

export const metadata: Metadata = { title: "Image" };

export default function ImagePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col gap-4 p-5" role="status" aria-label="Loading">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-32 w-full max-w-sm rounded-lg" />
        </div>
      }
    >
      <ImageStudio />
    </Suspense>
  );
}
