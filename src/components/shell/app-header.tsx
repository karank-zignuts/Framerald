"use client";

import { ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProjectMenu } from "@/components/projects/project-menu";
import { cn } from "@/lib/utils";
import { HeaderTools } from "./header-tools";
import { setCollapsed, useCollapsed } from "./sidebar-state";
import { useCurrentProject } from "./use-current-project";

const SECTION_LABEL: Record<string, string> = { image: "Image", video: "Video", agent: "Agent", library: "Library" };

/** The bar above the page: the sidebar button, a breadcrumb (project, then page) and the balance. */
export function AppHeader() {
  const collapsed = useCollapsed();
  const pathname = usePathname();
  const current = useCurrentProject();
  const Toggle = collapsed ? PanelLeftOpen : PanelLeftClose;

  const crumbs: { label: string; href?: string }[] = [];
  if (current.inProject && (current.project || current.isUnsorted)) {
    crumbs.push({ label: current.isUnsorted ? "Unsorted" : current.project!.name, href: undefined });
    if (current.section && SECTION_LABEL[current.section]) crumbs.push({ label: SECTION_LABEL[current.section] });
  } else if (pathname === "/projects") crumbs.push({ label: "Projects" });
  else if (pathname === "/spend") crumbs.push({ label: "Spend" });

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 px-5">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        aria-controls="sidebar"
        title={`Toggle sidebar (Ctrl+B)`}
        className="hidden size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex"
      >
        <Toggle aria-hidden className="size-4" />
      </button>
      <span aria-hidden className="hidden h-4 w-px bg-border lg:block" />
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => (
          <span key={c.label} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <ChevronRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />}
            {c.href ? (
              <Link href={c.href} className="truncate text-muted-foreground hover:text-foreground">
                {c.label}
              </Link>
            ) : (
              <span aria-current={i === crumbs.length - 1 ? "page" : undefined} className={cn("truncate", i === crumbs.length - 1 ? "text-foreground" : "text-muted-foreground")}>
                {c.label}
              </span>
            )}
          </span>
        ))}
        {current.inProject && current.project && <ProjectMenu project={current.project} />}
      </nav>
      <div className="ml-auto">
        <HeaderTools />
      </div>
    </header>
  );
}
