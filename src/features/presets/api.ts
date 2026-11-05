import { readJson } from "@/features/generations/api";
import type { CreatePresetInput, PresetKind, PresetTemplate } from "./templates";

export const fetchPresets = (kind: PresetKind) => fetch(`/api/presets?kind=${kind}`).then((r) => readJson<PresetTemplate[]>(r));

export const createPresetRequest = (input: CreatePresetInput) =>
  fetch("/api/presets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }).then((r) =>
    readJson<PresetTemplate>(r),
  );

export const deletePresetRequest = (id: string) =>
  fetch(`/api/presets/${id}`, { method: "DELETE" }).then((r) => readJson<unknown>(r).then(() => undefined));
