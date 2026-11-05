import { describe, expect, it } from "vitest";
import { libraryViewParam, parseLibraryView } from "./view";

describe("parseLibraryView", () => {
  it("reads each view from the URL value", () => {
    expect(parseLibraryView("images")).toEqual({ view: "images", kind: "image", favoritesOnly: false });
    expect(parseLibraryView("videos")).toEqual({ view: "videos", kind: "video", favoritesOnly: false });
    expect(parseLibraryView("favourites")).toEqual({ view: "favourites", kind: null, favoritesOnly: true });
  });
  it("falls back to everything for no value or nonsense", () => {
    expect(parseLibraryView(null)).toEqual({ view: "all", kind: null, favoritesOnly: false });
    expect(parseLibraryView("whatever")).toEqual({ view: "all", kind: null, favoritesOnly: false });
  });
  it("writes the URL value back, with nothing for the default view", () => {
    expect(libraryViewParam("all")).toBeNull();
    expect(libraryViewParam("videos")).toBe("videos");
  });
});
