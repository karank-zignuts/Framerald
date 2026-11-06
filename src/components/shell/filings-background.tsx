"use client";

import { MagneticFilings, Shader } from "shaders/react";
import { useSyncExternalStore } from "react";

// Shader colours can't read CSS variables, so these mirror the zinc tokens: resting filings are zinc-700 (`border`) and they
// brighten toward zinc-500 as they swing. No accent colour here on purpose: with the magnet's default position the aligned
// filings gather in two soft pools, and in green those read as a glow over the page.
const REST = "#3f3f46";
const FLASH = "#71717a";

// Not drawn at all for people who asked for less motion.
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function subscribe(cb: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", cb);
  return () => query.removeEventListener("change", cb);
}

/**
 * Iron filings behind the whole app that lean toward the cursor. Kept faint and loose on purpose: low opacity, a weak and
 * short-reaching magnet, and a slow, floppy swing. The library follows the cursor on `window`, so this layer never needs to be
 * clicked or hovered, and it never blocks the page. Without WebGPU it simply stays empty.
 */
export function FilingsBackground() {
  const hide = useSyncExternalStore(subscribe, reduced, () => true);
  if (hide) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-35">
      <Shader className="size-full">
        <MagneticFilings colorA={REST} colorB={FLASH} shape="dot" count={4500} size={1} fieldType="dipole" strength={0.6} reach={0.3} response={0.25} />
      </Shader>
    </div>
  );
}
