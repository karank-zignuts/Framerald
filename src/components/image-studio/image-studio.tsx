"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAsset, fetchReRunSettings } from "@/features/generations/api";
import { StudioWorkspace, type StudioInitial } from "./studio-workspace";

/**
 * Reads `?from=<generation>` (re-run its settings) or `?edit=<asset>` (use it as
 * a reference), loads what that needs, then mounts the workspace with those
 * values. Mounting after the load keeps the form's state out of effects.
 */
export function ImageStudio() {
  const params = useSearchParams();
  const from = params.get("from");
  const edit = params.get("edit");

  const initialQuery = useQuery({
    queryKey: ["studio-initial", from, edit],
    enabled: Boolean(from || edit),
    staleTime: Infinity,
    queryFn: async (): Promise<StudioInitial> => {
      if (from) return { ...(await fetchReRunSettings(from)), sourceGenerationId: from };
      return { references: [await fetchAsset(edit!)] };
    },
  });

  if ((from || edit) && initialQuery.isPending) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-5" role="status" aria-label="Loading settings">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-32 w-full max-w-sm rounded-lg" />
        <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
      </div>
    );
  }

  const notice = initialQuery.isError ? `Couldn't load those settings: ${initialQuery.error.message}` : null;
  return <StudioWorkspace key={`${from}-${edit}`} initial={initialQuery.data ?? null} notice={notice} />;
}
