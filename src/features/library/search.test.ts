import { describe, expect, it } from "vitest";
import { likePattern, normalizeSearch } from "./search";

describe("normalizeSearch", () => {
  it("trims and collapses whitespace, and treats nothing as no search", () => {
    expect(normalizeSearch("  red   door ")).toBe("red door");
    expect(normalizeSearch("   ")).toBeNull();
    expect(normalizeSearch("")).toBeNull();
    expect(normalizeSearch(null)).toBeNull();
  });
  it("cuts a very long search to 100 characters", () => {
    expect(normalizeSearch("x".repeat(300))).toHaveLength(100);
  });
});

describe("likePattern", () => {
  it("wraps the text so it matches anywhere", () => {
    expect(likePattern("red door")).toBe("%red door%");
  });
  it("escapes the characters LIKE treats as wildcards, so they match literally", () => {
    expect(likePattern("100%")).toBe("%100\\%%");
    expect(likePattern("a_b")).toBe("%a\\_b%");
    expect(likePattern("back\\slash")).toBe("%back\\\\slash%");
  });
  it("leaves filter-syntax characters alone, since the value is never put in a filter string", () => {
    expect(likePattern("a,b)c(d.e")).toBe("%a,b)c(d.e%");
  });
});
