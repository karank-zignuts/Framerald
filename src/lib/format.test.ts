import { describe, expect, it } from "vitest";
import { downloadUrl, extensionFor, formatCost, formatCount, formatUsd } from "./format";

describe("formatCost", () => {
  it("shows three decimals under a dollar", () => {
    expect(formatCost(0.039)).toBe("≈ $0.039");
    expect(formatCost(0.078)).toBe("≈ $0.078");
    expect(formatCost(0)).toBe("≈ $0.000");
  });
  it("never rounds a real but tiny cost down to zero", () => {
    expect(formatCost(0.00114)).toBe("≈ $0.001");
    expect(formatCost(0.0004)).toBe("< $0.001");
    expect(formatCost(0.001)).toBe("≈ $0.001");
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

describe("extensionFor", () => {
  it("uses the real type of the file, not a guess", () => {
    expect(extensionFor("image/png")).toBe("png");
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("image/webp")).toBe("webp");
    expect(extensionFor("video/mp4")).toBe("mp4");
    expect(extensionFor("application/x-whatever")).toBe("bin");
  });
});

describe("formatUsd", () => {
  it("shows money with the precision that matters at that size", () => {
    expect(formatUsd(0)).toBe("$0.00");
    expect(formatUsd(12.3456)).toBe("$12.35");
    expect(formatUsd(1)).toBe("$1.00");
    expect(formatUsd(0.163)).toBe("$0.163");
    expect(formatUsd(0.0049)).toBe("$0.0049");
  });
  it("never shows a real cost as zero", () => {
    expect(formatUsd(0.00004)).toBe("< $0.0001");
  });
});
