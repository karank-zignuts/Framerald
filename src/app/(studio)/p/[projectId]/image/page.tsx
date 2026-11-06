import type { Metadata } from "next";
import { Suspense } from "react";
import { ImageStudio } from "@/components/image-studio/image-studio";
import { PageLoader } from "@/components/loading/ripple";

// The project layout waits for the project list before showing a page, so there is no instant shell to validate here.
export const instant = false;

export const metadata: Metadata = { title: "Image" };

export default function ImagePage() {
  return (
    <Suspense
      fallback={<PageLoader />}
    >
      <ImageStudio />
    </Suspense>
  );
}
