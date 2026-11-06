"use client";

import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Film, Image as ImageIcon, LayoutGrid, LogOut, MessageSquareText, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { ProjectSwitcher } from "./project-switcher";
import { readCollapsed, setCollapsed, useCollapsed } from "./sidebar-state";
import { useCurrentProject } from "./use-current-project";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Item = { key: string; label: string; icon: typeof ImageIcon; href: string; active: boolean };

function NavLink({ item, compact, collapsed }: { item: Item; compact?: boolean; collapsed?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={item.active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 text-sm transition-colors duration-fast",
        collapsed && "justify-center px-0",
        compact ? "h-9 shrink-0" : "h-10",
        item.active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
        focusRing,
      )}
    >
      <Icon aria-hidden className={cn("size-4 shrink-0", item.active && "text-brand")} />
      <span className={cn(collapsed && "sr-only")}>{item.label}</span>
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
        compact ? "h-9 shrink-0" : "h-10",
        collapsed && "justify-center px-0",
        focusRing,
      )}
    >
      <LogOut aria-hidden className="size-4 shrink-0" />
      <span className={cn(collapsed && "sr-only")}>Sign out</span>
    </button>
  );
}

/** The links for the current project, then the pages that don't belong to one. */
function useItems(): { project: Item[]; global: Item[] } {
  const pathname = usePathname();
  const current = useCurrentProject();
  // Unsorted only has a Library; the other links go through the plain address, which opens your current project.
  const base = current.id && !current.isUnsorted ? `/p/${current.id}` : "";
  const here = (key: string) => current.inProject && current.section === key;
  return {
    project: [
      { key: "image", label: "Image", icon: ImageIcon, href: `${base}/image`, active: here("image") },
      { key: "video", label: "Video", icon: Film, href: `${base}/video`, active: here("video") },
      { key: "agent", label: "Agent", icon: MessageSquareText, href: `${base}/agent`, active: here("agent") },
      { key: "library", label: "Library", icon: LayoutGrid, href: current.isUnsorted ? `/p/${current.id}/library` : `${base}/library`, active: here("library") },
    ],
    global: [
      { key: "spend", label: "Spend", icon: Wallet, href: "/spend", active: pathname === "/spend" },
      { key: "projects", label: "Projects", icon: FolderOpen, href: "/projects", active: pathname === "/projects" },
    ],
  };
}

/**
 * A glass sidebar from 64rem up, and a top bar below it. Collapsing hides the sidebar completely (Ctrl or Cmd + B, or the button
 * in the header); a hover zone on the screen's left edge then offers a button to bring it back.
 */
export function AppNav() {
  const collapsed = useCollapsed();
  const items = useItems();

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

  return (
    <>
      {/* Flush with the top, left and bottom of the screen. The outer box animates its width to nothing, so the page slides over. */}
      <aside
        id="sidebar"
        data-collapsed={collapsed}
        aria-label="Sidebar"
        inert={collapsed}
        className={cn(
          "hidden shrink-0 overflow-hidden transition-[width,padding,opacity,filter] duration-slow ease-out motion-reduce:transition-none lg:block",
          collapsed ? "w-0 opacity-0 blur-md" : "w-60 opacity-100 filter-none",
        )}
      >
        <div className="glass glass-sidebar relative flex h-full w-60 flex-col gap-4 p-3">
          {/* The sidebar's right edge, full height: it glows slightly in the accent colour on hover, and a click hides the sidebar. */}
          <div
            role="presentation"
            data-testid="sidebar-rail"
            onClick={() => setCollapsed(true)}
            title="Hide sidebar"
            className="group/rail absolute inset-y-0 -right-1 z-20 w-3 cursor-w-resize"
          >
            <span
              aria-hidden
              className="absolute inset-y-0 right-1 w-0.5 bg-transparent transition-[background-color,box-shadow] duration-base group-hover/rail:bg-brand/70 group-hover/rail:shadow-[0_0_8px_0_var(--brand)]"
            />
          </div>
          <ProjectSwitcher />
          <nav aria-label="Main" className="flex flex-col gap-1">
            {items.project.map((item) => (
              <NavLink key={item.key} item={item} />
            ))}
          </nav>
          <nav aria-label="Everything" className="flex flex-col gap-1 border-t border-[var(--glass-border)] pt-3">
            {items.global.map((item) => (
              <NavLink key={item.key} item={item} />
            ))}
          </nav>
          <div className="mt-auto">
            <SignOut />
          </div>
        </div>
      </aside>

      {/* With the sidebar hidden, the whole left edge of the screen is one strip: it lights up top to bottom on hover, and a click anywhere on it brings the sidebar back. */}
      {collapsed && (
        <button
          type="button"
          data-testid="sidebar-edge"
          onClick={() => setCollapsed(false)}
          aria-label="Show sidebar"
          title="Show sidebar (Ctrl+B)"
          className="group/edge fixed inset-y-0 left-0 z-40 hidden w-5 cursor-e-resize focus-visible:outline-none lg:block"
        >
          <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-brand/0 to-transparent opacity-0 transition-[opacity,background-color] duration-base group-hover/edge:from-brand/20 group-hover/edge:opacity-100 group-focus-visible/edge:from-brand/20 group-focus-visible/edge:opacity-100" />
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-0.5 bg-transparent transition-[background-color,box-shadow] duration-base group-hover/edge:bg-brand/70 group-hover/edge:shadow-[0_0_8px_0_var(--brand)] group-focus-visible/edge:bg-brand/70"
          />
        </button>
      )}

      <header className="glass glass-bar flex flex-col gap-2 px-5 py-3 lg:hidden">
        <ProjectSwitcher compact />
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto">
          {[...items.project, ...items.global].map((item) => (
            <NavLink key={item.key} item={item} compact />
          ))}
          <SignOut compact />
        </nav>
      </header>
    </>
  );
}
