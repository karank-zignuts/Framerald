"use client";

import { LayoutGrid } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SegmentedControl } from "@/components/ui/ix-segmented-control";
import { Switch } from "@/components/ui/switch";
import { updateView, useViewSettings } from "@/features/view/settings";

/** "View" button for the results area: grid or batch, tile size, tile names, clearing the prompt. */
export function ViewMenu({ showClearOption = true }: { showClearOption?: boolean }) {
  const view = useViewSettings();
  return (
    <Popover>
      <PopoverTrigger
        aria-label="View"
        title="View options"
        className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors duration-fast hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LayoutGrid aria-hidden className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-72 flex-col gap-4 p-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">View mode</span>
          <SegmentedControl
            label="View mode"
            value={view.mode}
            onValueChange={(v) => updateView({ mode: v as "grid" | "batch" })}
            options={[
              { value: "grid", label: "Grid" },
              { value: "batch", label: "Batch" },
            ]}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">Grid size</span>
          <SegmentedControl
            label="Grid size"
            value={view.size}
            onValueChange={(v) => updateView({ size: v as "s" | "m" | "l" })}
            options={[
              { value: "s", label: "S" },
              { value: "m", label: "M" },
              { value: "l", label: "L" },
            ]}
          />
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-foreground">
          Show tile details
          <Switch checked={view.details} onCheckedChange={(v) => updateView({ details: v })} aria-label="Show tile details" />
        </label>
        {showClearOption && (
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-foreground">
            Clear prompt on submit
            <Switch checked={view.clearOnSubmit} onCheckedChange={(v) => updateView({ clearOnSubmit: v })} aria-label="Clear prompt on submit" />
          </label>
        )}
      </PopoverContent>
    </Popover>
  );
}
