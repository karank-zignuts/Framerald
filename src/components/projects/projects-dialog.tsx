"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createProjectRequest, deleteProjectRequest, renameProjectRequest } from "@/features/projects/api";
import { projectKeys, useProjects } from "@/features/projects/queries";

/** Add, rename and delete projects. Deleting one keeps its items; they stay under All. */
export function ProjectsDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const projects = useProjects();
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: projectKeys.all });
  const fail = (error: unknown, fallback: string) => toast.error(error instanceof Error ? error.message : fallback);

  async function add() {
    try {
      await createProjectRequest(newName);
      setNewName("");
      await refresh();
    } catch (error) {
      fail(error, "Couldn't create the project.");
    }
  }

  async function rename() {
    if (!editing) return;
    try {
      await renameProjectRequest(editing.id, editing.name);
      setEditing(null);
      await refresh();
    } catch (error) {
      fail(error, "Couldn't rename the project.");
    }
  }

  async function remove(id: string) {
    try {
      await deleteProjectRequest(id);
      setConfirming(null);
      await refresh();
      await qc.invalidateQueries({ queryKey: ["library"] });
    } catch (error) {
      fail(error, "Couldn't delete the project.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md gap-4" data-testid="projects-dialog">
        <DialogTitle className="text-base font-medium">Projects</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Group images, clips and chats. Deleting a project keeps what is in it.
        </DialogDescription>

        <div role="group" aria-label="New project" className="flex gap-2">
          <Input
            aria-label="New project name"
            placeholder="New project"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                e.preventDefault();
                void add();
              }
            }}
            maxLength={80}
          />
          <Button type="button" variant="secondary" disabled={!newName.trim()} onClick={() => void add()}>
            Add
          </Button>
        </div>

        {projects.isPending && <p className="text-sm text-muted-foreground">Loading projects</p>}
        {projects.isError && (
          <p role="alert" className="text-sm">
            Couldn&apos;t load projects: {projects.error.message}
          </p>
        )}
        {projects.isSuccess && projects.data.length === 0 && <p className="text-sm text-muted-foreground">No projects yet.</p>}

        <ul className="flex max-h-[50dvh] flex-col gap-1 overflow-y-auto">
          {projects.data?.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
              {editing?.id === p.id ? (
                <>
                  <Input
                    aria-label="Project name"
                    value={editing.name}
                    onChange={(e) => setEditing({ id: p.id, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editing.name.trim()) {
                        e.preventDefault();
                        void rename();
                      }
                      if (e.key === "Escape") setEditing(null);
                    }}
                    maxLength={80}
                    autoFocus
                  />
                  <Button type="button" size="icon" variant="secondary" aria-label="Save name" onClick={() => void rename()} disabled={!editing.name.trim()}>
                    <Check aria-hidden className="size-4" />
                  </Button>
                </>
              ) : confirming === p.id ? (
                <div role="alert" className="flex w-full items-center justify-between gap-2 text-sm">
                  <span>Delete &ldquo;{p.name}&rdquo;? Its items stay.</span>
                  <span className="flex gap-1">
                    <Button type="button" size="sm" variant="destructive" onClick={() => void remove(p.id)}>
                      Delete
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                      Cancel
                    </Button>
                  </span>
                </div>
              ) : (
                <>
                  <span className="min-w-0 truncate text-sm" data-testid="project-name">
                    {p.name}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <Button type="button" size="icon" variant="ghost" aria-label={`Rename ${p.name}`} onClick={() => setEditing({ id: p.id, name: p.name })}>
                      <Pencil aria-hidden className="size-4" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" aria-label={`Delete ${p.name}`} onClick={() => setConfirming(p.id)}>
                      <Trash2 aria-hidden className="size-4" />
                    </Button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
