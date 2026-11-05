"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { parseVideoPrefill } from "@/features/agent/prefill";
import { fetchAsset } from "@/features/generations/api";
import { fetchVideoReRunSettings } from "@/features/videos/api";
import { VideoWorkspace, type VideoInitial } from "./video-workspace";

/**
 * Reads `?from=<clip>` (re-run its settings), `?first=<image>` (animate that image)
 * or `?prompt=&ratio=` (a shot sent from the agent), loads what that needs, then
 * mounts the workspace with those values.
 */
export function VideoStudio() {
  const params = useSearchParams();
  const from = params.get("from");
  const first = params.get("first");
  const prefill = from || first ? null : parseVideoPrefill(params);

  const initialQuery = useQuery({
    queryKey: ["video-initial", from, first],
    enabled: Boolean(from || first),
    staleTime: Infinity,
    queryFn: async (): Promise<VideoInitial> => {
      if (from) {
        const s = await fetchVideoReRunSettings(from);
        return {
          prompt: s.prompt,
          model: s.model,
          aspectRatio: s.aspectRatio as "16:9" | "9:16",
          durationSeconds: s.durationSeconds as 4 | 6 | 8,
          resolution: s.resolution as "720p" | "1080p" | "4k",
          audio: s.audio,
          firstFrame: s.firstFrame,
          lastFrame: s.lastFrame,
          sourceGenerationId: from,
          missingFrames: s.missingFrames,
        };
      }
      return { firstFrame: await fetchAsset(first!) };
    },
  });

  if ((from || first) && initialQuery.isPending) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-5" role="status" aria-label="Loading settings">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-32 w-full max-w-sm rounded-lg" />
      </div>
    );
  }

  const notice = initialQuery.isError
    ? `Couldn't load those settings: ${initialQuery.error.message}`
    : initialQuery.data?.missingFrames
      ? "A frame this clip was made from was deleted. Add new frames to keep it an image-to-video clip, or leave them empty for text to video."
      : null;
  const fromPrefill: VideoInitial | null = prefill
    ? { ...(prefill.prompt && { prompt: prefill.prompt }), ...(prefill.aspectRatio && { aspectRatio: prefill.aspectRatio as "16:9" | "9:16" }) }
    : null;
  return (
    <VideoWorkspace
      key={`${from}-${first}-${prefill?.prompt}-${prefill?.aspectRatio}`}
      initial={initialQuery.data ?? fromPrefill}
      notice={notice}
    />
  );
}
