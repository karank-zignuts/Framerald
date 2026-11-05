"use client";

import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
  PenLine,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MediaPicker } from "@/components/media/media-picker";
import { ModelPicker } from "./model-picker";
import { PresetPicker } from "@/components/presets/preset-picker";
import { ProjectSelect } from "@/components/projects/project-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MODELS,
  type ImageModelKey,
  type ImageSize,
} from "@/lib/ai/models";
import { estimateImageCostUsd } from "@/lib/ai/cost";
import { formatCost, formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  IMAGE_SIZES,
  MAX_IMAGES,
  MAX_REFERENCES,
} from "@/features/generations/schemas";
import type { AssetDto } from "@/features/library/types";

export type ComposerValues = {
  prompt: string;
  model: ImageModelKey;
  aspectRatio: string;
  imageSize: ImageSize;
  count: number;
  references: AssetDto[];
  /** Chosen preset ids (a look), added to the prompt when you generate. */
  presetIds: string[];
};

type Props = {
  values: ComposerValues;
  onChange: (patch: Partial<ComposerValues>) => void;
  onSubmit: () => void;
  onAddFiles: (files: File[]) => void;
  uploading: number;
  /** A generation is running: block a second paid request from a double click or key repeat. */
  busy: boolean;
  /** Asks the agent to rewrite the prompt. */
  /** The project new images go into. */
  projectId: string | null;
  onProjectChange: (id: string | null) => void;
  onRefine: () => void;
  refining: boolean;
  /** The last refine can be undone until the prompt is edited by hand. */
  canUndoRefine: boolean;
  onUndoRefine: () => void;
  notice?: string | null;
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** The shape of a ratio, drawn inside a fixed square so every label lines up. `box` is the square's side in px. */
function RatioShape({ ratio, box = 24 }: { ratio: string; box?: number }) {
  const [w, h] = ratio.split(":").map(Number);
  const side = box - 4; // the longer side, leaving a little air around it
  const width = w >= h ? side : (side * w) / h;
  const height = w >= h ? (side * h) / w : side;
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center"
      style={{ width: box, height: box }}
    >
      <span
        className="block rounded-[3px] border-[1.5px] border-current"
        style={{ width, height }}
      />
    </span>
  );
}

const SIZE_NOTES = { "1K": "Fastest and cheapest", "2K": "Sharper detail, costs a little more", "4K": "Best visual fidelity, costs the most" } as const;

/** Tall to wide, the way the menu reads. */
const RATIO_ORDER = ["9:16", "2:3", "3:4", "4:5", "1:1", "5:4", "4:3", "3:2", "16:9", "21:9"] as const;

const chipClass =
  "inline-flex h-9 shrink-0 items-center whitespace-nowrap gap-1.5 rounded-lg border border-border bg-secondary px-3 text-sm text-foreground transition-colors duration-fast hover:bg-accent " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Chip({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <>
      {icon}
      <span className="sr-only">{label}: </span>
      <span className="tabular-nums">{value}</span>
      <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" />
    </>
  );
}

