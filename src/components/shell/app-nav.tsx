"use client";

import { useQuery } from "@tanstack/react-query";
import { Film, Image as ImageIcon, LayoutGrid, LogOut, MessageSquareText, PanelLeftClose, PanelLeftOpen, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/image", label: "Image", icon: ImageIcon, soon: false },
  { href: "/video", label: "Video", icon: Film, soon: false },
  { href: "/agent", label: "Agent", icon: MessageSquareText, soon: false },
  { href: "/library", label: "Library", icon: LayoutGrid, soon: false },
  { href: "/spend", label: "Spend", icon: Wallet, soon: false },
] as const;

// Whether the rail is collapsed to icons. Remembered in the browser; the server and first paint always start expanded.
const COLLAPSED_KEY = "framerald.sidebar";
const listeners = new Set<() => void>();
function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "collapsed";
  } catch {
    return false;
  }
}
function setCollapsed(value: boolean) {
  try {
    localStorage.setItem(COLLAPSED_KEY, value ? "collapsed" : "open");
  } catch {
    /* private mode: the toggle still works for this page view */
  }
  listeners.forEach((l) => l());
}
function useCollapsed() {
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

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/image" className={cn("flex items-center gap-2.5 rounded-md px-1 py-1 font-medium text-foreground", focusRing)}>
      <span aria-hidden className="size-5 shrink-0 rounded-[0.4rem] border-2 border-brand" />
      <span className={cn(collapsed && "sr-only")}>Framerald</span>
    </Link>
  );
}

function NavLink({ item, active, compact, collapsed }: { item: (typeof ITEMS)[number]; active: boolean; compact?: boolean; collapsed?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 text-sm transition-colors duration-fast",
        collapsed && "justify-center px-0",
        compact ? "h-9" : "h-10",
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
        focusRing,
      )}
    >
      <Icon aria-hidden className={cn("size-4 shrink-0", active && "text-brand")} />
      <span className={cn(collapsed && "sr-only")}>{item.label}</span>
      {item.soon && <span className="ml-auto text-xs text-muted-foreground">Soon</span>}
    </Link>
  );
}

/** Shown only when the password gate is on. */
function SignOut({ compact, collapsed }: { compact?: boolean; collapsed?: boolean }) {
  const router = useRouter();
  const status = useQuery({
    queryKey: ["auth", "status"],
    queryFn: () => fetch("/api/auth/status").then((r) => r.json() as Promise<{ enabled: boolean }>),
    staleTime: Infinity,
  });
  if (!status.data?.enabled) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
      title={collapsed ? "Sign out" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 text-sm text-muted-foreground transition-colors duration-fast hover:bg-secondary/60 hover:text-foreground",
        compact ? "h-9" : "h-10",
        collapsed && "justify-center px-0",
        focusRing,
      )}
    >
      <LogOut aria-hidden className="size-4 shrink-0" />
      <span className={cn(collapsed && "sr-only")}>Sign out</span>
    </button>
  );
}

/** A collapsible left rail from 64rem up (Ctrl or Cmd + B toggles it), a top bar below it. */
export function AppNav() {
  const pathname = usePathname();
  const collapsed = useCollapsed();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed(!readCollapsed());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const Toggle = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <>
      <aside
        id="sidebar"
        data-collapsed={collapsed}
        className={cn(
          "relative hidden shrink-0 flex-col gap-6 border-r border-border bg-card py-4 transition-[width] duration-base motion-reduce:transition-none lg:flex",
          collapsed ? "w-16 px-2" : "w-56 px-3",
        )}
      >
        {/* The sidebar's edge is a click target too: it glows on hover and opens or closes the rail. The toggle button above is the keyboard way. */}
        <div
          role="presentation"
          onClick={() => setCollapsed(!collapsed)}
          title={`${collapsed ? "Open" : "Close"} sidebar`}
          className={cn("group/rail absolute inset-y-0 -right-1.5 z-20 w-3", collapsed ? "cursor-e-resize" : "cursor-w-resize")}
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-[background-color,box-shadow] duration-base group-hover/rail:bg-brand/80 group-hover/rail:shadow-[0_0_3px_0_var(--brand)]" />
        </div>
        <div className={cn("flex items-center", collapsed ? "flex-col gap-3" : "justify-between")}>
          <Brand collapsed={collapsed} />
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            aria-controls="sidebar"
            title={`${collapsed ? "Expand" : "Collapse"} sidebar (Ctrl+B)`}
            className={cn(
              "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast hover:bg-secondary/60 hover:text-foreground",
              focusRing,
            )}
          >
            <Toggle aria-hidden className="size-4" />
          </button>
        </div>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {ITEMS.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
          ))}
        </nav>
        <div className="mt-auto">
          <SignOut collapsed={collapsed} />
        </div>
      </aside>

      <header className="flex flex-col gap-2 border-b border-border bg-card px-3 py-3 lg:hidden">
        <Brand />
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto">
          {ITEMS.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} compact />
          ))}
          <SignOut compact />
        </nav>
      </header>
    </>
  );
}
