import { describe, expect, it } from "vitest";
import { downloadUrl, extensionFor, formatCost, formatCount, formatMoney } from "./format";

describe("formatCost", () => {
  it("shows rupees at the default rate of 88 per dollar", () => {
    expect(formatCost(0.039)).toBe("≈ ₹3.43");
    expect(formatCost(0.078)).toBe("≈ ₹6.86");
    expect(formatCost(0)).toBe("≈ ₹0.00");
  });
  it("never rounds a real but tiny cost down to zero", () => {
    expect(formatCost(0.0000001)).toBe("≈ < ₹0.01");
  });
  it("groups digits the Indian way", () => {
    expect(formatCost(1500)).toBe("≈ ₹1,32,000.00");
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

describe("formatMoney", () => {
  it("converts USD to rupees", () => {
    expect(formatMoney(0)).toBe("₹0.00");
    expect(formatMoney(1)).toBe("₹88.00");
    expect(formatMoney(0.163)).toBe("₹14.34");
  });
  it("never shows a real cost as zero", () => {
    expect(formatMoney(0.0000004)).toBe("< ₹0.01");
  });
});
