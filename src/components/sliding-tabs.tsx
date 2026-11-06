"use client";

import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

type Props = {
  options: Option[];
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  /** "tabs" are real tabs (tablist, tab, aria-selected). "toggle" is a pressed-button group. */
  semantics?: "tabs" | "toggle";
  /** "md" for a primary tab row, "sm" for a secondary one. */
  size?: "md" | "sm";
  className?: string;
};

/**
 * Tabs with one pill that follows the active tab. The pill belongs to the active tab and moves between tabs as a shared layout
 * element, so it glides to the new tab and resizes to its width at the same moment. The label colours fade with it. With reduced
 * motion the pill simply appears on the new tab.
 */
export function SlidingTabs({ options, value, onValueChange, label, semantics = "tabs", size = "md", className }: Props) {
  const group = useId();
  const reduce = useReducedMotion();
  const tabs = semantics === "tabs";
  return (
    <LayoutGroup id={group}>
      <div role={tabs ? "tablist" : "group"} aria-label={label} className={cn("relative inline-flex items-center gap-1", className)}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role={tabs ? "tab" : undefined}
              aria-selected={tabs ? active : undefined}
              aria-pressed={tabs ? undefined : active}
              onClick={() => onValueChange(option.value)}
              className={cn(
                "relative z-10 rounded-full text-sm transition-colors duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                size === "md" ? "h-9 px-4" : "h-8 px-3",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="sliding-pill"
                  data-testid="sliding-pill"
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-full border border-[var(--glass-border)] bg-[var(--wash-selected)]"
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 36, mass: 0.5 }}
                />
              )}
              {option.label}
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
