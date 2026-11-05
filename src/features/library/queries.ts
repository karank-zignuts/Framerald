import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { deleteAsset, fetchLibraryPage, moveAssetRequest, renameAssetRequest, setFavorite } from "./api";
import type { AssetDto, LibraryPage } from "./types";
import type { LibraryView } from "./view";

export type LibraryFilters = {
  q?: string | null;
  projectId?: string | null;
  source?: "generated" | "upload";
  order?: "newest" | "oldest";
  limit?: number;
};

export const libraryKeys = {
  all: ["library"] as const,
  list: (view: LibraryView, filters: LibraryFilters = {}) => ["library", "list", { view, ...filters }] as const,
};

export function useLibrary(view: LibraryView, filters: LibraryFilters = {}) {
  return useInfiniteQuery({
    queryKey: libraryKeys.list(view, filters),
    queryFn: ({ pageParam }) => fetchLibraryPage({ cursor: pageParam, view, ...filters }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    // Signed image links last an hour. Refetching on focus after 10 minutes keeps a long-open tab from showing broken thumbnails.
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: true,
  });
}

type Cache = InfiniteData<LibraryPage, string | null>;

/** Favourite and delete with the grid updating at once and rolling back on failure. */
export function useAssetActions() {
  const qc = useQueryClient();

  const mapPages = (fn: (items: AssetDto[]) => AssetDto[]) =>
    qc.setQueriesData<Cache>({ queryKey: libraryKeys.all }, (old) =>
      old ? { ...old, pages: old.pages.map((p) => ({ ...p, items: fn(p.items) })) } : old,
    );

  return {
    async favorite(asset: AssetDto, value: boolean) {
      const snapshot = qc.getQueriesData<Cache>({ queryKey: libraryKeys.all });
      mapPages((items) => items.map((a) => (a.id === asset.id ? { ...a, isFavorite: value } : a)));
      try {
        await setFavorite(asset.id, value);
        // The favourites view must gain or lose this image.
        await qc.invalidateQueries({ queryKey: ["library", "list", { view: "favourites" }] });
      } catch (error) {
        for (const [key, data] of snapshot) qc.setQueryData(key, data);
        throw error;
      }
    },
    /** Moves an item to a project (or none). Every list is refetched, since filters may now include or drop it. */
    async move(asset: AssetDto, projectId: string | null) {
      await moveAssetRequest(asset.id, projectId);
      await qc.invalidateQueries({ queryKey: libraryKeys.all });
    },
    /** Saves the name, then shows it. Throws when it can't be saved (for example before the migration is applied). */
    async rename(asset: AssetDto, name: string | null) {
      await renameAssetRequest(asset.id, name);
      mapPages((items) => items.map((a) => (a.id === asset.id ? { ...a, name } : a)));
    },
    async remove(asset: AssetDto) {
      const snapshot = qc.getQueriesData<Cache>({ queryKey: libraryKeys.all });
      mapPages((items) => items.filter((a) => a.id !== asset.id));
      try {
        await deleteAsset(asset.id);
      } catch (error) {
        for (const [key, data] of snapshot) qc.setQueryData(key, data);
        throw error;
      }
    },
  };
}
