import { readJson } from "@/features/generations/api";
import type { LibraryPage } from "./types";

export function fetchLibraryPage(opts: { cursor: string | null; favoritesOnly: boolean }): Promise<LibraryPage> {
  const p = new URLSearchParams({ limit: "24" });
  if (opts.cursor) p.set("cursor", opts.cursor);
  if (opts.favoritesOnly) p.set("favorites", "1");
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
