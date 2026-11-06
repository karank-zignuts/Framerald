"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { defaultProjectName } from "@/features/projects/name";

type NameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  initial: string;
  submitLabel: string;
  onSubmit: (name: string) => Promise<void>;
};

function NameDialog({ open, onOpenChange, title, description, initial, submitLabel, onSubmit }: NameDialogProps) {
  const [name, setName] = useState(initial);
  const [saving, setSaving] = useState(false);
  const clean = name.trim();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) setName(initial);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!clean || saving) return;
            setSaving(true);
            try {
              await onSubmit(clean);
              onOpenChange(false);
            } catch {
              /* the action already showed why */
            } finally {
              setSaving(false);
            }
          }}
        >
          <Input aria-label="Project name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus onFocus={(e) => e.currentTarget.select()} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!clean || saving} className="bg-brand text-brand-foreground hover:bg-brand-strong">
              {saving ? "Saving" : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewProjectDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (open: boolean) => void; onCreate: (name: string) => Promise<void> }) {
  // Remounted each time it opens, so it starts with a fresh date-time name.
  return open ? (
    <NameDialog open onOpenChange={onOpenChange} title="New project" description="Everything you make goes into a project. You can rename it any time." initial={defaultProjectName()} submitLabel="Create" onSubmit={onCreate} />
  ) : null;
}

export function RenameProjectDialog({ open, onOpenChange, name, onRename }: { open: boolean; onOpenChange: (open: boolean) => void; name: string; onRename: (name: string) => Promise<void> }) {
  return open ? <NameDialog open onOpenChange={onOpenChange} title="Rename project" description="Only the name changes." initial={name} submitLabel="Save" onSubmit={onRename} /> : null;
}

export function DeleteProjectDialog({ open, onOpenChange, name, onDelete }: { open: boolean; onOpenChange: (open: boolean) => void; name: string; onDelete: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete {name}?</DialogTitle>
          <DialogDescription>It moves to the trash with everything in it. You can restore it from the Projects page.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onDelete();
                onOpenChange(false);
              } catch {
                /* the action already showed why */
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Deleting" : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
