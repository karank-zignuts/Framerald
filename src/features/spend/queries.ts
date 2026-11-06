import { useQuery } from "@tanstack/react-query";
import { fetchProjectSpend, fetchSpend, fetchSpentSince } from "./api";

export const useSpend = () => useQuery({ queryKey: ["spend"], queryFn: fetchSpend, staleTime: 30_000 });

/** What the app spent since `fromIso`. Refreshes every 30 seconds so the balance follows new generations. */
export const useSpentSince = (fromIso: string | null) =>
  useQuery({
    queryKey: ["spend", "since", fromIso],
    queryFn: () => fetchSpentSince(fromIso!),
    enabled: fromIso !== null,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

export const projectSpendKey = (projectId: string) => ["project-spend", projectId] as const;

/** What the project has cost so far. Refreshes every 30 seconds, and straight away when something paid finishes. */
export const useProjectSpend = (projectId: string | null) =>
  useQuery({
    queryKey: projectSpendKey(projectId ?? "none"),
    queryFn: () => fetchProjectSpend(projectId!),
    enabled: projectId !== null,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
