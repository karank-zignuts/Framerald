"use client";

import { useSyncExternalStore } from "react";

const query = () => window.matchMedia("(prefers-reduced-motion: reduce)");
const subscribe = (cb: () => void) => {
  const q = query();
  q.addEventListener("change", cb);
  return () => q.removeEventListener("change", cb);
};

/**
 * Whether moving, GPU-drawn decoration may be shown. False on the server (the shaders need a browser) and for anyone who asked
 * for less motion.
 */
export function useMotionOk(): boolean {
  return useSyncExternalStore(subscribe, () => !query().matches, () => false);
}
