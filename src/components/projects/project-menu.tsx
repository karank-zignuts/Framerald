"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ProjectDto } from "@/features/projects/schemas";
import { cn } from "@/lib/utils";
import { DeleteProjectDialog, RenameProjectDialog } from "./project-dialogs";
import { useProjectActions } from "./use-project-actions";

/** The three dots on a project: Rename, View trash, Delete. */
export function ProjectMenu({ project, className, afterDelete }: { project: ProjectDto; className?: string; afterDelete?: () => void }) {
  const actions = useProjectActions();
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${project.name}`}
          className={cn("flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast hover:bg-[var(--wash-hover)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
        >
          <MoreVertical aria-hidden className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 p-2">
          <DropdownMenuItem onSelect={() => setRenaming(true)}>
            <Pencil aria-hidden className="mr-2 size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/p/${project.id}/library?view=trash`}>
              <Trash2 aria-hidden className="mr-2 size-4" />
              View trash
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDeleting(true)} className="bg-destructive/15 focus:bg-destructive/25">
            <Trash2 aria-hidden className="mr-2 size-4 text-destructive" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RenameProjectDialog open={renaming} onOpenChange={setRenaming} name={project.name} onRename={(name) => actions.rename(project.id, name)} />
      <DeleteProjectDialog
        open={deleting}
        onOpenChange={setDeleting}
        name={project.name}
        onDelete={async () => {
          await actions.remove(project.id);
          if (afterDelete) afterDelete();
          else router.push("/projects");
        }}
      />
    </>
  );
}
