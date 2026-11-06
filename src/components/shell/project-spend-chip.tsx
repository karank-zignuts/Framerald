"use client";

import { Coins } from "lucide-react";
import { useProjectSpend } from "@/features/spend/queries";
import { formatMoney } from "@/lib/format";
import { UNSORTED } from "@/features/projects/schemas";
import { useCurrentProject } from "./use-current-project";

/** Top right: what this project has cost so far, in rupees. Estimated from Google's list prices, like every amount in the app. */
export function ProjectSpendChip() {
  const current = useCurrentProject();
  const projectId = current.inProject && !current.isUnsorted && current.id && current.id !== UNSORTED ? current.id : null;
  const spend = useProjectSpend(projectId);
  if (!projectId) return null;
  return (
    <span
      data-testid="project-spend"
      title="Spent in this project so far (estimated from Google's list prices)"
      className="glass-chip inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm text-foreground"
    >
      <Coins aria-hidden className="size-4 text-muted-foreground" />
      <span className="tabular-nums">{spend.data ? formatMoney(spend.data.usd) : "..."}</span>
      <span className="text-muted-foreground">spent</span>
    </span>
  );
}
