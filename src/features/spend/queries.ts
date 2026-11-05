import { useQuery } from "@tanstack/react-query";
import { fetchSpend, fetchSpentSince } from "./api";

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
