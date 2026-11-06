"use client";

import { usePathname } from "next/navigation";
import { ViewMenu } from "@/components/media/view-menu";
import { BalanceChip } from "./balance-chip";
import { ProjectSpendChip } from "./project-spend-chip";

/** Top-right of every page: the view options (Image only) and the balance. */
export function HeaderTools() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-2">
      {/^\/p\/[^/]+\/image/.test(pathname) && <ViewMenu />}
      {/^\/p\/[^/]+\/library/.test(pathname) && <ViewMenu variant="library" />}
      <ProjectSpendChip />
      <BalanceChip />
    </div>
  );
}
