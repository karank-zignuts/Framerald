"use client";

import { LayoutGrid, Star } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AssetDialog } from "@/components/media/asset-dialog";
import { AssetTile } from "@/components/media/asset-tile";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/ix-segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssetActions, useLibrary } from "@/features/library/queries";
import type { AssetDto } from "@/features/library/types";

// Fixed column counts use minmax(0, 1fr) tracks, so a wide image can't stretch a column.
const GRID = "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6";

export function LibraryView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const favoritesOnly = params.get("view") === "favourites";

  const query = useLibrary(favoritesOnly);
  const actions = useAssetActions();
  const [openId, setOpenId] = useState<string | null>(null);

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const openAsset = items.find((a) => a.id === openId) ?? null;

  // Load the next page when the sentinel scrolls into view.
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

  function setView(view: string) {
    const next = new URLSearchParams(params);
    if (view === "favourites") next.set("view", "favourites");
    else next.delete("view");
    router.replace(next.size ? `${pathname}?${next}` : pathname);
  }

  const favorite = (asset: AssetDto, value: boolean) =>
    actions.favorite(asset, value).catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn't update the favourite."));

  async function remove(asset: AssetDto) {
    try {
      await actions.remove(asset);
      setOpenId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete that image.");
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:overflow-y-auto">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pb-2 pt-5">
        <h1 className="text-lg font-medium text-foreground">Library</h1>
        <div className="w-56">
          <SegmentedControl
            label="Show"
            value={favoritesOnly ? "favourites" : "all"}
            onValueChange={setView}
            options={[
              { value: "all", label: "All" },
              { value: "favourites", label: "Favourites" },
            ]}
          />
        </div>
      </header>

      <div className="flex flex-1 flex-col p-5">
        {query.isPending && (
          <div className={GRID} role="status" aria-label="Loading images">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-lg" />
            ))}
          </div>
        )}

        {query.isError && (
          <div role="alert" className="flex max-w-md flex-col items-start gap-3 rounded-lg border border-destructive/50 p-4">
            <p className="text-sm">Couldn&apos;t load the library: {query.error.message}</p>
            <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
              Try again
            </Button>
          </div>
        )}

        {query.isSuccess && items.length === 0 && (
          <div className="flex flex-1 items-center justify-center">
            {favoritesOnly ? (
              <EmptyState
                icon={<Star aria-hidden className="size-6" />}
                title="No favourites yet"
                description="Tap the star on an image to keep it here."
              />
            ) : (
              <EmptyState
                icon={<LayoutGrid aria-hidden className="size-6" />}
                title="No images yet"
                description="Everything you make in the studios is saved here."
                action={
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/image">Open Image</Link>
                  </Button>
                }
              />
            )}
          </div>
        )}

        {items.length > 0 && (
          <>
            <div className={GRID} data-testid="library-grid">
              {items.map((asset) => (
                <AssetTile key={asset.id} asset={asset} fit="square" onOpen={() => setOpenId(asset.id)} onFavorite={(v) => void favorite(asset, v)} />
              ))}
            </div>
            <div ref={sentinel} className="flex justify-center py-6">
              {hasNextPage && (
                <Button variant="secondary" size="sm" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? "Loading" : "Load more"}
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {openAsset && (
        <AssetDialog
          key={openAsset.id}
          asset={openAsset}
          onClose={() => setOpenId(null)}
          onFavorite={(v) => void favorite(openAsset, v)}
          onDelete={() => remove(openAsset)}
        />
      )}
    </div>
  );
}
