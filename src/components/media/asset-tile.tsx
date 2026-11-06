"use client";

import { Image as ImageIcon, Play, Film } from "lucide-react";
import { formatCost } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LazyVideo } from "./lazy-video";
import { TileActions } from "./tile-actions";
import { useAssetName } from "@/features/view/names";
import { useViewSettings } from "@/features/view/settings";
import type { AssetDto } from "@/features/library/types";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Props = {
  asset: AssetDto;
  onOpen: () => void;
  onFavorite: (value: boolean) => void;
  /** Adds Delete to the tile menu. */
  onDelete?: () => Promise<void> | void;
  onRename?: (name: string | null) => Promise<void>;
  /** "native" keeps the picture's own shape; "square" crops to a uniform grid. */
  fit?: "native" | "square";
  /** Above the fold: load now instead of lazily (helps Largest Contentful Paint). */
  eager?: boolean;
};

export function AssetTile({ asset, onOpen, onFavorite, onDelete, onRename, fit = "native", eager = false }: Props) {
  const name = useAssetName(asset);
  const { details } = useViewSettings();
  const ratio = asset.width && asset.height ? asset.width / asset.height : 1;
  const prompt = asset.generation?.prompt ?? "Generated image";
  const isVideo = asset.kind === "video";
  const seconds = asset.durationMs ? Math.round(asset.durationMs / 1000) : null;
  return (
    <div className="glass group relative overflow-hidden rounded-2xl" data-testid="asset-tile">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${isVideo ? "video" : "image"}: ${prompt.slice(0, 80)}${isVideo && seconds !== null ? `, ${seconds} seconds` : ""}`}
        className={cn("relative block w-full", focusRing)}
        style={{ aspectRatio: fit === "square" ? 1 : ratio }}
      >
        {isVideo ? (
          <>
            {/* A clip's first frame is shown by the browser itself, so no thumbnail file is needed. */}
            <LazyVideo
              src={`${asset.url}#t=0.1`}
              poster={asset.thumbnailUrl !== asset.url ? asset.thumbnailUrl : undefined}
              className="size-full"
            />
            <span aria-hidden className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-background/70 text-foreground">
                <Play className="size-4 fill-current" />
              </span>
            </span>
          </>
        ) : (
          <>
            {/* Thumbnails are small webp files behind signed links, so next/image's optimizer adds nothing. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.thumbnailUrl}
              alt="" // decorative: the button around it already has the name
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
      {isVideo && seconds !== null && (
        // Outside the button on purpose: the length is already in the button's name, and text inside a
        // button that its name doesn't contain fails accessibility checks.
        <span aria-hidden className={cn("pointer-events-none absolute left-2 rounded bg-background/80 px-1.5 py-0.5 text-xs tabular-nums text-foreground", details ? "bottom-9" : "bottom-2")}>
          0:{String(seconds).padStart(2, "0")}
        </span>
      )}
      {details && (
        // The name is already part of the button's own label, so this is only for the eye.
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-background/85 to-transparent px-3 pb-2.5 pt-8 text-xs text-foreground">
          {isVideo ? <Film className="size-3.5 shrink-0" /> : <ImageIcon className="size-3.5 shrink-0" />}
          <span className="truncate">{name}</span>
          {asset.generation?.costUsd != null && (
            <span className="ml-auto shrink-0 tabular-nums text-muted-foreground" data-testid="tile-cost">
              {formatCost(asset.generation.costUsd / Math.max(asset.generation.count, 1))}
            </span>
          )}
        </span>
      )}
      <TileActions asset={asset} name={name} onFavorite={onFavorite} onDelete={onDelete} onRename={onRename} />
    </div>
  );
}
