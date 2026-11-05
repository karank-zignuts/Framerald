"use client";

import { useSyncExternalStore } from "react";

// How the results area looks. Remembered in this browser; the first paint always uses the defaults.
export type ViewSettings = {
  /** "grid": every picture in one flowing grid. "batch": grouped by generation, with its prompt and cost. */
  mode: "grid" | "batch";
  size: "s" | "m" | "l";
  /** Show each tile's name at the bottom. */
  details: boolean;
  /** Empty the prompt box after Generate. */
  clearOnSubmit: boolean;
};

export const DEFAULT_VIEW: ViewSettings = { mode: "grid", size: "m", details: true, clearOnSubmit: true };
/** Column width for each size, in px. */
export const TILE_WIDTH: Record<ViewSettings["size"], number> = { s: 150, m: 240, l: 360 };

const KEY = "framerald.view";
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: ViewSettings } = { raw: null, value: DEFAULT_VIEW };

function read(): ViewSettings {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* private mode */
  }
  if (raw === cache.raw) return cache.value; // same object while nothing changed, as useSyncExternalStore needs
  let value = DEFAULT_VIEW;
  if (raw) {
    try {
      const v = JSON.parse(raw) as Partial<ViewSettings>;
      value = {
        mode: v.mode === "batch" ? "batch" : "grid",
        size: v.size === "s" || v.size === "l" ? v.size : "m",
        details: v.details ?? DEFAULT_VIEW.details,
        clearOnSubmit: v.clearOnSubmit ?? DEFAULT_VIEW.clearOnSubmit,
      };
    } catch {
      /* ignore a damaged value and use the defaults */
    }
  }
  cache = { raw, value };
  return value;
}

export function updateView(patch: Partial<ViewSettings>) {
  const next = { ...read(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* it still applies until the page reloads */
  }
  cache = { raw: JSON.stringify(next), value: next };
  listeners.forEach((l) => l());
}

export function useViewSettings(): ViewSettings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      window.addEventListener("storage", cb);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", cb);
      };
    },
    read,
    () => DEFAULT_VIEW,
  );
}
