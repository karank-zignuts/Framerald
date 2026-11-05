"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssetDto } from "@/features/library/types";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Props = {
  asset: AssetDto;
  onOpen: () => void;
  onFavorite: (value: boolean) => void;
  /** "native" keeps the picture's own shape; "square" crops to a uniform grid. */
  fit?: "native" | "square";
};

export function AssetTile({ asset, onOpen, onFavorite, fit = "native" }: Props) {
  const ratio = asset.width && asset.height ? asset.width / asset.height : 1;
  const prompt = asset.generation?.prompt ?? "Generated image";
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card" data-testid="asset-tile">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open image: ${prompt.slice(0, 80)}`}
        className={cn("block w-full", focusRing)}
        style={{ aspectRatio: fit === "square" ? 1 : ratio }}
      >
        {/* Thumbnails are small webp files behind signed links, so next/image's optimizer adds nothing. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.thumbnailUrl}
          alt={prompt}
          width={asset.width ?? undefined}
          height={asset.height ?? undefined}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
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
