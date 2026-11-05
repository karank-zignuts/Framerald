"use client";

import { ArrowDownUp, Check, UploadCloud, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Anchor as PopoverAnchor } from "@radix-ui/react-popover";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLibrary, type LibraryFilters } from "@/features/library/queries";
import type { AssetDto } from "@/features/library/types";
import { titleFromPrompt } from "@/features/view/title";
import { cn } from "@/lib/utils";

type Tab = "uploads" | "generations" | "favourites";
const TABS: { id: Tab; label: string }[] = [
  { id: "uploads", label: "Uploads" },
  { id: "generations", label: "Generations" },
  { id: "favourites", label: "Favourites" },
];
const RECENT = 12;
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Props = {
  trigger: React.ReactNode;
  /** Ids already chosen. */
  selectedIds: string[];
  /** How many more can be added. */
  room: number;
  onPick: (asset: AssetDto) => void;
  onUnpick: (id: string) => void;
  /** Opens the file dialog. The studio does the upload, so the new image lands in its list. */
  onUploadClick: () => void;
  uploading: number;
  /** The element to open above (the whole dock), instead of the button that was pressed. */
  anchorRef?: React.RefObject<HTMLElement | null>;
};

/** A panel above the composer to choose reference images: new uploads, recent uploads, earlier generations, favourites. */
export function MediaPicker({ trigger, selectedIds, room, onPick, onUnpick, onUploadClick, uploading, anchorRef }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("uploads");
  const [scope, setScope] = useState<"recent" | "all">("recent");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");

  const filters: LibraryFilters = { order, source: tab === "uploads" ? "upload" : "generated", limit: 24 };
  const query = useLibrary(tab === "favourites" ? "favourites" : "images", filters);
  const all = query.data?.pages.flatMap((p) => p.items) ?? [];
  const items = tab === "uploads" && scope === "recent" ? all.slice(0, RECENT) : all;
  const canLoadMore = query.hasNextPage && !(tab === "uploads" && scope === "recent");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {anchorRef && <PopoverAnchor virtualRef={anchorRef as React.RefObject<HTMLElement>} />}
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent side="top" align="start" sideOffset={16} collisionPadding={16} className="flex w-[min(56rem,calc(100vw-2rem))] flex-col gap-0 overflow-hidden rounded-2xl p-0">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div role="tablist" aria-label="Where to pick from" className="flex items-center gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "h-9 rounded-full px-4 text-sm transition-colors duration-fast",
                  tab === t.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  focusRing,
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Button type="button" variant="ghost" size="icon" className="ml-auto" aria-label="Close" onClick={() => setOpen(false)}>
            <X aria-hidden className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          {tab === "uploads" && (
            <div role="group" aria-label="How much to show" className="flex items-center gap-1">
              {(["recent", "all"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={scope === s}
                  onClick={() => setScope(s)}
                  className={cn(
                    "h-8 rounded-full px-3 text-sm capitalize transition-colors duration-fast",
                    scope === s ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                    focusRing,
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger className={cn("ml-auto inline-flex h-8 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground transition-colors duration-fast hover:bg-secondary hover:text-foreground", focusRing)}>
              <ArrowDownUp aria-hidden className="size-4" />
              Sort by
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuRadioGroup value={order} onValueChange={(v) => setOrder(v as "newest" | "oldest")}>
                <DropdownMenuRadioItem value="newest">Last created</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="oldest">First created</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="max-h-[min(55vh,26rem)] overflow-y-auto p-3">
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(7.5rem,1fr))]">
            {tab === "uploads" && (
              <button
                type="button"
                onClick={onUploadClick}
                disabled={room - uploading <= 0}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/50 text-sm text-foreground transition-colors duration-fast hover:bg-secondary/70 disabled:opacity-50",
                  focusRing,
                )}
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-background">
                  <UploadCloud aria-hidden className="size-5" />
                </span>
                Upload media
              </button>
            )}
            {Array.from({ length: uploading }, (_, i) => (
              <div key={`up-${i}`} role="status" aria-label="Uploading" className="skeleton aspect-square rounded-xl" />
            ))}
            {items.map((asset) => {
              const selected = selectedIds.includes(asset.id);
              const name = titleFromPrompt(asset.generation?.prompt) === "Untitled" ? "Uploaded image" : titleFromPrompt(asset.generation?.prompt);
              return (
                <button
                  key={asset.id}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${selected ? "Remove" : "Use"} ${name}`}
                  disabled={!selected && room <= 0}
                  onClick={() => (selected ? onUnpick(asset.id) : onPick(asset))}
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded-xl border bg-background transition-colors duration-fast disabled:opacity-40",
                    selected ? "border-brand" : "border-border hover:border-foreground/40",
                    focusRing,
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.thumbnailUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
                  {selected && (
                    <span aria-hidden className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-brand text-brand-foreground">
                      <Check className="size-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {query.isPending && <p role="status" className="p-4 text-center text-sm text-muted-foreground">Loading</p>}
          {query.isError && (
            <p role="alert" className="p-4 text-center text-sm">
              Couldn&apos;t load these. <button type="button" className="underline" onClick={() => void query.refetch()}>Try again</button>
            </p>
          )}
          {query.isSuccess && items.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              {tab === "uploads" ? "No uploads yet. Add one with Upload media." : tab === "favourites" ? "No favourites yet. Tap the heart on an image." : "Nothing generated yet."}
            </p>
          )}
          {canLoadMore && (
            <div className="flex justify-center pt-3">
              <Button type="button" variant="secondary" size="sm" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                {query.isFetchingNextPage ? "Loading" : "Load more"}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
