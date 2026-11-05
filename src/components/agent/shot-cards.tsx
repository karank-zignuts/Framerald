"use client";

import { ArrowRight, Clapperboard, MessageSquareQuote } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { imageStudioUrl, videoStudioUrl } from "@/features/agent/prefill";
import type { Shot, ShotList } from "@/features/agent/schemas";

type Props = {
  list: ShotList;
  /** Puts a shot back into the chat box so it can be refined. */
  onRefine: (shot: Shot, index: number) => void;
};

/** A plan as cards. Each card opens the Image studio with that shot ready to generate. */
export function ShotCards({ list, onRefine }: Props) {
  return (
    <section aria-label={`Shot list: ${list.title}`} className="flex flex-col gap-3" data-testid="shot-list">
      <header className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium text-foreground">{list.title}</h3>
        <p className="text-xs text-muted-foreground">
          {list.shots.length} still frames. Send a shot to Image, or to Video to bring it to life.
        </p>
      </header>

      <ol className="grid gap-3 xl:grid-cols-2">
        {list.shots.map((shot, index) => (
          <li
            key={index}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
            data-testid="shot-card"
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-foreground">
                <span className="tabular-nums text-muted-foreground">{index + 1}</span>
                {shot.label ? <span className="ml-2">{shot.label}</span> : null}
              </p>
              <span className="text-xs tabular-nums text-muted-foreground">{shot.aspectRatio}</span>
            </div>
            <p className="select-text text-sm leading-relaxed text-foreground">{shot.prompt}</p>
            {shot.notes && <p className="text-xs leading-relaxed text-muted-foreground">{shot.notes}</p>}
            <div className="mt-auto flex flex-wrap gap-2">
              <Button asChild size="sm" variant="secondary">
                <Link href={imageStudioUrl(shot)}>
                  Send to Image
                  <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href={videoStudioUrl(shot)}>
                  <Clapperboard aria-hidden className="size-3.5" />
                  Send to Video
                </Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onRefine(shot, index)}>
                <MessageSquareQuote aria-hidden className="size-3.5" />
                Refine this shot
              </Button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
