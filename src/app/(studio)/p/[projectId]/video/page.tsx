import type { Metadata } from "next";
import { Suspense } from "react";
import { VideoStudio } from "@/components/video-studio/video-studio";
import { PageLoader } from "@/components/loading/ripple";

// The project layout waits for the project list before showing a page, so there is no instant shell to validate here.
export const instant = false;

export const metadata: Metadata = { title: "Video" };

export default function VideoPage() {
  return (
    <Suspense
      fallback={<PageLoader />}
    >
      <VideoStudio />
    </Suspense>
  );
}
