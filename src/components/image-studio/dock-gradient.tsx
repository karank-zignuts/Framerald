"use client";

import { FlowingGradient, Shader } from "shaders/react";
import { useMemo } from "react";
import { mixTokensHex } from "@/lib/theme";
import { useMotionOk } from "@/lib/use-motion-ok";

/**
 * A slow, soft flowing gradient inside the dock, in the dock's own colour with the accent flowing through it. It shows while
 * the dock isn't focused and fades out when you click into it (CSS only: the dock is a `group/dock`, and `focus-within` on it
 * sets the opacity to 0). The colours come from the theme tokens, one mix of the floating step and the accent each.
 */
export function DockGradient() {
  const ok = useMotionOk();
  const colors = useMemo(
    () =>
      ok
        ? {
            a: mixTokensHex("--tone-2", "--accent-white", 0),
            b: mixTokensHex("--tone-2", "--accent-white", 11),
            c: mixTokensHex("--tone-2", "--accent-white", 24),
            d: mixTokensHex("--tone-2", "--accent-white-strong", 16),
          }
        : null,
    [ok],
  );
  if (!colors) return null;
  return (
    <div
      aria-hidden
      data-testid="dock-gradient"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit] opacity-60 transition-opacity duration-slow ease-out motion-reduce:transition-none group-focus-within/dock:opacity-0"
    >
      <div className="absolute -inset-6 blur-xl">
        <Shader className="size-full">
          <FlowingGradient colorA={colors.a} colorB={colors.b} colorC={colors.c} colorD={colors.d} colorSpace="oklch" speed={0.75} distortion={0.25} />
        </Shader>
      </div>
    </div>
  );
}
