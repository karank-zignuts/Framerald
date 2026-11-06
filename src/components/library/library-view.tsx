"use client";

import { LayoutGrid, RotateCcw, Search, Star, Trash2, Video } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AssetDialog } from "@/components/media/asset-dialog";
import { AssetTile } from "@/components/media/asset-tile";
import { Masonry } from "@/components/media/masonry";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/ix-segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssetActions, useLibrary } from "@/features/library/queries";
import { normalizeSearch } from "@/features/library/search";
import type { AssetDto } from "@/features/library/types";
import { libraryViewParam, parseLibraryView, type LibraryView as ViewName } from "@/features/library/view";
import { useProjectId, useScopedHref } from "@/features/projects/context";
import { UNSORTED } from "@/features/projects/schemas";
import { useAssetName } from "@/features/view/names";
import { TILE_WIDTH, useViewSettings } from "@/features/view/settings";

// Fixed column counts use minmax(0, 1fr) tracks, so a wide image can't stretch a column.
const GRID = "grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6";

export function LibraryView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { view } = parseLibraryView(params.get("view"));
  const q = normalizeSearch(params.get("q"));
  const projectId = useProjectId();
  const scoped = useScopedHref();
  const unsorted = projectId === UNSORTED;
  const { size } = useViewSettings();

  const query = useLibrary(view, unsorted ? { q, unsorted: true } : { q, projectId });
  const actions = useAssetActions();
  const [openId, setOpenId] = useState<string | null>(null);
  // A copy of the open item. If moving it takes it out of the current filter, the dialog stays open on this copy.
  const [pinned, setPinned] = useState<AssetDto | null>(null);
  const [search, setSearch] = useState(params.get("q") ?? "");

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const openAsset = items.find((a) => a.id === openId) ?? (pinned && pinned.id === openId ? pinned : null);
  const filtered = Boolean(q);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params);
      if (value) next.set(key, value);
      else next.delete(key);
      router.replace(next.size ? `${pathname}?${next}` : pathname);
    },
    [params, pathname, router],
  );

  // Typing updates the URL a moment after you stop, so each keystroke isn't a request.
  useEffect(() => {
    const timer = setTimeout(() => {
      const clean = normalizeSearch(search);
      if ((clean ?? "") !== (q ?? "")) setParam("q", clean);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, q, setParam]);

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

  const favorite = (asset: AssetDto, value: boolean) =>
    actions.favorite(asset, value).catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn't update the favourite."));

  async function remove(asset: AssetDto) {
    try {
      await actions.remove(asset);
      setOpenId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete that item.");
    }
  }

  async function restore(asset: AssetDto) {
    try {
      await actions.restore(asset);
      toast.success("Restored.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't restore that item.");
    }
  }

  async function move(asset: AssetDto, target: string | null) {
    try {
      await actions.move(asset, target);
      setPinned({ ...asset, projectId: target });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't move that item.");
    }
  }

  function clearFilters() {
    setSearch("");
    const next = new URLSearchParams(params);
    next.delete("q");
    router.replace(next.size ? `${pathname}?${next}` : pathname);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:overflow-y-auto">
      <header className="flex flex-col gap-3 px-5 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-medium text-foreground">Library</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-48 flex-1 sm:max-w-xs">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Search prompts"
              placeholder="Search prompts"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={100}
              className="pl-9"
            />
          </div>
          <div className="w-full max-w-sm">
            <SegmentedControl
              label="Show"
              value={view}
              onValueChange={(v) => setParam("view", libraryViewParam(v as ViewName))}
              options={[
                { value: "all", label: "All" },
                { value: "images", label: "Images" },
                { value: "videos", label: "Videos" },
                { value: "favourites", label: "Favourites" },
                { value: "trash", label: "Trash" },
              ]}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col p-5">
        {query.isPending && (
          <div className={GRID} role="status" aria-label="Loading">
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
            {filtered ? (
              <EmptyState
                icon={<Search aria-hidden className="size-6" />}
                title="No matches"
                description="Nothing fits this search. Try different words, or clear the search."
                action={
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : view === "trash" ? (
              <EmptyState
                icon={<Trash2 aria-hidden className="size-6" />}
                title="The trash is empty"
                description="Images and clips you delete wait here, and you can bring them back."
              />
            ) : view === "favourites" ? (
              <EmptyState
                icon={<Star aria-hidden className="size-6" />}
                title="No favourites yet"
                description="Tap the star on an image or video to keep it here."
              />
            ) : view === "videos" ? (
              <EmptyState
                icon={<Video aria-hidden className="size-6" />}
                title="No videos yet"
                description="Clips you make in the Video studio are saved here."
                action={
                  <Button asChild variant="secondary" size="sm">
                    <Link href={scoped("/video")}>Open Video</Link>
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<LayoutGrid aria-hidden className="size-6" />}
                title={view === "images" ? "No images yet" : "Nothing here yet"}
                description="Everything you make in the studios is saved here."
                action={
                  <Button asChild variant="secondary" size="sm">
                    <Link href={scoped("/image")}>Open Image</Link>
                  </Button>
                }
              />
            )}
          </div>
        )}

        {items.length > 0 && view === "trash" && (
          <div className={GRID} data-testid="trash-grid">
            {items.map((asset) => (
              <TrashTile key={asset.id} asset={asset} onRestore={() => restore(asset)} />
            ))}
          </div>
        )}

        {items.length > 0 && view !== "trash" && (
          <>
            <Masonry
              data-testid="library-grid"
              columnWidth={TILE_WIDTH[size]}
              items={items.map((asset, index) => ({
                id: asset.id,
                ratio: asset.width && asset.height ? asset.width / asset.height : asset.kind === "video" ? 16 / 9 : 1,
                node: (
                  <AssetTile
                    asset={asset}
                    eager={index < 4}
                    onOpen={() => {
                      setOpenId(asset.id);
                      setPinned(asset);
                    }}
                    onFavorite={(v) => void favorite(asset, v)}
                    onDelete={() => remove(asset)}
                    onRename={(name) => actions.rename(asset, name)}
                  />
                ),
              }))}
            />
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
          onMove={(target) => move(openAsset, target)}
        />
      )}
    </div>
  );
}

/** A deleted item in the trash: a dimmed picture, its name, and Restore. */
function TrashTile({ asset, onRestore }: { asset: AssetDto; onRestore: () => void }) {
  const name = useAssetName(asset);
  return (
    <div className="flex flex-col gap-2" data-testid="trash-tile">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.thumbnailUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover opacity-60" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm text-muted-foreground">{name}</span>
        <Button variant="secondary" size="sm" onClick={onRestore} aria-label={`Restore ${name}`}>
          <RotateCcw aria-hidden className="size-3.5" />
          Restore
        </Button>
      </div>
    </div>
  );
}
