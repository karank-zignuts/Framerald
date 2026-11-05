"use client";

import { Check, ChevronDown, Search, Sparkles } from "lucide-react";
import { useId, useState } from "react";
import { Anchor as PopoverAnchor } from "@radix-ui/react-popover";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IMAGE_MODEL_KEYS, MODELS, type ImageModelKey } from "@/lib/ai/models";
import { cn } from "@/lib/utils";

// All three image models are Google's, so they share one provider mark.
const PROVIDER = { name: "Google", mark: "G" };

const ABOUT: Record<ImageModelKey, { note: string; badge?: string }> = {
  default: { note: "Google's next-gen flagship image model. Balanced, a good first choice." },
  pro: { note: "Best detail and text. Costs more.", badge: "Premium" },
  fast: { note: "Quickest and cheapest. 1K only." },
};

function ProviderTile({ active }: { active?: boolean }) {
  return (
    <span
      aria-hidden
      title={PROVIDER.name}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-base font-semibold",
        active ? "text-brand" : "text-muted-foreground",
      )}
    >
      {PROVIDER.mark}
    </span>
  );
}

/** A searchable list of models with the provider's mark, the name, a badge and one line about it. */
export function ModelPicker({ value, onChange, anchorRef }: { value: ImageModelKey; onChange: (key: ImageModelKey) => void; anchorRef?: React.RefObject<HTMLElement | null> }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listId = useId();
  const shown = IMAGE_MODEL_KEYS.filter((k) => {
    const text = `${MODELS.image[k].label} ${ABOUT[k].note}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      {anchorRef && <PopoverAnchor virtualRef={anchorRef as React.RefObject<HTMLElement>} />}
      <PopoverTrigger
        role="combobox"
        aria-label="Model"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        className="inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-secondary px-3 text-sm text-foreground transition-colors duration-fast hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span aria-hidden className="text-sm font-semibold text-muted-foreground">
          {PROVIDER.mark}
        </span>
        <span>{MODELS.image[value].label}</span>
        <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent side="top" align="start" sideOffset={16} collisionPadding={16} className="flex w-[26rem] max-w-[calc(100vw-2rem)] flex-col gap-1 rounded-2xl p-0">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search aria-hidden className="size-4 text-muted-foreground" />
          <input
            aria-label="Search models"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex max-h-[min(60vh,28rem)] flex-col gap-1 overflow-y-auto p-2">
          <p className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
            <Sparkles aria-hidden className="size-3.5" />
            Featured models
          </p>
          <div role="listbox" id={listId} aria-label="Models" className="flex flex-col gap-1">
            {shown.map((key) => {
              const selected = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-fast hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected && "bg-secondary",
                  )}
                >
                  <ProviderTile active={selected} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {MODELS.image[key].label}
                      {ABOUT[key].badge && (
                        <span className="rounded bg-brand px-1.5 py-0.5 text-[0.6875rem] font-semibold leading-none text-brand-foreground">{ABOUT[key].badge}</span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{ABOUT[key].note}</span>
                  </span>
                  {selected && <Check aria-hidden className="size-4 shrink-0 text-brand" />}
                </button>
              );
            })}
            {shown.length === 0 && <p className="px-2 py-4 text-center text-sm text-muted-foreground">No model matches that.</p>}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
