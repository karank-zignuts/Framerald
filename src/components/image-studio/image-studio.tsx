"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { parsePrefill } from "@/features/agent/prefill";
import { fetchAsset, fetchReRunSettings } from "@/features/generations/api";
import { StudioWorkspace, type StudioInitial } from "./studio-workspace";
import { PageLoader } from "@/components/loading/ripple";

/**
 * Reads `?from=<generation>` (re-run its settings), `?edit=<asset>` (use it as
 * a reference) or `?prompt=&ratio=` (a shot sent from the agent), loads what
 * that needs, then mounts the workspace with those values. Mounting after the load keeps the form's state out of effects.
 */
export function ImageStudio() {
  const params = useSearchParams();
  const from = params.get("from");
  const edit = params.get("edit");
  const prefill = from || edit ? null : parsePrefill(params);

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
    return <PageLoader label="Loading settings" />;
  }

  const notice = initialQuery.isError ? `Couldn't load those settings: ${initialQuery.error.message}` : null;
  return (
    <StudioWorkspace
      key={`${from}-${edit}-${prefill?.prompt}-${prefill?.aspectRatio}`}
      initial={initialQuery.data ?? prefill}
      notice={notice}
    />
  );
}
