/** Browser-only helpers for the few places that can't use a CSS variable directly (a WebGPU shader wants real colour values). */

/** Resolves any CSS colour to "#rrggbb" by painting one pixel with it. */
export function colorHex(css: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** The value of a theme token such as "--tone-6", as "#rrggbb". The token must be declared as a plain colour, not as var(). */
export function tokenHex(name: string): string {
  return colorHex(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
}

/** A mix of two theme tokens, as "#rrggbb": `bPercent` of the second token and the rest of the first (an even mix by default). */
export function mixTokensHex(a: string, b: string, bPercent = 50): string {
  const root = getComputedStyle(document.documentElement);
  return colorHex(`color-mix(in oklab, ${root.getPropertyValue(a).trim()} ${100 - bPercent}%, ${root.getPropertyValue(b).trim()} ${bPercent}%)`);
}
