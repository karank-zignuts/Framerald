import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoStudio } from "@/components/video-studio/video-studio";

export const metadata: Metadata = { title: "Video" };

export default function VideoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col gap-4 p-5" role="status" aria-label="Loading">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-32 w-full max-w-sm rounded-lg" />
        </div>
      }
    >
      <VideoStudio />
    </Suspense>
  );
}
