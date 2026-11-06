import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The theme lives in one block of globals.css. These tests keep it honest: the dark steps stay distinguishable, the text and the
// accent stay readable on them, and nobody puts a loose colour in the app's own code.

const css = readFileSync("src/app/globals.css", "utf8");

function token(name: string): { L: number; C: number; h: number } {
  const m = new RegExp(`--${name}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\)`).exec(css);
  if (!m) throw new Error(`--${name} isn't a plain oklch() colour in globals.css`);
  return { L: +m[1], C: +m[2], h: +m[3] };
}

/** Relative luminance, from OKLCH. */
function luminance({ L, C, h }: { L: number; C: number; h: number }): number {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(token(a)), luminance(token(b))];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

describe("the dark ladder", () => {
  const steps = [0, 1, 2, 3, 4, 5, 6].map((n) => token(`tone-${n}`).L);
  it("goes strictly lighter, step by step", () => {
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeGreaterThan(steps[i - 1]);
  });
  it("keeps every neighbouring pair at least 3 lightness points apart, so dark never blends into dark", () => {
    for (let i = 1; i < steps.length; i++) expect(steps[i] - steps[i - 1], `tone-${i - 1} to tone-${i}`).toBeGreaterThanOrEqual(0.03);
  });
});

describe("readability", () => {
  it("main text is above 7:1 on every surface step", () => {
    for (let n = 0; n <= 5; n++) expect(contrast("tone-text", `tone-${n}`), `tone-${n}`).toBeGreaterThanOrEqual(7);
  });
  it("muted text is above 4.5:1 on every step up to the raised one", () => {
    for (let n = 0; n <= 4; n++) expect(contrast("tone-text-muted", `tone-${n}`), `tone-${n}`).toBeGreaterThanOrEqual(4.5);
  });
  it("the accent is above 7:1 on the page, the panel and the floating step", () => {
    for (let n = 0; n <= 2; n++) expect(contrast("accent-white", `tone-${n}`), `tone-${n}`).toBeGreaterThanOrEqual(7);
  });
  it("the label on the accent (the page colour) is above 7:1", () => {
    expect(contrast("accent-white", "tone-0")).toBeGreaterThanOrEqual(7);
    expect(contrast("accent-white-strong", "tone-0")).toBeGreaterThanOrEqual(7); // and on the pressed step
  });
});

// Vendored design-system components, the mock image generator and this file's own helpers are allowed their own values.
const ALLOWED = [/src\/components\/ui\//, /src\/lib\/ai\/image\.ts$/, /\.test\.tsx?$/, /src\/lib\/theme\.ts$/];
const COLOUR = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{8}\b|\brgba?\(|\bhsla?\(|\boklch\(|\boklab\(/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("no loose colours", () => {
  it("app code takes its colours from theme tokens", () => {
    const offenders = files("src")
      .filter((f) => !ALLOWED.some((a) => a.test(f)))
      .flatMap((f) =>
        readFileSync(f, "utf8")
          .split("\n")
          .flatMap((line, i) => (COLOUR.test(line) ? [`${f}:${i + 1}  ${line.trim().slice(0, 90)}`] : [])),
      );
    expect(offenders).toEqual([]);
  });
  it("globals.css only declares colours inside the theme and glass blocks, never as bare hex", () => {
    const bare = css.split("\n").flatMap((line, i) => (/#[0-9a-fA-F]{6}\b/.test(line) && !/^\s*(\/\*|\*)|\/\*.*#[0-9a-fA-F]{6}.*\*\//.test(line) ? [`${i + 1}: ${line.trim()}`] : []));
    expect(bare).toEqual([]);
  });
});
