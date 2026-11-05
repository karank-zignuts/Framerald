"use client";

import { Film, Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Google doesn't report progress, so this is an estimate from elapsed time: it eases toward 95% and
 * only the finished result takes it to 100%. `expectedSeconds` is roughly how long a normal job takes.
 */
export function useEstimatedPercent(startedAt: number | string | Date | undefined, expectedSeconds: number): number {
  const [start] = useState(() => (startedAt ? new Date(startedAt).getTime() : Date.now()));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);
  const seconds = Math.max(0, (now - start) / 1000);
  const tau = expectedSeconds / 2; // about 86% by the expected time
  return Math.min(95, Math.round(95 * (1 - Math.exp(-seconds / tau))));
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Three soft blurred blobs drifting on slow orbits. Each tile gets its own random paths, speeds and start points. */
export function GeneratingBackdrop({ className }: { className?: string }) {
  const [blobs] = useState(() =>
    Array.from({ length: 3 }, (_, i) => ({
      left: rand(-10, 45) + i * 12,
      top: rand(-10, 50),
      size: rand(55, 80),
      vars: {
        "--x1": `${rand(-40, 60)}%`,
        "--y1": `${rand(-40, 60)}%`,
        "--x2": `${rand(-60, 40)}%`,
        "--y2": `${rand(-30, 70)}%`,
        "--x3": `${rand(-30, 60)}%`,
        "--y3": `${rand(-60, 30)}%`,
        "--s1": rand(0.85, 1.25).toFixed(2),
        "--s2": rand(0.8, 1.3).toFixed(2),
        animationDuration: `${rand(16, 30).toFixed(1)}s`,
        animationDelay: `-${rand(0, 20).toFixed(1)}s`,
      } as React.CSSProperties,
    })),
  );
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden bg-card", className)}>
      {blobs.map((b, i) => (
        <span
          key={i}
          className="gen-blob absolute rounded-full"
          style={{ left: `${b.left}%`, top: `${b.top}%`, width: `${b.size}%`, height: `${b.size}%`, ...b.vars }}
        />
      ))}
      <span className="absolute inset-0 backdrop-blur-2xl" />
    </div>
  );
}

/** A tile for an image that's being made: blurred moving background, icon top-left, estimated percent top-right. */
export function GeneratingTile({ ratio, prompt, className }: { ratio: number; prompt?: string; className?: string }) {
  const percent = useEstimatedPercent(undefined, 20);
  return (
    <div className={cn("relative w-full overflow-hidden rounded-2xl border border-border", className)} style={{ aspectRatio: ratio }}>
      <GeneratingBackdrop />
      <ImageIcon aria-hidden className="absolute left-3 top-3 size-5 text-muted-foreground" />
      <span aria-hidden className="absolute right-3 top-3 text-sm tabular-nums text-muted-foreground">
        {percent}%
      </span>
      {prompt && <p className="absolute inset-x-3 bottom-3 line-clamp-1 text-xs text-muted-foreground">{prompt}</p>}
    </div>
  );
}

/** The icon and percent for a running clip. Sits over a GeneratingBackdrop. */
export function GeneratingCorners({ startedAt, expectedSeconds }: { startedAt: string; expectedSeconds: number }) {
  const percent = useEstimatedPercent(startedAt, expectedSeconds);
  return (
    <>
      <Film aria-hidden className="absolute left-3 top-3 size-5 text-muted-foreground" />
      <span aria-hidden className="absolute right-3 top-3 text-sm tabular-nums text-muted-foreground">
        {percent}%
      </span>
    </>
  );
}
