"use client";

import { MagneticFilings, Shader } from "shaders/react";
import { useMemo } from "react";
import { useMotionOk } from "@/lib/use-motion-ok";
import { mixTokensHex, tokenHex } from "@/lib/theme";

// A WebGPU shader can't read CSS variables, so the colours are read from the theme tokens once, here: resting filings are the
// hairline step (--tone-6), and they brighten toward the muted text colour as they swing. No accent colour: with the magnet's
// default position the aligned filings gather in two soft pools, and in a bright colour those read as a glow over the page.

/**
 * Iron filings behind the whole app that lean toward the cursor. Kept faint and loose on purpose: low opacity, a weak and
 * short-reaching magnet, and a slow, floppy swing. The library follows the cursor on `window`, so this layer never needs to be
 * clicked or hovered, and it never blocks the page. Without WebGPU it simply stays empty.
 */
export function FilingsBackground() {
  const ok = useMotionOk();
  const colors = useMemo(() => (!ok ? null : { rest: tokenHex("--tone-6"), flash: mixTokensHex("--tone-6", "--tone-text-muted") }), [ok]);
  if (!colors) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-35">
      <Shader className="size-full">
        <MagneticFilings colorA={colors.rest} colorB={colors.flash} shape="dot" count={4500} size={1} fieldType="dipole" strength={0.6} reach={0.3} response={0.25} />
      </Shader>
    </div>
  );
}
