"use client";

import { Check, ChevronsUpDown, FolderOpen, Layers, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NewProjectDialog } from "@/components/projects/project-dialogs";
import { useProjectActions } from "@/components/projects/use-project-actions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useProjectsData } from "@/features/projects/queries";
import { UNSORTED } from "@/features/projects/schemas";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCurrentProject } from "./use-current-project";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Tile({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground", className)}>
      <Layers className="size-4" />
    </span>
  );
}

/**
 * The project switcher at the top of the sidebar, like the shadcn team switcher: the current project with a line about what is in
 * it, and a menu of the others. While the menu is open, the digits 1 to 9 pick a project (the browser keeps Cmd+1 to 9 for tabs).
 */
export function ProjectSwitcher({ collapsed = false, compact = false }: { collapsed?: boolean; compact?: boolean }) {
  const router = useRouter();
  const actions = useProjectActions();
  const current = useCurrentProject();
  const data = useProjectsData().data;
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const projects = data?.projects ?? [];
  const unsortedCount = data?.unsortedCount ?? 0;

  const name = current.isUnsorted ? "Unsorted" : (current.project?.name ?? "Projects");
  const about = current.isUnsorted
    ? formatCount(unsortedCount, "item")
    : current.project
      ? `${formatCount(current.project.images, "image")}, ${formatCount(current.project.videos, "clip")}`
      : " ";

  // While the menu is open the digits 1 to 9 pick a project. Listening on the window works wherever the focus is.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || !/^[1-9]$/.test(e.key)) return;
      const target = projects[Number(e.key) - 1];
      if (!target) return;
      e.preventDefault();
      setOpen(false);
      go(target.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // go() only reads the current section, which doesn't change while the menu is open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projects]);

  /** Goes to the same page in another project. Unsorted only has a Library. */
  function go(id: string) {
    const section = id === UNSORTED ? "library" : (current.section ?? "image");
    router.push(`/p/${id}/${section}`);
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
        <DropdownMenuTrigger
          data-testid="project-switcher"
          aria-label={collapsed ? `Switch project. Current: ${name}` : undefined}
          title={collapsed ? name : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl text-left transition-colors duration-fast",
            collapsed ? "size-11 justify-center" : "glass-chip w-full rounded-xl p-2",
            compact && "w-auto",
            focusRing,
          )}
        >
          <Tile />
          {!collapsed && (
            <>
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="sr-only">Switch project: </span>
                <span className="truncate text-sm font-medium text-foreground">{name}</span>
                <span className="truncate text-xs text-muted-foreground">{about}</span>
              </span>
              <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={compact ? "bottom" : "right"}
          align="start"
          sideOffset={10}
          className="w-64 p-2"
        >
          <DropdownMenuLabel className="px-2 text-xs font-normal text-muted-foreground">Projects</DropdownMenuLabel>
          {projects.map((p, i) => (
            <DropdownMenuItem
              key={p.id}
              onSelect={() => go(p.id)}
              data-current={p.id === current.id || undefined}
              className={cn("gap-3 py-2", p.id === current.id && "bg-[var(--wash-active)] font-medium")}
            >
              <Tile className={cn("size-7 rounded-md [&>svg]:size-3.5", p.id === current.id && "ring-2 ring-brand/70 ring-offset-2 ring-offset-transparent")} />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {p.id === current.id ? <Check aria-hidden className="size-4 text-brand" /> : i < 9 && <DropdownMenuShortcut>{i + 1}</DropdownMenuShortcut>}
            </DropdownMenuItem>
          ))}
          {unsortedCount > 0 && (
            <DropdownMenuItem onSelect={() => go(UNSORTED)} className="gap-3 py-2">
              <span aria-hidden className="flex size-7 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                <FolderOpen className="size-3.5" />
              </span>
              <span className="flex-1">Unsorted</span>
              {current.isUnsorted && <Check aria-hidden className="size-4 text-brand" />}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreating(true)} className="gap-3 py-2 text-muted-foreground">
            <span aria-hidden className="flex size-7 items-center justify-center rounded-md border border-border">
              <Plus className="size-3.5" />
            </span>
            Add project
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="gap-3 py-2 text-muted-foreground">
            <Link href="/projects">
              <span aria-hidden className="flex size-7 items-center justify-center rounded-md border border-border">
                <FolderOpen className="size-3.5" />
              </span>
              All projects
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NewProjectDialog
        open={creating}
        onOpenChange={setCreating}
        onCreate={async (projectName) => {
          const made = await actions.create(projectName);
          router.push(`/p/${made.id}/image`);
        }}
      />
    </>
  );
}
