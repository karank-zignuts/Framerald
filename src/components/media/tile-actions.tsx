"use client";

import { CornerDownLeft, Download, Film, Heart, MoreVertical, Pencil, Copy, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { AssetDto } from "@/features/library/types";
import { useScopedHref } from "@/features/projects/context";
import { renameAsset } from "@/features/view/names";
import { downloadUrl, extensionFor } from "@/lib/format";
import { cn } from "@/lib/utils";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const iconButton = cn(
  "flex size-8 items-center justify-center rounded-md text-foreground transition-colors duration-fast hover:bg-secondary",
  focusRing,
);
// Shown on hover or keyboard focus; always on touch screens, which have no hover.
const hoverOnly = "opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100 data-[state=open]:opacity-100";

type Props = {
  asset: AssetDto;
  name: string;
  onFavorite: (value: boolean) => void;
  /** Without it the menu has no Delete. */
  onDelete?: () => Promise<void> | void;
  /** Saves a name (null clears it). Without it, or when it fails, the name is kept in this browser. */
  onRename?: (name: string | null) => Promise<void>;
};

/** The hover toolbar on a tile: favourite, reuse, and a menu with the rest. */
export function TileActions({ asset, name, onFavorite, onDelete, onRename }: Props) {
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const scoped = useScopedHref();
  const g = asset.generation;
  const isVideo = asset.kind === "video";
  const reuseHref = g ? scoped(isVideo ? `/video?from=${g.id}` : `/image?from=${g.id}`) : null;

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(g?.prompt ?? "");
      toast.success("Prompt copied.");
    } catch {
      toast.error("Couldn't copy. Your browser blocked it.");
    }
  }

  return (
    <>
      <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-lg p-0.5 group-hover:bg-background/75 group-hover:backdrop-blur group-focus-within:bg-background/75 pointer-coarse:bg-background/75">
        <button
          type="button"
          onClick={() => onFavorite(!asset.isFavorite)}
          aria-pressed={asset.isFavorite}
          aria-label={asset.isFavorite ? "Remove from favourites" : "Add to favourites"}
          className={cn(iconButton, asset.isFavorite ? "bg-background/75" : hoverOnly)}
        >
          <Heart aria-hidden className={cn("size-4", asset.isFavorite && "fill-brand text-brand")} />
        </button>
        {reuseHref && (
          <Link href={reuseHref} aria-label="Reuse prompt and references" title="Reuse prompt and references" className={cn(iconButton, hoverOnly)}>
            <CornerDownLeft aria-hidden className="size-4" />
          </Link>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="More actions" title="More" className={cn(iconButton, hoverOnly)}>
            <MoreVertical aria-hidden className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-2">
            <DropdownMenuItem onSelect={() => onFavorite(!asset.isFavorite)}>
              <Heart aria-hidden className="mr-2 size-4" />
              {asset.isFavorite ? "Remove favourite" : "Favourite"}
            </DropdownMenuItem>
            {reuseHref && (
              <DropdownMenuItem asChild>
                <Link href={reuseHref}>
                  <CornerDownLeft aria-hidden className="mr-2 size-4" />
                  Reuse prompt and references
                </Link>
              </DropdownMenuItem>
            )}
            {!isVideo && (
              <DropdownMenuItem asChild>
                <Link href={scoped(`/video?first=${asset.id}`)}>
                  <Film aria-hidden className="mr-2 size-4" />
                  Animate this image
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={downloadUrl(asset.url, `framerald-${asset.id.slice(0, 8)}.${extensionFor(asset.mimeType)}`)}>
                <Download aria-hidden className="mr-2 size-4" />
                Download
              </a>
            </DropdownMenuItem>
            {g && (
              <DropdownMenuItem onSelect={() => void copyPrompt()}>
                <Copy aria-hidden className="mr-2 size-4" />
                Copy prompt
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() => {
                setDraftName(name);
                setRenaming(true);
              }}
            >
              <Pencil aria-hidden className="mr-2 size-4" />
              Rename
            </DropdownMenuItem>
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setDeleting(true)} className="bg-destructive/15 focus:bg-destructive/25">
                  <Trash2 aria-hidden className="mr-2 size-4 text-destructive" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>Leave it empty to go back to the name made from the prompt.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const clean = draftName.trim() || null;
              setRenaming(false);
              try {
                if (!onRename) throw new Error("no saver");
                await onRename(clean);
                renameAsset(asset.id, ""); // the saved name is used now; drop any older browser-only one
              } catch {
                renameAsset(asset.id, clean ?? "");
                toast.info("Saved in this browser only. Apply the latest database update to keep names everywhere.");
              }
            }}
          >
            <Input aria-label="Name" value={draftName} onChange={(e) => setDraftName(e.target.value)} maxLength={80} autoFocus />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setRenaming(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-brand text-brand-foreground hover:bg-brand-strong">
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this {isVideo ? "clip" : "image"}?</DialogTitle>
            <DialogDescription>You can&apos;t restore it from the app.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onDelete?.();
                  setDeleting(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Deleting" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
