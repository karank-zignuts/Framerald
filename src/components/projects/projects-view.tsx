"use client";

import { FolderOpen, Layers, Plus, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeletedProjects, useProjectsData } from "@/features/projects/queries";
import { UNSORTED, type ProjectDto } from "@/features/projects/schemas";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NewProjectDialog } from "./project-dialogs";
import { ProjectMenu } from "./project-menu";
import { useProjectActions } from "./use-project-actions";

const GRID = "grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4";
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const about = (p: Pick<ProjectDto, "images" | "videos">) =>
  p.images + p.videos === 0 ? "Empty" : `${formatCount(p.images, "image")}, ${formatCount(p.videos, "clip")}`;

function Cover({ url, dimmed }: { url: string | null; dimmed?: boolean }) {
  return (
    <div className="relative aspect-[4/3] glass overflow-hidden rounded-2xl">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" decoding="async" className={cn("size-full object-cover transition-transform duration-slow group-hover:scale-[1.03]", dimmed && "opacity-60")} />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <Layers aria-hidden className="size-8" />
        </div>
      )}
    </div>
  );
}

/** Your projects as cards with a cover, like Google Flow's home. A Trash switch shows deleted ones, which can be restored. */
export function ProjectsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const trash = params.get("trash") === "1";
  const data = useProjectsData();
  const deleted = useDeletedProjects();
  const actions = useProjectActions();
  const [creating, setCreating] = useState(false);

  const setTrash = (on: boolean) => router.replace(on ? `${pathname}?trash=1` : pathname);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 p-5 lg:overflow-y-auto">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-medium text-foreground">Projects</h1>
        <Button variant="ghost" size="sm" aria-pressed={trash} onClick={() => setTrash(!trash)} className={cn(trash && "bg-secondary")}>
          <Trash2 aria-hidden className="size-4" />
          Trash
        </Button>
      </div>

      {!trash && (
        <>
          {data.isPending && (
            <div className={GRID} role="status" aria-label="Loading">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="aspect-[4/3] w-full rounded-2xl" />
              ))}
            </div>
          )}
          {data.isError && (
            <div role="alert" className="flex max-w-md flex-col items-start gap-3 rounded-lg border border-destructive/50 p-4">
              <p className="text-sm">Couldn&apos;t load your projects: {data.error.message}</p>
              <Button variant="secondary" size="sm" onClick={() => void data.refetch()}>
                Try again
              </Button>
            </div>
          )}
          {data.isSuccess && (
            <ul className={GRID} data-testid="project-grid">
              {data.data.projects.map((p) => (
                <li key={p.id} className="group relative flex flex-col gap-2" data-testid="project-card">
                  <Link href={`/p/${p.id}/image`} className={cn("flex flex-col gap-2 rounded-2xl", focusRing)}>
                    <Cover url={p.coverUrl} />
                    <span className="flex flex-col px-1">
                      <span className="truncate text-sm font-medium text-foreground">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{about(p)}</span>
                    </span>
                  </Link>
                  <ProjectMenu project={p} className="absolute right-2 top-2 bg-background/70 backdrop-blur" afterDelete={() => undefined} />
                </li>
              ))}
              {data.data.unsortedCount > 0 && (
                <li className="group flex flex-col gap-2" data-testid="project-card">
                  <Link href={`/p/${UNSORTED}/library`} className={cn("flex flex-col gap-2 rounded-2xl", focusRing)}>
                    <div className="flex aspect-[4/3] items-center justify-center glass rounded-2xl border-dashed text-muted-foreground">
                      <FolderOpen aria-hidden className="size-8" />
                    </div>
                    <span className="flex flex-col px-1">
                      <span className="text-sm font-medium text-foreground">Unsorted</span>
                      <span className="text-xs text-muted-foreground">{formatCount(data.data.unsortedCount, "item")} from before projects</span>
                    </span>
                  </Link>
                </li>
              )}
              <li>
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className={cn("flex aspect-[4/3] w-full items-center justify-center gap-2 glass-chip rounded-2xl border-dashed text-sm text-muted-foreground hover:text-foreground", focusRing)}
                >
                  <Plus aria-hidden className="size-4" />
                  New project
                </button>
              </li>
            </ul>
          )}
        </>
      )}

      {trash && (
        <>
          {deleted.isPending && <Skeleton className="h-24 w-full max-w-md rounded-2xl" role="status" aria-label="Loading" />}
          {deleted.isError && (
            <p role="alert" className="text-sm">
              Couldn&apos;t load the trash: {deleted.error.message}
            </p>
          )}
          {deleted.isSuccess && deleted.data.length === 0 && (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState icon={<Trash2 aria-hidden className="size-6" />} title="The trash is empty" description="Projects you delete wait here, with everything in them, until you restore them." />
            </div>
          )}
          {deleted.isSuccess && deleted.data.length > 0 && (
            <ul className={GRID} data-testid="project-trash">
              {deleted.data.map((p) => (
                <li key={p.id} className="flex flex-col gap-2" data-testid="trashed-project">
                  <Cover url={p.coverUrl} dimmed />
                  <div className="flex items-center justify-between gap-2 px-1">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm text-muted-foreground">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{about(p)}</span>
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`Restore ${p.name}`}
                      onClick={async () => {
                        try {
                          await actions.restore(p.id);
                          await deleted.refetch();
                          toast.success("Restored.");
                        } catch {
                          /* the action already showed why */
                        }
                      }}
                    >
                      <RotateCcw aria-hidden className="size-3.5" />
                      Restore
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <NewProjectDialog
        open={creating}
        onOpenChange={setCreating}
        onCreate={async (name) => {
          const made = await actions.create(name);
          router.push(`/p/${made.id}/image`);
        }}
      />
    </div>
  );
}
