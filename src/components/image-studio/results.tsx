"use client";

import { Image as ImageIcon, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import type { useLibrary } from "@/features/library/queries";
import { Button } from "@/components/ui/button";
import { Masonry, type MasonryItem } from "@/components/media/masonry";
import { TILE_WIDTH, useViewSettings } from "@/features/view/settings";
import { EmptyState } from "@/components/ui/empty-state";
import { GeneratingTile } from "@/components/media/generating";
import { AssetTile } from "@/components/media/asset-tile";
import { MODELS } from "@/lib/ai/models";
import { formatCost } from "@/lib/format";
import type { GenerateInput } from "@/features/generations/api";
import type { GenerationResult } from "@/features/generations/types";
import type { AssetDto } from "@/features/library/types";
import { PageLoader } from "@/components/loading/ripple";
import { Ripple } from "@/components/loading/ripple";

export type Batch = {
  key: string;
  input: GenerateInput;
  status: "running" | "done" | "failed";
  result?: GenerationResult;
  error?: string;
};

type Props = {
  /** The project's earlier images. */
  history: ReturnType<typeof useLibrary>;
  batches: Batch[];
  onOpen: (asset: AssetDto) => void;
  onFavorite: (asset: AssetDto, value: boolean) => void;
  onDelete: (asset: AssetDto) => Promise<void>;
  onRename: (asset: AssetDto, name: string | null) => Promise<void>;
  onRetry: (batch: Batch) => void;
};

function ratioOf(input: GenerateInput) {
  const [w, h] = input.aspectRatio.split(":").map(Number);
  return w / h;
}

/** The same shape-keeping masonry, as plain CSS columns, for the grouped view where each batch is small. */
function Columns({ width, children }: { width: number; children: React.ReactNode }) {
  return (
    <div style={{ columnWidth: width, columnGap: "1rem" }} className="[&>*]:mb-4 [&>*]:break-inside-avoid">
      {children}
    </div>
  );
}

const ratioOfAsset = (a: AssetDto) => (a.width && a.height ? a.width / a.height : a.kind === "video" ? 16 / 9 : 1);

/** Loads the next page of history when this scrolls into view. */
function LoadMore({ query }: { query: Props["history"] }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  return (
    <div ref={sentinel} className="flex justify-center py-4">
      {hasNextPage && (
        <Button variant="secondary" size="sm" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? <><Ripple label="Loading more" className="size-4" /> Loading</> : "Load more"}
        </Button>
      )}
    </div>
  );
}

function FailedBatch({ batch, onRetry }: { batch: Batch; onRetry: (batch: Batch) => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/50 p-4">
      <p className="line-clamp-1 text-xs text-muted-foreground">{batch.input.prompt}</p>
      <p className="text-sm">{batch.error ?? "The model didn't return an image."}</p>
      <Button variant="secondary" size="sm" onClick={() => onRetry(batch)}>
        <RotateCcw aria-hidden className="size-3.5" />
        Try again
      </Button>
    </div>
  );
}

export function Results({ history, batches, onOpen, onFavorite, onDelete, onRename, onRetry }: Props) {
  const view = useViewSettings();
  const width = TILE_WIDTH[view.size];

  const historyItems = history.data?.pages.flatMap((p) => p.items) ?? [];

  if (view.mode === "grid" && batches.length === 0 && history.isPending) {
    return <PageLoader />;
  }

  if (batches.length === 0 && (view.mode === "batch" || historyItems.length === 0)) {
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

  const tile = (asset: AssetDto, eager: boolean) => (
    <AssetTile
      key={asset.id}
      asset={asset}
      eager={eager}
      onOpen={() => onOpen(asset)}
      onFavorite={(v) => onFavorite(asset, v)}
      onDelete={() => onDelete(asset)}
      onRename={(name) => onRename(asset, name)}
    />
  );

  if (view.mode === "grid") {
    const failed = batches.filter((b) => b.status === "failed");
    const historyIds = new Set(historyItems.map((a) => a.id));
    // New images are shown before the history has caught up with them.
    const fresh = batches.flatMap((b) => (b.status === "done" ? (b.result?.assets ?? []) : [])).filter((a) => !historyIds.has(a.id));
    const items: MasonryItem[] = [
      ...batches.flatMap((batch) =>
        batch.status === "running"
          ? Array.from({ length: batch.input.count }, (_, i): MasonryItem => ({
              id: `${batch.key}-${i}`,
              ratio: ratioOf(batch.input),
              node: (
                <div role="status" aria-label="Generating" className="size-full">
                  <GeneratingTile ratio={ratioOf(batch.input)} prompt={batch.input.prompt} />
                </div>
              ),
            }))
          : [],
      ),
      ...[...fresh, ...historyItems].map((asset, i): MasonryItem => ({ id: asset.id, ratio: ratioOfAsset(asset), node: tile(asset, i < 4) })),
    ];
    return (
      <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-4 p-5" data-testid="results">
        {failed.map((b) => (
          <FailedBatch key={b.key} batch={b} onRetry={onRetry} />
        ))}
        <Masonry items={items} columnWidth={width} data-testid="history-grid" />
        <LoadMore query={history} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-10 p-5" data-testid="results">
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
              <div role="status" aria-label="Generating">
                <Columns width={width}>
                  {Array.from({ length: input.count }, (_, i) => (
                    <GeneratingTile key={i} ratio={ratioOf(input)} prompt={input.prompt} />
                  ))}
                </Columns>
              </div>
            )}

            {batch.status === "failed" && <FailedBatch batch={batch} onRetry={onRetry} />}

            {batch.status === "done" && (
              <>
                {failedCount > 0 && batch.result?.error && (
                  <p role="status" className="text-xs text-muted-foreground">
                    {failedCount} of {input.count} didn&apos;t finish: {batch.result.error}
                  </p>
                )}
                <Columns width={width}>{assets.map((a) => tile(a, batch === batches[0]))}</Columns>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
