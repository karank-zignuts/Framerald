"use client";

import { Play, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssetDto } from "@/features/library/types";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Props = {
  asset: AssetDto;
  onOpen: () => void;
  onFavorite: (value: boolean) => void;
  /** "native" keeps the picture's own shape; "square" crops to a uniform grid. */
  fit?: "native" | "square";
  /** Above the fold: load now instead of lazily (helps Largest Contentful Paint). */
  eager?: boolean;
};

export function AssetTile({ asset, onOpen, onFavorite, fit = "native", eager = false }: Props) {
  const ratio = asset.width && asset.height ? asset.width / asset.height : 1;
  const prompt = asset.generation?.prompt ?? "Generated image";
  const isVideo = asset.kind === "video";
  const seconds = asset.durationMs ? Math.round(asset.durationMs / 1000) : null;
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-secondary" data-testid="asset-tile">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${isVideo ? "video" : "image"}: ${prompt.slice(0, 80)}`}
        className={cn("relative block w-full", focusRing)}
        style={{ aspectRatio: fit === "square" ? 1 : ratio }}
      >
        {isVideo ? (
          <>
            {/* A clip's first frame is shown by the browser itself, so no thumbnail file is needed. */}
            <video
              src={`${asset.url}#t=0.1`}
              poster={asset.thumbnailUrl !== asset.url ? asset.thumbnailUrl : undefined}
              muted
              playsInline
              preload="metadata"
              className="size-full object-cover"
            />
            <span aria-hidden className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-background/70 text-foreground">
                <Play className="size-4 fill-current" />
              </span>
            </span>
            {seconds !== null && (
              <span className="absolute bottom-2 left-2 rounded bg-background/80 px-1.5 py-0.5 text-xs tabular-nums text-foreground">
                0:{String(seconds).padStart(2, "0")}
              </span>
            )}
          </>
        ) : (
          <>
            {/* Thumbnails are small webp files behind signed links, so next/image's optimizer adds nothing. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.thumbnailUrl}
              alt={prompt}
              width={asset.width ?? undefined}
              height={asset.height ?? undefined}
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : "auto"}
              decoding="async"
              className="size-full object-cover"
            />
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() => onFavorite(!asset.isFavorite)}
        aria-pressed={asset.isFavorite}
        aria-label={asset.isFavorite ? "Remove from favourites" : "Add to favourites"}
        className={cn(
          "absolute right-2 top-2 flex size-8 items-center justify-center rounded-md bg-background/70 text-foreground transition-opacity duration-fast hover:bg-background",
          asset.isFavorite ? "opacity-100" : "opacity-0 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100",
          focusRing,
        )}
      >
        <Star aria-hidden className={cn("size-4", asset.isFavorite && "fill-brand text-brand")} />
      </button>
    </div>
  );
}
