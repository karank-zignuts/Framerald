"use client";

import { useQuery } from "@tanstack/react-query";
import { Film, Image as ImageIcon, LayoutGrid, LogOut, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/image", label: "Image", icon: ImageIcon, soon: false },
  { href: "/video", label: "Video", icon: Film, soon: false },
  { href: "/agent", label: "Agent", icon: MessageSquareText, soon: false },
  { href: "/library", label: "Library", icon: LayoutGrid, soon: false },
] as const;

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Brand() {
  return (
    <Link href="/image" className={cn("flex items-center gap-2.5 rounded-md px-1 py-1 font-medium text-foreground", focusRing)}>
      <span aria-hidden className="size-5 rounded-[0.4rem] border-2 border-brand" />
      Framerald
    </Link>
  );
}

function NavLink({ item, active, compact }: { item: (typeof ITEMS)[number]; active: boolean; compact?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 text-sm transition-colors duration-fast",
        compact ? "h-9" : "h-10",
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
        focusRing,
      )}
    >
      <Icon aria-hidden className={cn("size-4 shrink-0", active && "text-brand")} />
      <span>{item.label}</span>
      {item.soon && <span className="ml-auto text-xs text-muted-foreground">Soon</span>}
    </Link>
  );
}

/** Shown only when the password gate is on. */
function SignOut({ compact }: { compact?: boolean }) {
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
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 text-sm text-muted-foreground transition-colors duration-fast hover:bg-secondary/60 hover:text-foreground",
        compact ? "h-9" : "h-10",
        focusRing,
      )}
    >
      <LogOut aria-hidden className="size-4 shrink-0" />
      Sign out
    </button>
  );
}

/** A left rail from 64rem up, a top bar below it. */
export function AppNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <aside className="hidden w-56 shrink-0 flex-col gap-6 border-r border-border bg-card px-3 py-4 lg:flex">
        <Brand />
        <nav aria-label="Main" className="flex flex-col gap-1">
          {ITEMS.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </nav>
        <div className="mt-auto">
          <SignOut />
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
