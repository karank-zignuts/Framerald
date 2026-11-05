import { describe, expect, it } from "vitest";
import { downloadUrl, formatCost, formatCount } from "./format";

describe("formatCost", () => {
  it("shows three decimals under a dollar", () => {
    expect(formatCost(0.039)).toBe("≈ $0.039");
    expect(formatCost(0.078)).toBe("≈ $0.078");
    expect(formatCost(0)).toBe("≈ $0.000");
  });
  it("shows cents from a dollar up", () => {
    expect(formatCost(1.5)).toBe("≈ $1.50");
    expect(formatCost(12.345)).toBe("≈ $12.35");
  });
  it("says so when the cost is unknown", () => {
    expect(formatCost(null)).toBe("Cost unknown");
  });
});

describe("formatCount", () => {
  it("uses singular and plural", () => {
    expect(formatCount(1, "image")).toBe("1 image");
    expect(formatCount(3, "image")).toBe("3 images");
  });
});

describe("downloadUrl", () => {
  it("adds a download filename to a signed storage link and keeps its token", () => {
    const out = new URL(downloadUrl("https://x.supabase.co/storage/v1/object/sign/media/a.png?token=abc", "framerald-1.png"));
    expect(out.searchParams.get("token")).toBe("abc");
    expect(out.searchParams.get("download")).toBe("framerald-1.png");
  });
});
