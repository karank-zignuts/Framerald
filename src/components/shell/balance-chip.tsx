"use client";

import { Wallet } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSpentSince } from "@/features/spend/queries";
import { formatInr, toInr } from "@/lib/format";

// The balance is typed in from the Google Cloud console (the app can't read it). It is remembered in this browser with the
// moment it was entered, and the app subtracts what it has spent since then.
const KEY = "framerald.balance";
type Saved = { inr: number; at: string };

const listeners = new Set<() => void>();
const read = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const write = (value: Saved | null) => {
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value));
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode: it won't be remembered after a reload */
  }
  listeners.forEach((l) => l());
};
function useSaved(): Saved | null {
  const raw = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      window.addEventListener("storage", cb);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", cb);
      };
    },
    read,
    () => null,
  );
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Saved;
    return Number.isFinite(v.inr) && typeof v.at === "string" ? v : null;
  } catch {
    return null;
  }
}

/** Top-right: what is left of the balance you entered from the Google Cloud console. */
export function BalanceChip() {
  const saved = useSaved();
  const spent = useSpentSince(saved?.at ?? null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  const left = saved && spent.data ? saved.inr - toInr(spent.data.usd) : saved ? saved.inr : null;
  const parsed = Number(text.replace(/[,₹\s]/g, ""));
  const valid = text.trim() !== "" && Number.isFinite(parsed) && parsed >= 0;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setText(saved ? String(saved.inr) : "");
      }}
    >
      <PopoverTrigger
        className="glass-chip inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="balance-chip"
      >
        <Wallet aria-hidden className="size-4 text-muted-foreground" />
        {left === null ? (
          <span className="text-muted-foreground">Set balance</span>
        ) : (
          <span className="tabular-nums">
            {formatInr(left)} <span className="text-muted-foreground">left</span>
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-80 flex-col gap-3 p-4">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            write({ inr: parsed, at: new Date().toISOString() });
            setOpen(false);
          }}
        >
          <label htmlFor="balance" className="text-sm text-foreground">
            Balance in the Google Cloud console (₹)
          </label>
          <Input id="balance" inputMode="decimal" placeholder="For example 25,000" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
          <p className="text-xs text-muted-foreground">
            This app can&apos;t read your Google balance. Copy it from the console, and the app subtracts what it spends from now on. Update it whenever the console shows a new figure.
          </p>
          {saved && spent.data && (
            <p className="text-xs tabular-nums text-muted-foreground">
              Spent here since you set it: {formatInr(toInr(spent.data.usd))}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!valid} className="bg-brand text-brand-foreground hover:bg-brand-strong">
              Save
            </Button>
            {saved && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  write(null);
                  setOpen(false);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
