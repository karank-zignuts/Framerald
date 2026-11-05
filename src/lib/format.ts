// Display helpers. No server imports, so client components can use them.

/**
 * Rupees per US dollar, used only to show amounts. Everything is stored and priced in USD (Google's list prices);
 * this converts at display time. Set NEXT_PUBLIC_USD_INR to your current rate (Google bills at its own rate).
 */
export const USD_TO_INR = Number(process.env.NEXT_PUBLIC_USD_INR) > 0 ? Number(process.env.NEXT_PUBLIC_USD_INR) : 88;

export const toInr = (usd: number) => usd * USD_TO_INR;

/** Rupees with Indian digit grouping. Never shows a real amount as zero. */
export function formatInr(inr: number): string {
  if (inr === 0) return "₹0.00";
  if (inr < 0.01) return "< ₹0.01";
  return `₹${inr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "≈ ₹3.43". The tilde is honest: costs are estimated from list prices. */
export function formatCost(usd: number | null): string {
  if (usd === null) return "Cost unknown";
  return `≈ ${formatInr(toInr(usd))}`;
}

export function formatCount(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

/** Supabase signed links download with a chosen filename when given ?download=. */
export function downloadUrl(signedUrl: string, filename: string): string {
  const url = new URL(signedUrl);
  url.searchParams.set("download", filename);
  return url.toString();
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "video/mp4": "mp4",
};

/** The file extension for a real mime type. */
export function extensionFor(mimeType: string): string {
  return EXTENSIONS[mimeType] ?? "bin";
}

/** Money for the Spend page, from a USD amount, shown in rupees. */
export function formatMoney(usd: number): string {
  return formatInr(toInr(usd));
}
