"use client";

import { Image as ImageIcon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetTile } from "@/components/media/asset-tile";
import { MODELS } from "@/lib/ai/models";
import { formatCost } from "@/lib/format";
import type { GenerateInput } from "@/features/generations/api";
import type { GenerationResult } from "@/features/generations/types";
import type { AssetDto } from "@/features/library/types";

export type Batch = {
  key: string;
  input: GenerateInput;
  status: "running" | "done" | "failed";
  result?: GenerationResult;
  error?: string;
};

type Props = {
  batches: Batch[];
  onOpen: (asset: AssetDto) => void;
  onFavorite: (asset: AssetDto, value: boolean) => void;
  onRetry: (batch: Batch) => void;
};

const GRID: Record<number, string> = {
  1: "grid-cols-1 max-w-xl",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 xl:grid-cols-4",
};

function ratioOf(input: GenerateInput) {
  const [w, h] = input.aspectRatio.split(":").map(Number);
  return w / h;
}

export function Results({ batches, onOpen, onFavorite, onRetry }: Props) {
  if (batches.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          icon={<ImageIcon aria-hidden className="size-6" />}
          title="Your images appear here"
          description="Write a prompt and press Generate. Everything you make is also saved in the Library."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 p-5 lg:overflow-y-auto" data-testid="results">
      {batches.map((batch) => {
        const { input } = batch;
        const model = MODELS.image[input.model];
        const assets = batch.result?.assets ?? [];
        const failedCount = input.count - assets.length;
        return (
          <section key={batch.key} aria-label={`Results for: ${input.prompt.slice(0, 60)}`} className="flex flex-col gap-3" data-testid="batch">
            <header className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="line-clamp-2 text-sm text-foreground">{input.prompt}</p>
                <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span>{model.label}</span>
                  <span>{input.aspectRatio}</span>
                  <span>{input.imageSize}</span>
                  {input.referenceAssetIds && input.referenceAssetIds.length > 0 && <span>Edit</span>}
                </p>
              </div>
              {batch.status === "done" && (
                <p className="shrink-0 text-sm tabular-nums text-muted-foreground" data-testid="batch-cost">
                  {formatCost(batch.result?.costUsd ?? null)}
                </p>
              )}
            </header>

            {batch.status === "running" && (
              <div className={`grid gap-3 ${GRID[input.count]}`} role="status" aria-label="Generating">
                {Array.from({ length: input.count }, (_, i) => (
                  <Skeleton key={i} className="w-full rounded-lg" style={{ aspectRatio: ratioOf(input) }} />
                ))}
              </div>
            )}

            {batch.status === "failed" && (
              <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/50 p-4">
                <p className="text-sm">{batch.error ?? "The model didn't return an image."}</p>
                <Button variant="secondary" size="sm" onClick={() => onRetry(batch)}>
                  <RotateCcw aria-hidden className="size-3.5" />
                  Try again
                </Button>
              </div>
            )}

            {batch.status === "done" && (
              <>
                {failedCount > 0 && batch.result?.error && (
                  <p role="status" className="text-xs text-muted-foreground">
                    {failedCount} of {input.count} didn&apos;t finish: {batch.result.error}
                  </p>
                )}
                <div className={`grid gap-3 ${GRID[Math.max(1, assets.length)] ?? GRID[4]}`}>
                  {assets.map((asset) => (
                    <AssetTile key={asset.id} asset={asset} onOpen={() => onOpen(asset)} onFavorite={(v) => onFavorite(asset, v)} />
                  ))}
                </div>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}

