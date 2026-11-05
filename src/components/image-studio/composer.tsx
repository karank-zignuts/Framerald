"use client";

import { Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/ix-segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { IMAGE_MODEL_KEYS, MODELS, type ImageModelKey, type ImageSize } from "@/lib/ai/models";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ASPECT_RATIOS, IMAGE_SIZES, MAX_IMAGES, MAX_REFERENCES } from "@/features/generations/schemas";
import type { AssetDto } from "@/features/library/types";

export type ComposerValues = {
  prompt: string;
  model: ImageModelKey;
  aspectRatio: string;
  imageSize: ImageSize;
  count: number;
  references: AssetDto[];
};

type Props = {
  values: ComposerValues;
  onChange: (patch: Partial<ComposerValues>) => void;
  onSubmit: () => void;
  onAddFiles: (files: File[]) => void;
  uploading: number;
  notice?: string | null;
};

const MODEL_NOTES: Record<ImageModelKey, string> = {
  default: "Balanced. A good first choice.",
  pro: "Best detail and text. Costs more.",
  fast: "Quickest and cheapest. 1K only.",
};

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function RatioShape({ ratio }: { ratio: string }) {
  const [w, h] = ratio.split(":").map(Number);
  const long = 16;
  return (
    <span
      aria-hidden
      className="block rounded-[3px] border border-current"
      style={{ width: w >= h ? long : (long * w) / h, height: w >= h ? (long * h) / w : long }}
    />
  );
}

export function Composer({ values, onChange, onSubmit, onAddFiles, uploading, notice }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const sizes = MODELS.image[values.model].imageSizes as readonly ImageSize[];
  const canAddMore = values.references.length + uploading < MAX_REFERENCES;
  const hasPrompt = values.prompt.trim().length > 0;

  function changeModel(key: ImageModelKey) {
    const supported = MODELS.image[key].imageSizes as readonly ImageSize[];
    onChange({ model: key, imageSize: supported.includes(values.imageSize) ? values.imageSize : supported[0] });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (hasPrompt) onSubmit();
      }}
      className="flex min-h-0 flex-col"
    >
      <div className="flex flex-col gap-6 p-5 lg:flex-1 lg:overflow-y-auto">
        <h1 className="text-lg font-medium text-foreground">Image</h1>

        {notice && (
          <p role="status" className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground">
            {notice}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="prompt" className="text-sm text-muted-foreground">
            Prompt
          </Label>
          <BorderBeam size="md" colorVariant="colorful" theme="dark" className="block w-full">
            <Textarea
              id="prompt"
              value={values.prompt}
              onChange={(e) => onChange({ prompt: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && hasPrompt) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="Describe the image you want"
              rows={5}
              maxLength={4000}
            />
          </BorderBeam>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Kbd>Ctrl</Kbd>
            <Kbd>Enter</Kbd>
            to generate
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span id="refs-label" className="text-sm text-muted-foreground">
              Reference images
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {values.references.length} of {MAX_REFERENCES}
            </span>
          </div>
          <div
            aria-labelledby="refs-label"
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
              "grid grid-cols-5 gap-2 rounded-lg border border-dashed p-2 transition-colors duration-fast",
              dragging ? "border-brand bg-brand-muted" : "border-border",
            )}
          >
            {values.references.map((ref) => (
              <div key={ref.id} className="group relative aspect-square overflow-hidden rounded-md border border-border" data-testid="reference">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ref.thumbnailUrl} alt="Reference" className="size-full object-cover" />
                <button
                  type="button"
                  aria-label="Remove reference image"
                  onClick={() => onChange({ references: values.references.filter((r) => r.id !== ref.id) })}
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
              <div key={`up-${i}`} className="aspect-square rounded-md bg-secondary motion-safe:animate-pulse" aria-label="Uploading" />
            ))}
            {canAddMore && (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md border border-border text-muted-foreground transition-colors duration-fast hover:bg-secondary hover:text-foreground",
                  focusRing,
                )}
                aria-label="Add reference images"
              >
                <Plus aria-hidden className="size-4" />
              </button>
            )}
          </div>
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
          <p className="text-xs text-muted-foreground">
            {values.references.length
              ? "Describe what to change or keep. The prompt edits these images."
              : "Add images to edit them or to guide the result. Drop files here too."}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="model" className="text-sm text-muted-foreground">
            Model
          </Label>
          <Select value={values.model} onValueChange={(v) => changeModel(v as ImageModelKey)}>
            <SelectTrigger id="model" aria-label="Model">
              {/* Only the name in the field; the one-line notes show in the list. */}
              <SelectValue>{MODELS.image[values.model].label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {IMAGE_MODEL_KEYS.map((key) => (
                <SelectItem key={key} value={key}>
                  <span className="flex flex-col">
                    <span>{MODELS.image[key].label}</span>
                    <span className="text-xs text-muted-foreground">{MODEL_NOTES[key]}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <span id="ratio-label" className="text-sm text-muted-foreground">
            Aspect ratio
          </span>
          <ToggleGroup
            type="single"
            aria-labelledby="ratio-label"
            value={values.aspectRatio}
            onValueChange={(v) => v && onChange({ aspectRatio: v })}
            className="grid grid-cols-5 gap-1.5 border-0 bg-transparent p-0"
          >
            {ASPECT_RATIOS.map((r) => (
              <ToggleGroupItem
                key={r}
                value={r}
                aria-label={`Aspect ratio ${r}`}
                className="flex h-12 flex-col items-center justify-center gap-1 rounded-md border border-border px-0 text-xs text-muted-foreground data-[state=on]:border-brand data-[state=on]:bg-secondary data-[state=on]:text-foreground"
              >
                <RatioShape ratio={r} />
                <span className="tabular-nums">{r}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Size</span>
            <SegmentedControl
              label="Size"
              value={values.imageSize}
              onValueChange={(v) => onChange({ imageSize: v as ImageSize })}
              options={IMAGE_SIZES.map((s) => ({ value: s, label: s, disabled: !sizes.includes(s) }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Images</span>
            <SegmentedControl
              label="Number of images"
              value={String(values.count)}
              onValueChange={(v) => onChange({ count: Number(v) })}
              options={Array.from({ length: MAX_IMAGES }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
            />
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t border-border bg-card p-5">
        <Button
          type="submit"
          size="lg"
          disabled={!hasPrompt || uploading > 0}
          className="w-full bg-brand text-brand-foreground hover:bg-brand-strong"
        >
          {values.count > 1 ? `Generate ${formatCount(values.count, "image")}` : "Generate"}
        </Button>
      </div>
    </form>
  );
}
