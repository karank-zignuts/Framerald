import { readJson } from "@/features/generations/api";
import type { SpendDto } from "./server";

// `import type` is erased, so the server-only module is not bundled.
export const fetchSpend = () => fetch("/api/spend").then((r) => readJson<SpendDto>(r));

export const fetchSpentSince = (fromIso: string) =>
  fetch(`/api/spend/since?from=${encodeURIComponent(fromIso)}`).then((r) => readJson<{ usd: number }>(r));

export const fetchProjectSpend = (projectId: string) => fetch(`/api/projects/${projectId}/spend`).then((r) => readJson<{ usd: number }>(r));
