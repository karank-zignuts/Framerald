export type LibraryView = "all" | "images" | "videos" | "favourites" | "trash";

const VIEWS: LibraryView[] = ["all", "images", "videos", "favourites", "trash"];

/** Reads `?view=` for the Library. Anything unknown means everything. */
export function parseLibraryView(value: string | null): {
  view: LibraryView;
  kind: "image" | "video" | null;
  favoritesOnly: boolean;
  trashed: boolean;
} {
  const view = (VIEWS as string[]).includes(value ?? "") ? (value as LibraryView) : "all";
  return {
    view,
    kind: view === "images" ? "image" : view === "videos" ? "video" : null,
    favoritesOnly: view === "favourites",
    trashed: view === "trash",
  };
}

/** The `?view=` value to write, or null for the default view (no parameter). */
export function libraryViewParam(view: LibraryView): string | null {
  return view === "all" ? null : view;
}
