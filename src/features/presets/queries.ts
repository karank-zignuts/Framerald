import { useQuery } from "@tanstack/react-query";
import { fetchPresets } from "./api";
import type { PresetKind } from "./templates";

export const presetKeys = { list: (kind: PresetKind) => ["presets", kind] as const };

export const usePresets = (kind: PresetKind) =>
  useQuery({ queryKey: presetKeys.list(kind), queryFn: () => fetchPresets(kind), staleTime: 5 * 60_000 });
