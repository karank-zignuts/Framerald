import { readJson } from "@/features/generations/api";
import type { LibraryPage } from "./types";
import { parseLibraryView, type LibraryView } from "./view";

export function fetchLibraryPage(opts: {
  cursor: string | null;
  view: LibraryView;
  q?: string | null;
  projectId?: string | null;
  source?: "generated" | "upload";
  order?: "newest" | "oldest";
  limit?: number;
}): Promise<LibraryPage> {
  const { kind, favoritesOnly } = parseLibraryView(opts.view);
  const p = new URLSearchParams({ limit: String(opts.limit ?? 24) });
  if (opts.cursor) p.set("cursor", opts.cursor);
  if (favoritesOnly) p.set("favorites", "1");
  if (kind) p.set("kind", kind);
  if (opts.q) p.set("q", opts.q);
  if (opts.projectId) p.set("project", opts.projectId);
  if (opts.source) p.set("source", opts.source);
  if (opts.order) p.set("order", opts.order);
  return fetch(`/api/library?${p}`).then((r) => readJson<LibraryPage>(r));
}

export function setFavorite(assetId: string, isFavorite: boolean): Promise<void> {
  return fetch(`/api/assets/${assetId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ isFavorite }),
  }).then((r) => readJson<unknown>(r).then(() => undefined));
}

export function moveAssetRequest(assetId: string, projectId: string | null): Promise<void> {
  return fetch(`/api/assets/${assetId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId }),
  }).then((r) => readJson<unknown>(r).then(() => undefined));
}

export function deleteAsset(assetId: string): Promise<void> {
  return fetch(`/api/assets/${assetId}`, { method: "DELETE" }).then((r) => readJson<unknown>(r).then(() => undefined));
}

/** Pass null to go back to the name made from the prompt. */
export function renameAssetRequest(assetId: string, name: string | null): Promise<void> {
  return fetch(`/api/assets/${assetId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  }).then((r) => readJson<unknown>(r).then(() => undefined));
}
