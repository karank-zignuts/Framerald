"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProjectRequest } from "@/features/projects/api";
import { projectKeys, useProjects } from "@/features/projects/queries";

const NEW = "__new__";

type Props = {
  value: string | null;
  onChange: (id: string | null) => void;
  /** Accessible name of the menu. */
  label?: string;
  id?: string;
};

/** Pick a project, or make one without leaving the page. */
export function ProjectSelect({ value, onChange, label = "Project", id }: Props) {
  const qc = useQueryClient();
  const projects = useProjects();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const current = projects.data?.find((p) => p.id === value);

  async function create() {
    setSaving(true);
    try {
      const made = await createProjectRequest(name);
      await qc.invalidateQueries({ queryKey: projectKeys.all });
      onChange(made.id);
      setCreating(false);
      setName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't create the project.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Select
        value={value ?? undefined}
        onValueChange={(v) => {
          if (v === NEW) setCreating(true);
          else onChange(v);
        }}
      >
        <SelectTrigger id={id} aria-label={label}>
          <SelectValue placeholder="Unsorted">{current?.name}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {projects.data?.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={NEW}>New project</SelectItem>
        </SelectContent>
      </Select>

      {creating && (
        // Not a <form>: this sits inside studio forms, where Enter would otherwise start a paid generation.
        <div role="group" aria-label="New project" className="flex gap-2">
          <Input
            aria-label="Project name"
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              if (name.trim() && !saving) void create();
            }}
            maxLength={80}
            autoFocus
          />
          <Button type="button" size="sm" variant="secondary" disabled={!name.trim() || saving} onClick={() => void create()}>
            {saving ? "Adding" : "Add"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
