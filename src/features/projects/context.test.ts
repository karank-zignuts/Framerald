import { describe, expect, it } from "vitest";
import { scopeHref } from "./context";

describe("scopeHref", () => {
  it("puts a studio address inside the project and keeps its query", () => {
    expect(scopeHref("abc", "/video?from=1&x=2")).toBe("/p/abc/video?from=1&x=2");
    expect(scopeHref("abc", "/image")).toBe("/p/abc/image");
    expect(scopeHref("abc", "/library?view=videos")).toBe("/p/abc/library?view=videos");
  });
  it("leaves other addresses alone", () => {
    expect(scopeHref("abc", "/spend")).toBe("/spend");
    expect(scopeHref("abc", "https://example.com/image")).toBe("https://example.com/image");
    expect(scopeHref("abc", "/imagery")).toBe("/imagery");
  });
});
