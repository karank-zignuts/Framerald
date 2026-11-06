"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Brush, Camera, Check, ChevronDown, Clapperboard, Film, Moon, Palette, Plus, Shapes, Sparkles, Trash2, Tv, X, Zap, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/ix-segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createPresetRequest, deletePresetRequest } from "@/features/presets/api";
import { presetKeys, usePresets } from "@/features/presets/queries";
import type { PresetGroup, PresetKind, PresetTemplate } from "@/features/presets/templates";
import { cn } from "@/lib/utils";
import { Ripple } from "@/components/loading/ripple";

type Props = {
  kind: PresetKind;
  /** Selected preset ids, at most one per group. */
  selected: string[];
  onChange: (ids: string[]) => void;
  /** Start expanded (for use inside a popover). */
  defaultOpen?: boolean;
  /** "details" is a collapsible row. "cards" is a panel of style cards, for use in a popover. */
  variant?: "details" | "cards";
};

const ICONS: Record<string, LucideIcon> = {
  "style-noir": Moon,
  "style-documentary": Camera,
  "style-anime": Brush,
  "style-35mm": Film,
  "style-neon": Zap,
  "style-vhs": Tv,
  "style-teal-orange": Palette,
  "style-silent": Clapperboard,
  "style-clay": Shapes,
};

