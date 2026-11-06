import { describe, expect, it } from "vitest";
import { layoutMasonry } from "./masonry";

describe("layoutMasonry", () => {
  it("fits as many columns as the width allows and shares the width evenly", () => {
    // 3 columns of 240 with two gaps of 16 is 752. A fourth would need 1008.
    const l = layoutMasonry([1, 1, 1], 1000, 240, 16);
    expect(l.columns).toBe(3);
    expect(l.items[0].width).toBeCloseTo((1000 - 32) / 3, 5);
    expect(l.items.map((i) => Math.round(i.x))).toEqual([0, 339, 677]);
  });

  it("keeps every shape's own proportions", () => {
    const l = layoutMasonry([1, 0.5, 2], 1000, 240, 16);
    for (const [i, ratio] of [1, 0.5, 2].entries()) expect(l.items[i].width / l.items[i].height).toBeCloseTo(ratio, 5);
  });

  it("puts each next item in the shortest column", () => {
    // A tall one, then two wide ones: the wide ones both go beside it before anything stacks under the tall one.
    const l = layoutMasonry([0.5, 2, 2, 2], 700, 200, 10);
    expect(l.columns).toBe(3);
    expect(l.items[1].y).toBe(0);
    expect(l.items[2].y).toBe(0);
    expect(l.items[3].x).toBe(l.items[1].x); // the shorter of the two wide columns
    expect(l.items[3].y).toBeGreaterThan(0);
  });

  it("is as tall as its tallest column, without a trailing gap", () => {
    const l = layoutMasonry([1, 1], 100, 100, 10); // one column
    expect(l.columns).toBe(1);
    expect(l.height).toBe(100 + 10 + 100);
  });

  it("never has fewer than one column, and treats an unknown shape as square", () => {
    const l = layoutMasonry([Number.NaN, 0, -3], 50, 240, 16);
    expect(l.columns).toBe(1);
    for (const p of l.items) expect(p.width).toBe(p.height);
  });

  it("has no height with no items", () => {
    expect(layoutMasonry([], 800, 240, 16)).toEqual({ items: [], height: 0, columns: 3 });
  });
});
