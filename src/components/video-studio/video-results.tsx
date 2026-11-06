"use client";

import { Download, RotateCcw, Video } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useScopedHref } from "@/features/projects/context";
import { GeneratingBackdrop, GeneratingCorners } from "@/components/media/generating";
import { downloadUrl, extensionFor, formatCost } from "@/lib/format";
import type { VideoJobDto } from "@/features/videos/types";

type Props = {
  jobs: VideoJobDto[] | undefined;
  isPending: boolean;
  error: Error | null;
  onRetryLoad: () => void;
  onTryAgain: (job: VideoJobDto) => void;
  /** Clips whose Try again has been pressed and is still starting. */
  retryingIds: string[];
};

/** m:ss since a clip started. Ticks every second. */
function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  const seconds = now === null ? 0 : Math.max(0, Math.floor((now - Date.parse(since)) / 1000));
  return (
    <span className="tabular-nums">
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
    </span>
  );
}

// A portrait clip is capped by height so it can't push everything else off the screen.
const frame = (aspect: string) => (aspect === "9:16" ? "aspect-[9/16] max-h-[32rem]" : "aspect-video w-full max-w-2xl");

function JobCard({ job, onTryAgain, retrying }: { job: VideoJobDto; onTryAgain: (job: VideoJobDto) => void; retrying: boolean }) {
  const scoped = useScopedHref();
  return (
    <section aria-label={`Clip: ${job.prompt.slice(0, 60)}`} className="flex flex-col gap-3" data-testid="job" data-status={job.status}>
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="line-clamp-2 text-sm text-foreground">{job.prompt}</p>
          <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            <span>{job.modelLabel}</span>
            <span>{job.aspectRatio}</span>
            <span>{job.durationSeconds} s</span>
            <span>{job.resolution === "4k" ? "4K" : job.resolution}</span>
            <span>{job.audio ? "With sound" : "No sound"}</span>
            {job.mode === "image_to_video" && <span>From an image</span>}
          </p>
        </div>
        {job.status !== "failed" && (
          <p className="shrink-0 text-sm tabular-nums text-muted-foreground" data-testid="job-cost">
            {formatCost(job.costUsd)}
          </p>
        )}
      </header>

      {job.status === "running" && (
        <div
          role="status"
          aria-label="Generating"
          className={`${frame(job.aspectRatio)} flex flex-col items-center justify-center gap-2 relative overflow-hidden rounded-2xl border border-border p-6 text-center`}
        >
          <GeneratingBackdrop />
          <GeneratingCorners startedAt={job.createdAt} expectedSeconds={120} />
          <p className="relative text-sm text-foreground">
            Generating <Elapsed since={job.createdAt} />
          </p>
          <p className="relative max-w-xs text-xs text-muted-foreground">Usually 1 to 3 minutes. It keeps going if you leave this page.</p>
        </div>
      )}

      {job.status === "failed" && (
        <div role="alert" className="flex max-w-xl flex-col items-start gap-3 rounded-lg border border-destructive/50 p-4" data-testid="job-error">
          <p className="text-sm">{job.error ?? "The clip didn't finish."}</p>
          <Button variant="secondary" size="sm" onClick={() => onTryAgain(job)} disabled={retrying} aria-busy={retrying}>
            <RotateCcw aria-hidden className="size-3.5" />
            {retrying ? "Starting" : "Try again"}
          </Button>
        </div>
      )}

      {job.status === "succeeded" && job.asset && (
        <>
          <video
            controls
            preload="metadata"
            playsInline
            src={`${job.asset.url}#t=0.1`}
            poster={job.asset.thumbnailUrl !== job.asset.url ? job.asset.thumbnailUrl : undefined}
            className={`${frame(job.aspectRatio)} rounded-lg border border-border bg-background object-contain`}
            data-testid="job-video"
          />
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <a href={downloadUrl(job.asset.url, `framerald-${job.id.slice(0, 8)}.${extensionFor(job.asset.mimeType)}`)}>
                <Download aria-hidden className="size-3.5" />
                Download
              </a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={scoped(`/video?from=${job.id}`)}>
                <RotateCcw aria-hidden className="size-3.5" />
                Re-run these settings
              </Link>
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

export function VideoResults({ jobs, isPending, error, onRetryLoad, onTryAgain, retryingIds }: Props) {
  if (isPending) {
    return (
      <div className="flex flex-col gap-4 p-5" role="status" aria-label="Loading clips">
        <Skeleton className="aspect-video w-full max-w-2xl rounded-lg" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-5">
        <div role="alert" className="flex max-w-md flex-col items-start gap-3 rounded-lg border border-destructive/50 p-4">
          <p className="text-sm">Couldn&apos;t load your clips: {error.message}</p>
          <Button variant="secondary" size="sm" onClick={onRetryLoad}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
  if (!jobs || jobs.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          icon={<Video aria-hidden className="size-6" />}
          title="Your clips appear here"
          description="Write a prompt and press Generate video. A clip takes a few minutes, and you can leave while it runs."
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-10 p-5 lg:overflow-y-auto" data-testid="jobs">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} onTryAgain={onTryAgain} retrying={retryingIds.includes(job.id)} />
      ))}
    </div>
  );
}
