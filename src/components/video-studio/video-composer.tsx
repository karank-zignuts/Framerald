"use client";

import { PenLine, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { ImagePickerDialog } from "@/components/media/image-picker-dialog";
import { PresetPicker } from "@/components/presets/preset-picker";
import { Button } from "@/components/ui/button";
import { StarBorder } from "@/components/ui/star-border";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/ix-segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { videoCostUsd } from "@/lib/ai/cost";
import {
  MODELS,
  VIDEO_MODEL_KEYS,
  type VideoModelKey,
  type VideoResolution,
} from "@/lib/ai/models";
import { formatCost } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  VIDEO_DURATIONS,
  VIDEO_RATIOS,
  VIDEO_RESOLUTIONS,
} from "@/features/videos/schemas";
import type { AssetDto } from "@/features/library/types";

export type VideoValues = {
  prompt: string;
  model: VideoModelKey;
  aspectRatio: (typeof VIDEO_RATIOS)[number];
  durationSeconds: (typeof VIDEO_DURATIONS)[number];
  resolution: VideoResolution;
  audio: boolean;
  firstFrame: AssetDto | null;
  lastFrame: AssetDto | null;
  presetIds: string[];
};

type Slot = "first" | "last";

type Props = {
  values: VideoValues;
  onChange: (patch: Partial<VideoValues>) => void;
  onSubmit: () => void;
  onUploadFrame: (slot: Slot, file: File) => void;
  uploadingSlot: Slot | null;
  submitting: boolean;
  /** The project new clips go into. */
  onRefine: () => void;
  refining: boolean;
  canUndoRefine: boolean;
  onUndoRefine: () => void;
  notice?: string | null;
};

