"use client";

import { useSyncExternalStore } from "react";

// Whether the sidebar is collapsed to icons. Remembered in the browser; the server and first paint always start expanded.
const KEY = "framerald.sidebar";
const listeners = new Set<() => void>();

export function readCollapsed(): boolean {
  try {
    return localStorage.getItem(KEY) === "collapsed";
  } catch {
    return false;
  }
}

export function setCollapsed(value: boolean) {
  try {
    localStorage.setItem(KEY, value ? "collapsed" : "open");
  } catch {
    /* private mode: the toggle still works for this page view */
  }
  listeners.forEach((l) => l());
}

export function useCollapsed(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      window.addEventListener("storage", cb);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", cb);
      };
    },
    readCollapsed,
    () => false,
  );
}
