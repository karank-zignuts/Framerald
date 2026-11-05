"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useLibrary } from "@/features/library/queries";
import type { AssetDto } from "@/features/library/types";

type Props = {
  onPick: (asset: AssetDto) => void;
  onClose: () => void;
};

/** Choose one of your Library images, for example as a first or last frame. */
export function ImagePickerDialog({ onPick, onClose }: Props) {
  const query = useLibrary("images");
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] w-[calc(100vw-1.5rem)] max-w-3xl gap-4 overflow-y-auto" data-testid="image-picker">
        <DialogTitle className="text-base font-medium">Choose an image</DialogTitle>
        <DialogDescription className="sr-only">Pick one of the images in your Library.</DialogDescription>

        {query.isPending && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="status" aria-label="Loading images">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="aspect-square rounded-md" />
            ))}
          </div>
        )}
        {query.isError && (
          <div role="alert" className="flex flex-col items-start gap-2 text-sm">
            <p>Couldn&apos;t load your images: {query.error.message}</p>
            <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
              Try again
            </Button>
          </div>
        )}
        {query.isSuccess && items.length === 0 && <p className="text-sm text-muted-foreground">No images in your Library yet. Make one in the Image studio first.</p>}

        {items.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {items.map((asset) => (
              <li key={asset.id}>
                <button
                  type="button"
                  onClick={() => onPick(asset)}
                  aria-label={`Use image: ${(asset.generation?.prompt ?? "image").slice(0, 60)}`}
                  className="block aspect-square w-full overflow-hidden rounded-md border border-border bg-secondary transition-colors duration-fast hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.thumbnailUrl} alt="" loading="lazy" className="size-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {query.hasNextPage && (
          <Button variant="secondary" size="sm" className="w-fit" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {query.isFetchingNextPage ? "Loading" : "Load more"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