/** What a preset adds, as a sentence for a card: the {prompt} slot removed and a capital letter. */
function describe(template: string): string {
  const text = template.replace(/^\{prompt\},?\s*/, "").replace(/,?\s*\{prompt\}/, "").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const GROUP_LABEL: Record<PresetGroup, string> = { camera: "Camera move", style: "Look" };
const chip =
  "h-8 rounded-md border border-border px-2.5 text-xs text-muted-foreground data-[state=on]:border-brand data-[state=on]:bg-secondary data-[state=on]:text-foreground";

/** The presets in the order they are added to a prompt: camera first, then look. */
export function selectedPresets(all: PresetTemplate[] | undefined, ids: string[]): PresetTemplate[] {
  const picked = (all ?? []).filter((p) => ids.includes(p.id));
  return [...picked.filter((p) => p.group === "camera"), ...picked.filter((p) => p.group === "style")];
}

export function PresetPicker({ kind, selected, onChange, defaultOpen, variant = "details" }: Props) {
  const qc = useQueryClient();
  const query = usePresets(kind);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [group, setGroup] = useState<PresetGroup>("style");
  const [template, setTemplate] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && template.trim().length > 0;
  const groups: PresetGroup[] = kind === "video" ? ["camera", "style"] : ["style"];
  const presets = query.data ?? [];

  function pick(g: PresetGroup, id: string) {
    const others = selected.filter((s) => presets.find((p) => p.id === s)?.group !== g);
    onChange(id ? [...others, id] : others);
  }

  async function save() {
    setSaving(true);
    try {
      const made = await createPresetRequest({
        name,
        group: kind === "image" ? "style" : group,
        kinds: group === "camera" ? ["video"] : ["image", "video"], // a look works for both; a camera move only for video
        template,
      });
      await Promise.all(["image", "video"].map((k) => qc.invalidateQueries({ queryKey: presetKeys.list(k as PresetKind) })));
      onChange([...selected.filter((s) => presets.find((p) => p.id === s)?.group !== made.group), made.id]);
      setAdding(false);
      setName("");
      setTemplate("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save the preset.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: PresetTemplate) {
    try {
      await deletePresetRequest(p.id);
      onChange(selected.filter((s) => s !== p.id));
      await Promise.all(["image", "video"].map((k) => qc.invalidateQueries({ queryKey: presetKeys.list(k as PresetKind) })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete the preset.");
    }
  }

  const addBlock = (
    <>
      {adding ? (
        // Not a <form>: this picker sits inside the studio's own form, and a nested one would let Enter in
        // the name field submit that form and start a paid generation.
        <div role="group" aria-label="New preset" className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <Input
            aria-label="Preset name"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault(); // Enter here means "save the preset", never "generate"
              if (canSave) void save();
            }}
            maxLength={60}
            autoFocus
          />
          {kind === "video" && (
            <SegmentedControl
              label="Preset type"
              value={group}
              onValueChange={(v) => setGroup(v as PresetGroup)}
              options={[
                { value: "style", label: "Look" },
                { value: "camera", label: "Camera move" },
              ]}
            />
          )}
          <Textarea
            aria-label="What the preset adds"
            placeholder="What it adds to your prompt, for example: shot on grainy 16mm"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={2}
            maxLength={300}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="secondary" disabled={saving || !canSave} onClick={() => void save()}>
              {saving ? "Saving" : "Save preset"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="ghost" size="sm" className="w-fit text-muted-foreground" onClick={() => setAdding(true)}>
          <Plus aria-hidden className="size-3.5" />
          Add your own
        </Button>
      )}
    </>
  );

  if (variant === "cards") {
    const styles = presets.filter((p) => p.group === "style");
    const current = selected.find((id) => styles.some((p) => p.id === id)) ?? "";
    return (
      <div data-testid="preset-picker" className="flex flex-col gap-4">
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium text-foreground">Look</p>
            <p className="text-xs text-muted-foreground">Adds a style to your prompt when you generate.</p>
          </div>
          {current && (
            <Button type="button" variant="ghost" size="sm" onClick={() => pick("style", "")}>
              Clear
            </Button>
          )}
        </header>

        {query.isPending && <Ripple label="Loading presets" className="mx-auto size-6" />}
        {query.isError && (
          <p role="alert" className="text-xs">
            Couldn&apos;t load presets.{" "}
            <button type="button" className="underline" onClick={() => void query.refetch()}>
              Try again
            </button>
          </p>
        )}

        <div role="radiogroup" aria-label="Look" className="grid grid-cols-2 gap-2">
          {styles.map((p) => {
            const on = p.id === current;
            const Icon = ICONS[p.id] ?? Sparkles;
            return (
              <div key={p.id} className="group/card relative">
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => pick("style", on ? "" : p.id)}
                  className={cn(
                    "flex h-full w-full flex-col gap-2 rounded-xl border p-3 text-left transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    on ? "border-brand/60 bg-[var(--wash-active)]" : "border-[var(--glass-border)] bg-[var(--wash-hover)] hover:bg-[var(--wash-active)]",
                  )}
                >
                  <span className="flex items-center justify-between">
                    <span className={cn("flex size-8 items-center justify-center rounded-lg border border-border bg-background", on ? "text-brand" : "text-muted-foreground")}>
                      <Icon aria-hidden className="size-4" />
                    </span>
                    {on && <Check aria-hidden className="size-4 text-brand" />}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">{describe(p.template)}</span>
                  </span>
                </button>
                {!p.builtin && (
                  <button
                    type="button"
                    aria-label={`Delete preset ${p.name}`}
                    onClick={() => void remove(p)}
                    className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity duration-fast hover:text-foreground focus-visible:opacity-100 group-hover/card:opacity-100 pointer-coarse:opacity-100"
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {addBlock}
      </div>
    );
  }

  const chosen = selectedPresets(presets, selected).map((p) => p.name);
  const title = kind === "video" ? "Camera and look" : "Look";

  return (
    <details className="group rounded-lg border border-border" data-testid="preset-picker" open={defaultOpen || undefined}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-xs text-foreground">{chosen.length ? chosen.join(", ") : "None"}</span>
          <ChevronDown aria-hidden className="size-4 shrink-0 transition-transform duration-fast group-open:rotate-180" />
        </span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-border p-3">
      {query.isPending && <Ripple label="Loading presets" className="size-5" />}
      {query.isError && (
        <p role="alert" className="text-xs">
          Couldn&apos;t load presets.{" "}
          <button type="button" className="underline" onClick={() => void query.refetch()}>
            Try again
          </button>
        </p>
      )}

      {groups.map((g) => {
        const inGroup = presets.filter((p) => p.group === g);
        if (query.isSuccess && inGroup.length === 0) return null;
        const value = selected.find((id) => inGroup.some((p) => p.id === id)) ?? "";
        return (
          <div key={g} className="flex flex-col gap-1.5">
            <span id={`preset-${g}`} className="text-sm text-muted-foreground">
              {GROUP_LABEL[g]}
            </span>
            <ToggleGroup
              type="single"
              aria-labelledby={`preset-${g}`}
              value={value}
              onValueChange={(v) => pick(g, v)}
              className="flex flex-wrap justify-start gap-1.5 border-0 bg-transparent p-0"
            >
              {inGroup.map((p) =>
                p.builtin ? (
                  <ToggleGroupItem key={p.id} value={p.id} className={chip}>
                    {p.name}
                  </ToggleGroupItem>
                ) : (
                  <div key={p.id} className="inline-flex items-center">
                    <ToggleGroupItem value={p.id} className={cn(chip, "rounded-r-none border-r-0")}>
                      {p.name}
                    </ToggleGroupItem>
                    <button
                      type="button"
                      aria-label={`Delete preset ${p.name}`}
                      onClick={() => void remove(p)}
                      className="flex h-8 w-7 items-center justify-center rounded-r-md border border-border text-muted-foreground transition-colors duration-fast hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X aria-hidden className="size-3" />
                    </button>
                  </div>
                ),
              )}
            </ToggleGroup>
          </div>
        );
      })}

      {addBlock}
      </div>
    </details>
  );
}
