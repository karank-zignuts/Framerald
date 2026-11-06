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
import { useScopedHref } from "@/features/projects/context";
import { DockGradient } from "./dock-gradient";
import { MediaPickerPanel } from "@/components/media/media-picker";
import { ModelPickerPanel, ModelTrigger } from "./model-picker";
import { Anchor as PopoverAnchor } from "@radix-ui/react-popover";
import { PresetPicker } from "@/components/presets/preset-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { StarBorder } from "@/components/ui/star-border";
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
  "glass-chip inline-flex h-9 shrink-0 items-center whitespace-nowrap gap-1.5 rounded-xl px-3 text-sm text-foreground " +
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

/**
 * One row of chips that scrolls sideways when they don't all fit. The arrows float over the strip's two ends, so showing or hiding
 * them never moves or resizes anything, and the edges fade under them so they read as buttons. A `leading` item (the attach button)
 * stays put and never scrolls. A mouse wheel scrolls the strip sideways.
 */
function ChipScroller({ leading, children }: { leading?: React.ReactNode; children: React.ReactNode }) {
  const strip = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const update = () => {
      const left = el.scrollLeft > 2;
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
      setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
    };
    const observer = new ResizeObserver(update); // also runs once when observing starts
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    el.addEventListener("scroll", update, { passive: true });
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return; // a sideways gesture already scrolls it
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", update);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  function scroll(direction: 1 | -1) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.current?.scrollBy({ left: direction * 240, behavior: reduce ? "auto" : "smooth" });
  }

  const arrow = (side: "left" | "right", shown: boolean) =>
    cn(
      "glass-chip absolute top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-xl bg-[var(--tone-3)] text-foreground transition-opacity duration-base motion-reduce:transition-none",
      side === "left" ? "left-1" : "right-1",
      shown ? "opacity-100" : "pointer-events-none opacity-0",
      focusRing,
    );
  // The strip's ends fade where there is more to reach, so a chip slides under an arrow instead of being cut.
  const fade =
    edges.left && edges.right
      ? "linear-gradient(to right, transparent, black 44px, black calc(100% - 44px), transparent)"
      : edges.left
        ? "linear-gradient(to right, transparent, black 44px)"
        : edges.right
          ? "linear-gradient(to left, transparent, black 44px)"
          : undefined;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {leading && <span className="flex shrink-0">{leading}</span>}
      <div className="relative min-w-0 flex-1">
        <div
          ref={strip}
          data-testid="chip-strip"
          style={fade ? { maskImage: fade, WebkitMaskImage: fade } : undefined}
          className="flex min-w-0 touch-pan-x items-center gap-2 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {children}
        </div>
        <button type="button" aria-label="Scroll options left" aria-hidden={!edges.left} tabIndex={edges.left ? 0 : -1} disabled={!edges.left} onClick={() => scroll(-1)} className={arrow("left", edges.left)}>
          <ChevronLeft aria-hidden className="size-4" />
        </button>
        <button type="button" aria-label="Scroll options right" aria-hidden={!edges.right} tabIndex={edges.right ? 0 : -1} disabled={!edges.right} onClick={() => scroll(1)} className={arrow("right", edges.right)}>
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </div>
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
  onRefine,
  refining,
  canUndoRefine,
  onUndoRefine,
  notice,
}: Props) {
  const router = useRouter();
  const scoped = useScopedHref();
  const fileInput = useRef<HTMLInputElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  // Which big panel is open above the dock. They share one popover, anchored to the whole dock.
  const [panel, setPanel] = useState<"media" | "model" | null>(null);
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
      router.push(scoped(`/agent?idea=${encodeURIComponent(idea)}`));
      return;
    }
    onSubmit();
  }

  return (
    <Popover open={panel !== null} onOpenChange={(open) => !open && setPanel(null)}>
    <PopoverAnchor asChild>
    <div
      ref={dockRef}
      className="relative mx-auto w-full max-w-5xl"
      data-agent-mode={agentMode}
    >
      <form
        data-agent={agentMode}
        data-dragging={dragging}
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
          "glass-strong glass-dock group/dock relative isolate flex w-full flex-col gap-3 p-4 transition-[border-radius,background-color,border-color] duration-slow",
          agentMode ? "rounded-[1.75rem]" : "rounded-2xl",
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
        <DockGradient />
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
            className="field-sizing-content max-h-56 min-h-28 resize-none border-0 bg-transparent px-1 py-1 shadow-none focus-visible:ring-0 hover:border-transparent focus-visible:border-transparent focus-visible:shadow-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <ChipScroller
            leading={
        <button
          type="button"
          aria-label="Add reference images"
          aria-expanded={panel === "media"}
          aria-haspopup="dialog"
          data-panel-trigger
          onClick={() => setPanel(panel === "media" ? null : "media")}
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
          >

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

            <ModelTrigger value={values.model} open={panel === "model"} onClick={() => setPanel(panel === "model" ? null : "model")} />

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
                        "flex h-10 items-center gap-3 rounded-lg px-2 text-sm text-foreground transition-colors duration-fast hover:bg-[var(--wash-hover)]",
                        selected && "bg-[var(--wash-active)]",
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
                          "flex items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-foreground transition-colors duration-fast hover:bg-[var(--wash-hover)] disabled:opacity-40",
                          selected && "bg-[var(--wash-active)]",
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

            <div role="group" aria-label="Number of images" className="glass-chip inline-flex h-9 shrink-0 items-center rounded-xl text-sm">
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
                <Chip label="Look" value="Look" />
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
            <StarBorder>
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
            </StarBorder>
          </div>
        </div>
      </form>
    </div>
    </PopoverAnchor>
    <PopoverContent
      side="top"
      align="start"
      sideOffset={16}
      collisionPadding={16}
      onOpenAutoFocus={(e) => panel === "media" && e.preventDefault()}
      onInteractOutside={(e) => {
        // The two trigger buttons toggle the panel themselves; closing here as well would reopen it right away.
        if ((e.target as HTMLElement | null)?.closest("[data-panel-trigger]")) e.preventDefault();
      }}
      className={cn("flex flex-col gap-0 overflow-hidden rounded-2xl p-0", panel === "media" ? "w-[min(56rem,calc(100vw-2rem))]" : "w-[26rem] max-w-[calc(100vw-2rem)]")}
    >
      {panel === "media" && (
        <MediaPickerPanel
          selectedIds={values.references.map((r) => r.id)}
          room={MAX_REFERENCES - values.references.length}
          onPick={(asset) => onChange({ references: [...values.references, asset] })}
          onUnpick={(id) => onChange({ references: values.references.filter((r) => r.id !== id) })}
          onUploadClick={() => fileInput.current?.click()}
          uploading={uploading}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === "model" && <ModelPickerPanel value={values.model} onChange={changeModel} onClose={() => setPanel(null)} />}
    </PopoverContent>
    </Popover>
  );
}
