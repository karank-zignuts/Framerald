"use client";

import { useSyncExternalStore } from "react";
import { titleFromPrompt } from "./title";
import type { AssetDto } from "@/features/library/types";

// Names you give your images. They are kept in this browser; the automatic name comes from the prompt.
const KEY = "framerald.names";
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: Record<string, string> } = { raw: null, value: {} };

function read(): Record<string, string> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* private mode */
  }
  if (raw === cache.raw) return cache.value;
  let value: Record<string, string> = {};
  try {
    if (raw) value = JSON.parse(raw) as Record<string, string>;
  } catch {
    /* ignore a damaged value */
  }
  cache = { raw, value };
  return value;
}

/** An empty name goes back to the automatic one. */
export function renameAsset(id: string, name: string) {
  const next = { ...read() };
  const clean = name.trim().slice(0, 80);
  if (clean) next[id] = clean;
  else delete next[id];
  const raw = JSON.stringify(next);
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    /* it still applies until the page reloads */
  }
  cache = { raw, value: next };
  listeners.forEach((l) => l());
}

const EMPTY: Record<string, string> = {};

/** The name to show: the one you set, or one made from the prompt. */
export function useAssetName(asset: AssetDto): string {
  const names = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      window.addEventListener("storage", cb);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", cb);
      };
    },
    read,
    () => EMPTY,
  );
  return names[asset.id] ?? titleFromPrompt(asset.generation?.prompt);
}
