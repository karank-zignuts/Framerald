import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./cursor";

describe("cursor", () => {
  it("round-trips a position", () => {
    const pos = { createdAt: "2026-11-05T10:20:30.123456+00:00", id: "11111111-1111-4111-8111-111111111111" };
    expect(decodeCursor(encodeCursor(pos))).toEqual(pos);
  });

  it("is url-safe", () => {
    const c = encodeCursor({ createdAt: "2026-11-05T10:20:30+00:00", id: "11111111-1111-4111-8111-111111111111" });
    expect(c).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("returns null for garbage instead of throwing", () => {
    expect(decodeCursor("not-a-cursor")).toBeNull();
    expect(decodeCursor("")).toBeNull();
    expect(decodeCursor(Buffer.from('{"createdAt":1,"id":2}').toString("base64url"))).toBeNull();
  });

  it("refuses values that could break out of a filter", () => {
    const evil = encodeCursor({ createdAt: "2026-01-01),or(deleted_at.is.null", id: "x" });
    expect(decodeCursor(evil)).toBeNull();
  });
});
