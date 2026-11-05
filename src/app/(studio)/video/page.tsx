import { Film } from "lucide-react";
import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Video" };

export default function VideoPage() {
  return (
    <ComingSoon
      icon={Film}
      title="Video isn't built yet"
      description="Text to video and image to video come after images and the agent."
    />
  );
}