/** One row of chips that scrolls sideways when they don't all fit, with arrows at the edges. */
function ChipScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdges({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
    const observer = new ResizeObserver(update); // also runs once when observing starts
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, []);

  function scroll(direction: 1 | -1) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollBy({ left: direction * 240, behavior: reduce ? "auto" : "smooth" });
  }

  const arrow = "absolute top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg border border-border bg-secondary text-foreground shadow-md transition-colors duration-fast hover:bg-accent";
  return (
    <div className="relative flex min-w-0 flex-1 items-center">
      {edges.left && (
        <button type="button" aria-label="Scroll options left" onClick={() => scroll(-1)} className={cn(arrow, "left-0", focusRing)}>
          <ChevronLeft aria-hidden className="size-4" />
        </button>
      )}
      <div ref={ref} className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      {edges.right && (
        <button type="button" aria-label="Scroll options right" onClick={() => scroll(1)} className={cn(arrow, "right-0", focusRing)}>
          <ChevronRight aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}

/** The docked composer: prompt on top, a row of chips under it, Generate on the right. */
export function Composer({
  values,
  onChange,
  onSubmit,
  onAddFiles,
  uploading,
  busy,
  projectId,
  onProjectChange,
  onRefine,
  refining,
  canUndoRefine,
  onUndoRefine,
  notice,
}: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const [agentMode, setAgentMode] = useState(false);
  const [sweep, setSweep] = useState(0); // counts how many times Agent mode was turned on, to replay the edge sweep
  const [dragging, setDragging] = useState(false);
  const sizes = MODELS.image[values.model].imageSizes as readonly ImageSize[];
  const hasPrompt = values.prompt.trim().length > 0;
  const estimate = estimateImageCostUsd(MODELS.image[values.model].id, values.imageSize, values.count, values.references.length);

  function changeModel(key: ImageModelKey) {
    const supported = MODELS.image[key].imageSizes as readonly ImageSize[];
    onChange({
      model: key,
      imageSize: supported.includes(values.imageSize)
        ? values.imageSize
        : supported[0],
    });
  }

  /** Agent mode hands the idea to the Agent page to plan; otherwise it generates. */
  function send() {
    if (agentMode) {
      const idea = values.prompt.trim();
      onChange({ prompt: "" });
      router.push(`/agent?idea=${encodeURIComponent(idea)}`);
      return;
    }
    onSubmit();
  }

  return (
    <div
      ref={dockRef}
      className="relative mx-auto w-full max-w-5xl"
      data-agent-mode={agentMode}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (hasPrompt && !busy) send();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onAddFiles([...e.dataTransfer.files]);
        }}
        className={cn(
          "relative isolate flex w-full flex-col gap-3 border p-4 shadow-lg transition-[border-radius,background-color,border-color,backdrop-filter] duration-slow",
          agentMode
            ? "rounded-[1.75rem] border-brand/40 bg-popover/60 backdrop-blur-2xl"
            : "rounded-2xl bg-popover",
          dragging
            ? "border-brand bg-brand-muted"
            : agentMode
              ? ""
              : "border-border",
        )}
      >
        {/* Agent mode: a glow that stays inside the dock, and a bright arc that runs once around its edge. */}
        <span
          aria-hidden
          className={cn(
            "dock-glow pointer-events-none absolute inset-0 -z-10 rounded-[inherit] transition-opacity duration-slow",
            agentMode ? "opacity-100" : "opacity-0",
          )}
        />
        {agentMode && sweep > 0 && (
          <span key={sweep} aria-hidden className="dock-sweep pointer-events-none absolute inset-0 -z-10 rounded-[inherit]" />
        )}
        {notice && (
          <p
            role="status"
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground"
          >
            {notice}
          </p>
        )}

        {(values.references.length > 0 || uploading > 0) && (
          <div
            role="group"
            aria-label="Reference images"
            className="flex flex-wrap items-center gap-2"
          >
            {values.references.map((ref) => (
              <div
                key={ref.id}
                className="group relative size-14 overflow-hidden rounded-md border border-border"
                data-testid="reference"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ref.thumbnailUrl}
                  alt="Reference"
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  aria-label="Remove reference image"
                  onClick={() =>
                    onChange({
                      references: values.references.filter(
                        (r) => r.id !== ref.id,
                      ),
                    })
                  }
                  className={cn(
                    "absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded bg-background/80 text-foreground opacity-0 transition-opacity duration-fast hover:bg-background group-hover:opacity-100 focus-visible:opacity-100",
                    focusRing,
                  )}
                >
                  <X aria-hidden className="size-3" />
                </button>
              </div>
            ))}
            {Array.from({ length: uploading }, (_, i) => (
              <div
                key={`up-${i}`}
                role="status"
                className="skeleton size-14 rounded-md"
                aria-label="Uploading"
              />
            ))}
            <span className="ml-1 text-xs tabular-nums text-muted-foreground">
              {values.references.length} of {MAX_REFERENCES}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="prompt" className="sr-only">
            Prompt
          </label>
          <Textarea
            id="prompt"
            value={values.prompt}
            onChange={(e) => onChange({ prompt: e.target.value })}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                (e.metaKey || e.ctrlKey) &&
                hasPrompt &&
                !busy
              ) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              agentMode
                ? "Describe an idea and the agent plans the shots"
                : "Describe the image you want"
            }
            rows={3}
            maxLength={4000}
            readOnly={refining} // typing during a refine would be overwritten by the result
            className="field-sizing-content max-h-56 min-h-28 resize-none border-0 bg-transparent px-1 py-1 shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="flex items-center gap-3">
          <ChipScroller>
            <MediaPicker
              selectedIds={values.references.map((r) => r.id)}
              room={MAX_REFERENCES - values.references.length}
              onPick={(asset) => onChange({ references: [...values.references, asset] })}
              onUnpick={(id) => onChange({ references: values.references.filter((r) => r.id !== id) })}
              onUploadClick={() => fileInput.current?.click()}
              uploading={uploading}
              anchorRef={dockRef}
              trigger={
                <button
                  type="button"
                  aria-label="Add reference images"
                  title={
                    values.references.length
                      ? "Describe what to change or keep. The prompt edits these images."
                      : "Add images to edit them or to guide the result."
                  }
                  className={cn(chipClass, "w-9 justify-center px-0")}
                >
                  <Plus aria-hidden className="size-4" />
                </button>
              }
            />
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              hidden
              data-testid="reference-input"
              onChange={(e) => {
                onAddFiles([...(e.target.files ?? [])]);
                e.target.value = "";
              }}
            />

            <button
              type="button"
              aria-pressed={agentMode}
              onClick={() => {
                if (!agentMode) setSweep((n) => n + 1);
                setAgentMode(!agentMode);
              }}
              className={cn(
                chipClass,
                agentMode &&
                  "border-brand/50 bg-brand text-brand-foreground hover:bg-brand-strong",
              )}
            >
              <Sparkles aria-hidden className="size-3.5" />
              Agent
            </button>

            <ModelPicker value={values.model} onChange={changeModel} anchorRef={dockRef} />

            <Popover>
              <PopoverTrigger className={chipClass}>
                <Chip
                  label="Aspect ratio"
                  value={values.aspectRatio}
                  icon={<RatioShape ratio={values.aspectRatio} box={18} />}
                />
              </PopoverTrigger>
              <PopoverContent align="start" side="top" sideOffset={8} className="w-48 rounded-2xl p-2">
              <span id="ratio-label" className="block px-2 pb-1 pt-1 text-sm text-muted-foreground">
                Aspect ratio
              </span>
              <div role="radiogroup" aria-labelledby="ratio-label" className="flex flex-col gap-0.5">
                {RATIO_ORDER.map((r) => {
                  const selected = values.aspectRatio === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={`Aspect ratio ${r}`}
                      onClick={() => onChange({ aspectRatio: r })}
                      className={cn(
                        "flex h-10 items-center gap-3 rounded-lg px-2 text-sm text-foreground transition-colors duration-fast hover:bg-secondary",
                        selected && "bg-secondary",
                        focusRing,
                      )}
                    >
                      <RatioShape ratio={r} box={22} />
                      <span className="tabular-nums">{r}</span>
                      {selected && <Check aria-hidden className="ml-auto size-4 text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger className={chipClass}>
                <Chip label="Quality" value={values.imageSize} icon={<SlidersHorizontal aria-hidden className="size-3.5 text-muted-foreground" />} />
              </PopoverTrigger>
              <PopoverContent align="start" side="top" sideOffset={8} className="w-64 rounded-2xl p-2">
                <span id="size-label" className="block px-2 pb-1 pt-1 text-sm text-muted-foreground">
                  Quality
                </span>
                <div role="radiogroup" aria-labelledby="size-label" className="flex flex-col gap-0.5">
                  {IMAGE_SIZES.map((size) => {
                    const supported = sizes.includes(size);
                    const selected = values.imageSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={size}
                        disabled={!supported}
                        onClick={() => onChange({ imageSize: size })}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors duration-fast hover:bg-accent/60 disabled:opacity-40",
                          selected && "bg-secondary",
                          focusRing,
                        )}
                      >
                        <span className="flex flex-col">
                          <span className="tabular-nums">{size}</span>
                          <span className="text-xs text-muted-foreground">{supported ? SIZE_NOTES[size] : "Not on this model"}</span>
                        </span>
                        {selected && <Check aria-hidden className="ml-auto size-4 text-muted-foreground" />}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            <div role="group" aria-label="Number of images" className="inline-flex h-9 shrink-0 items-center rounded-lg border border-border bg-secondary text-sm">
              <button
                type="button"
                aria-label="Fewer images"
                disabled={values.count <= 1}
                onClick={() => onChange({ count: values.count - 1 })}
                className={cn("flex size-9 items-center justify-center rounded-l-lg text-muted-foreground transition-colors duration-fast hover:text-foreground disabled:opacity-40", focusRing)}
              >
                <Minus aria-hidden className="size-3.5" />
              </button>
              <span aria-live="polite" className="min-w-10 text-center tabular-nums text-foreground">
                {values.count}
                <span className="text-muted-foreground">/{MAX_IMAGES}</span>
              </span>
              <button
                type="button"
                aria-label="More images"
                disabled={values.count >= MAX_IMAGES}
                onClick={() => onChange({ count: values.count + 1 })}
                className={cn("flex size-9 items-center justify-center rounded-r-lg text-muted-foreground transition-colors duration-fast hover:text-foreground disabled:opacity-40", focusRing)}
              >
                <Plus aria-hidden className="size-3.5" />
              </button>
            </div>

            <Popover>
              <PopoverTrigger className={chipClass}>
                <Chip label="Look and project" value="Look" />
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="flex w-80 flex-col gap-4 p-3"
              >
                <PresetPicker
                  kind="image"
                  selected={values.presetIds}
                  onChange={(presetIds) => onChange({ presetIds })}
                  defaultOpen
                />
                <div className="flex flex-col gap-2">
                  <span className="text-sm text-muted-foreground">Project</span>
                  <ProjectSelect
                    label="Project"
                    value={projectId}
                    onChange={onProjectChange}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </ChipScroller>
          <div className="flex shrink-0 items-center gap-2">
            {canUndoRefine && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onUndoRefine}
                aria-label="Undo"
                title="Undo the refined prompt"
              >
                <Undo2 aria-hidden className="size-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRefine}
              disabled={!hasPrompt || refining}
              aria-busy={refining}
              aria-label="Refine with agent"
              title={refining ? "Refining" : "Refine with agent"}
            >
              <PenLine aria-hidden className={cn("size-4", refining && "motion-safe:animate-pulse")} />
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={!hasPrompt || (!agentMode && (uploading > 0 || busy))}
              aria-busy={busy && !agentMode}
              aria-keyshortcuts="Control+Enter Meta+Enter"
              title={
                agentMode
                  ? "Send to the agent (Ctrl or Cmd + Enter)"
                  : "Generate (Ctrl or Cmd + Enter)"
              }
              className="bg-brand px-6 text-brand-foreground hover:bg-brand-strong"
            >
              {agentMode ? (
                "Plan with agent"
              ) : (
                <>
                  {busy
                    ? "Generating"
                    : values.count > 1
                      ? `Generate ${formatCount(values.count, "image")}`
                      : "Generate"}
                  {estimate !== null && <span className="ml-2 text-sm font-normal tabular-nums opacity-70">{formatCost(estimate)}</span>}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
