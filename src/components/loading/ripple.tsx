"use client";

import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * The ripple loader: two rings that grow from the middle and fade, one half a cycle behind the other (loading-ui's Ripple, redrawn
 * for this app). It takes its colour from the text colour around it and its size from the `size-*` class. The rings are decoration:
 * the labelled wrapper is what screen readers get. With reduced motion it is a still ring.
 */
export function Ripple({ className, label = "Loading" }: { className?: string; label?: string }) {
  const reduce = useReducedMotion();
  const ring = (begin: string) => (
    <circle cx="24" cy="24" r={reduce ? 14 : 3} fill="none" opacity={reduce ? 0.6 : 1}>
      {!reduce && (
        <>
          <animate attributeName="r" values="3;21" dur="1.8s" begin={begin} repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.16 1 0.3 1" />
          <animate attributeName="opacity" values="0.9;0" dur="1.8s" begin={begin} repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />
        </>
      )}
    </circle>
  );
  return (
    <span role="status" aria-label={label} className={cn("inline-flex size-6 text-brand", className)}>
      <svg viewBox="0 0 48 48" stroke="currentColor" strokeWidth="2.5" aria-hidden className="size-full">
        {ring("0s")}
        {ring("-0.9s")}
      </svg>
    </span>
  );
}

/**
 * What fills a page or a panel while it loads: a ripple in the middle. It stays invisible for the first 200 ms, so a load that is
 * quick never flashes anything, and then fades in.
 */
export function PageLoader({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("loader-in flex min-h-[12rem] flex-1 items-center justify-center", className)}>
      <Ripple label={label} className="size-10" />
    </div>
  );
}
