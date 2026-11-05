"use client";

import { Download, Pencil, RotateCcw, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { modelLabel } from "@/lib/ai/models";
import { downloadUrl, formatCost, formatDate } from "@/lib/format";
import type { AssetDto } from "@/features/library/types";

type Props = {
  asset: AssetDto;
  onClose: () => void;
  onFavorite: (value: boolean) => void;
  onDelete: () => Promise<void> | void;
};

/** One image, large, with what made it and what to do next. Mount with key={asset.id}. */
export function AssetDialog({ asset, onClose, onFavorite, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const g = asset.generation;

  async function confirmDelete() {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="grid max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-5xl gap-0 overflow-hidden p-0 lg:grid-cols-[minmax(0,1fr)_20rem]"
        data-testid="asset-dialog"
      >
        <DialogTitle className="sr-only">Image details</DialogTitle>
        <DialogDescription className="sr-only">The image, the prompt that made it, and actions.</DialogDescription>

        <div className="flex min-h-0 items-center justify-center bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.url}
            alt={g?.prompt ?? "Generated image"}
            width={asset.width ?? undefined}
            height={asset.height ?? undefined}
            className="max-h-[60dvh] w-full object-contain lg:max-h-[92dvh]"
          />
        </div>

        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto border-t border-border bg-card p-5 lg:border-l lg:border-t-0">
          {g && <p className="select-text text-sm leading-relaxed text-foreground">{g.prompt}</p>}

          {g && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Model</dt>
              <dd>{modelLabel(g.modelId)}</dd>
              {g.aspectRatio && (
                <>
                  <dt className="text-muted-foreground">Shape</dt>
                  <dd>
                    {g.aspectRatio}, {g.imageSize ?? "1K"}
                  </dd>
                </>
              )}
              <dt className="text-muted-foreground">Cost</dt>
              <dd className="tabular-nums" data-testid="asset-cost">
                {g.count > 1 ? `${formatCost(g.costUsd)} for ${g.count} images` : formatCost(g.costUsd)}
              </dd>
              <dt className="text-muted-foreground">Made</dt>
              <dd>{formatDate(asset.createdAt)}</dd>
            </dl>
          )}

          <div className="mt-auto flex flex-col gap-2">
            <Button variant="secondary" onClick={() => onFavorite(!asset.isFavorite)} aria-pressed={asset.isFavorite}>
              <Star aria-hidden className={asset.isFavorite ? "size-4 fill-brand text-brand" : "size-4"} />
              {asset.isFavorite ? "Remove from favourites" : "Add to favourites"}
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/image?edit=${asset.id}`}>
                <Pencil aria-hidden className="size-4" />
                Edit this image
              </Link>
            </Button>
            {g && (
              <Button variant="secondary" asChild>
                <Link href={`/image?from=${g.id}`}>
                  <RotateCcw aria-hidden className="size-4" />
                  Re-run these settings
                </Link>
              </Button>
            )}
            <Button variant="secondary" asChild>
              <a href={downloadUrl(asset.url, `framerald-${asset.id.slice(0, 8)}.png`)}>
                <Download aria-hidden className="size-4" />
                Download
              </a>
            </Button>

            {confirming ? (
              <div role="alert" className="flex flex-col gap-2 rounded-lg border border-destructive/50 p-3">
                <p className="text-sm">Delete this image? You can&apos;t restore it from the app.</p>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={confirmDelete} disabled={deleting}>
                    {deleting ? "Deleting" : "Delete"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={deleting}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => setConfirming(true)}>
                <Trash2 aria-hidden className="size-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
