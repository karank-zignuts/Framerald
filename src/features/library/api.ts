import { readJson } from "@/features/generations/api";
import type { LibraryPage } from "./types";
import { parseLibraryView, type LibraryView } from "./view";

export function fetchLibraryPage(opts: { cursor: string | null; view: LibraryView }): Promise<LibraryPage> {
  const { kind, favoritesOnly } = parseLibraryView(opts.view);
  const p = new URLSearchParams({ limit: "24" });
  if (opts.cursor) p.set("cursor", opts.cursor);
  if (favoritesOnly) p.set("favorites", "1");
  if (kind) p.set("kind", kind);
  return fetch(`/api/library?${p}`).then((r) => readJson<LibraryPage>(r));
}

export function setFavorite(assetId: string, isFavorite: boolean): Promise<void> {
  return fetch(`/api/assets/${assetId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ isFavorite }),
  }).then((r) => readJson<unknown>(r).then(() => undefined));
}

export function deleteAsset(assetId: string): Promise<void> {
  return fetch(`/api/assets/${assetId}`, { method: "DELETE" }).then((r) => readJson<unknown>(r).then(() => undefined));
}