const MODEL_NOTES: Record<VideoModelKey, string> = {
  lite: "Cheapest. A preview model.",
  fast: "A good balance of speed and price.",
  default: "Best quality. Costs the most.",
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function FrameSlot({
  label,
  asset,
  uploading,
  disabled,
  onUpload,
  onPickLibrary,
  onRemove,
}: {
  label: string;
  asset: AssetDto | null;
  uploading: boolean;
  disabled?: boolean;
  onUpload: (file: File) => void;
  onPickLibrary: () => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {asset ? (
        <div
          className="group relative aspect-video overflow-hidden rounded-md border border-border"
          data-testid="frame"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.thumbnailUrl}
            alt={label}
            className="size-full object-cover"
          />
          <button
            type="button"
            aria-label={`Remove ${label.toLowerCase()}`}
            onClick={onRemove}
            className={cn(
              "absolute right-1 top-1 flex size-6 items-center justify-center rounded bg-background/80 text-foreground hover:bg-background",
              focusRing,
            )}
          >
            <X aria-hidden className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => input.current?.click()}
          aria-label={`Upload ${label.toLowerCase()}`}
          className={cn(
            "flex aspect-video items-center justify-center rounded-md border border-dashed border-border text-muted-foreground transition-colors duration-fast hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
            uploading && "motion-safe:animate-pulse",
            focusRing,
          )}
        >
          <Plus aria-hidden className="size-4" />
        </button>
      )}
      {!asset && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-fit px-1 text-xs text-muted-foreground"
          disabled={disabled}
          onClick={onPickLibrary}
        >
          From Library
        </Button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        data-testid={`${label.toLowerCase().replace(" ", "-")}-input`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function VideoComposer({
  values,
  onChange,
  onSubmit,
  onUploadFrame,
  uploadingSlot,
  submitting,
  onRefine,
  refining,
  canUndoRefine,
  onUndoRefine,
  notice,
}: Props) {
  const [picking, setPicking] = useState<Slot | null>(null);
  const spec = MODELS.video[values.model];
  const supported = spec.videoResolutions as readonly VideoResolution[];
  const hasPrompt = values.prompt.trim().length > 0;
  const estimate = videoCostUsd(spec.id, {
    seconds: values.durationSeconds,
    resolution: values.resolution,
    audio: values.audio,
  });

  function changeModel(key: VideoModelKey) {
    const next = MODELS.video[key]
      .videoResolutions as readonly VideoResolution[];
    onChange({
      model: key,
      resolution: next.includes(values.resolution) ? values.resolution : "720p",
    });
  }

  function changeDuration(d: (typeof VIDEO_DURATIONS)[number]) {
    // 1080p and 4K clips are 8 seconds long, so any other length goes back to 720p.
    onChange({
      durationSeconds: d,
      ...(d !== 8 &&
        values.resolution !== "720p" && { resolution: "720p" as const }),
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (hasPrompt && !submitting) onSubmit();
      }}
      className="flex min-h-0 flex-col"
    >
      <div className="flex flex-col gap-6 p-5 lg:flex-1 lg:overflow-y-auto">
        <h1 className="text-lg font-medium text-foreground">Video</h1>

        {notice && (
          <p
            role="status"
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground"
          >
            {notice}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="video-prompt"
            className="text-sm text-muted-foreground"
          >
            Prompt
          </Label>
          <Textarea
            id="video-prompt"
            value={values.prompt}
            onChange={(e) => onChange({ prompt: e.target.value })}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                (e.metaKey || e.ctrlKey) &&
                hasPrompt &&
                !submitting
              ) {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder="Describe the clip: who, where, and how the camera moves"
            rows={4}
            maxLength={2000}
            readOnly={refining}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
              <Kbd>Ctrl</Kbd>
              <Kbd>Enter</Kbd>
              to generate
            </p>
            <div className="flex items-center gap-1">
              {canUndoRefine && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onUndoRefine}
                >
                  Undo
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRefine}
                disabled={!hasPrompt || refining}
                aria-busy={refining}
              >
                <PenLine aria-hidden className="size-3.5" />
                {refining ? "Refining" : "Refine with agent"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="video-model"
            className="text-sm text-muted-foreground"
          >
            Model
          </Label>
          <Select
            value={values.model}
            onValueChange={(v) => changeModel(v as VideoModelKey)}
          >
            <SelectTrigger id="video-model" aria-label="Model">
              <SelectValue>{spec.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {VIDEO_MODEL_KEYS.map((key) => (
                <SelectItem key={key} value={key}>
                  <span className="flex flex-col">
                    <span>{MODELS.video[key].label}</span>
                    <span className="text-xs text-muted-foreground">
                      {MODEL_NOTES[key]}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>


        <div className="flex flex-col gap-2">
          <span
            id="video-ratio-label"
            className="text-sm text-muted-foreground"
          >
            Aspect ratio
          </span>
          <ToggleGroup
            type="single"
            aria-labelledby="video-ratio-label"
            value={values.aspectRatio}
            onValueChange={(v) =>
              v && onChange({ aspectRatio: v as VideoValues["aspectRatio"] })
            }
            className="grid grid-cols-2 gap-1.5 border-0 bg-transparent p-0"
          >
            {VIDEO_RATIOS.map((r) => (
              <ToggleGroupItem
                key={r}
                value={r}
                aria-label={`Aspect ratio ${r}`}
                className="flex h-12 items-center justify-center gap-2 rounded-md border border-border px-0 text-xs text-muted-foreground data-[state=on]:border-brand data-[state=on]:bg-secondary data-[state=on]:text-foreground"
              >
                <span
                  aria-hidden
                  className="block rounded-[3px] border border-current"
                  style={
                    r === "16:9"
                      ? { width: 22, height: 12 }
                      : { width: 12, height: 22 }
                  }
                />
                <span className="tabular-nums">{r}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Length</span>
            <SegmentedControl
              label="Length in seconds"
              value={String(values.durationSeconds)}
              onValueChange={(v) =>
                changeDuration(Number(v) as (typeof VIDEO_DURATIONS)[number])
              }
              options={VIDEO_DURATIONS.map((d) => ({
                value: String(d),
                label: `${d} s`,
              }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Resolution</span>
            <SegmentedControl
              label="Resolution"
              value={values.resolution}
              onValueChange={(v) =>
                onChange({ resolution: v as VideoResolution })
              }
              options={VIDEO_RESOLUTIONS.map((r) => ({
                value: r,
                label: r === "4k" ? "4K" : r,
                disabled:
                  !supported.includes(r) ||
                  (r !== "720p" && values.durationSeconds !== 8),
              }))}
            />
          </div>
        </div>
        <p className="-mt-3 text-xs text-muted-foreground">
          1080p and 4K need an 8 second clip.
        </p>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <Label htmlFor="video-sound" className="text-sm text-foreground">
              Sound
            </Label>
            <span className="text-xs text-muted-foreground">
              Adds speech and effects. Costs more.
            </span>
          </div>
          <Switch
            id="video-sound"
            checked={values.audio}
            onCheckedChange={(audio) => onChange({ audio })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">Frames</span>
          <div className="grid grid-cols-2 gap-3">
            <FrameSlot
              label="First frame"
              asset={values.firstFrame}
              uploading={uploadingSlot === "first"}
              onUpload={(f) => onUploadFrame("first", f)}
              onPickLibrary={() => setPicking("first")}
              onRemove={() => onChange({ firstFrame: null, lastFrame: null })}
            />
            <FrameSlot
              label="Last frame"
              asset={values.lastFrame}
              uploading={uploadingSlot === "last"}
              disabled={!values.firstFrame}
              onUpload={(f) => onUploadFrame("last", f)}
              onPickLibrary={() => setPicking("last")}
              onRemove={() => onChange({ lastFrame: null })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {values.firstFrame
              ? "The clip starts from your first frame."
              : "Add a first frame to animate an image. Leave it empty for text to video."}
          </p>
        </div>

        <PresetPicker
          kind="video"
          selected={values.presetIds}
          onChange={(presetIds) => onChange({ presetIds })}
        />
      </div>

      <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-border bg-card p-5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">Estimated cost</span>
          <span className="tabular-nums text-foreground" data-testid="estimate">
            {formatCost(estimate)}
          </span>
        </div>
        <StarBorder className="flex w-full">
          <Button
            type="submit"
            size="lg"
            disabled={!hasPrompt || submitting || uploadingSlot !== null}
            aria-busy={submitting}
            className="w-full bg-brand text-brand-foreground hover:bg-brand-strong"
          >
            {submitting ? "Starting" : "Generate video"}
          </Button>
        </StarBorder>
      </div>

      {picking && (
        <ImagePickerDialog
          onClose={() => setPicking(null)}
          onPick={(asset) => {
            onChange(
              picking === "first"
                ? { firstFrame: asset }
                : { lastFrame: asset },
            );
            setPicking(null);
          }}
        />
      )}
    </form>
  );
}
