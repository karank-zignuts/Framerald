// Display helpers. No server imports, so client components can use them.

/** "≈ $0.039". The tilde is honest: costs are estimated from list prices. */
export function formatCost(usd: number | null): string {
  if (usd === null) return "Cost unknown";
  if (usd > 0 && usd < 0.001) return "< $0.001";
  return `≈ $${usd >= 1 ? usd.toFixed(2) : usd.toFixed(3)}`;
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
