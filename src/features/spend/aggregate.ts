export type UsageKind = "image" | "video" | "agent" | "other";

/** One row of `usage_events`, as the database returns it. */
export type UsageRow = {
  cost_usd: number | string;
  created_at: string;
  unit_type: string;
  model: string;
};

export type SpendSummary = {
  monthToDateUsd: number;
  last30Usd: number;
  /** The last 30 UTC days ending today, oldest first, empty days included. */
  byDay: { date: string; usd: number }[];
  byKind: { kind: UsageKind; usd: number; share: number }[];
  byModel: { model: string; usd: number; share: number }[];
};

const DAY_MS = 86_400_000;
const round6 = (n: number) => Math.round(n * 1_000_000) / 1_000_000;

/** What was billed tells us which studio it came from. */
export function kindOfUnit(unit: string): UsageKind {
  if (unit === "image") return "image";
  if (unit === "video_second") return "video";
  if (unit === "input_token" || unit === "output_token") return "agent";
  return "other";
}

function ranked<K extends string>(totals: Map<string, number>, total: number, label: K) {
  return [...totals.entries()]
    .filter(([, usd]) => usd > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, usd]) => ({ [label]: key, usd: round6(usd), share: total > 0 ? usd / total : 0 }));
}

/**
 * Totals for the month so far and the last 30 days, all in UTC. Costs are
 * estimates from list prices, so these are too.
 */
export function aggregateSpend(rows: UsageRow[], now: Date): SpendSummary {
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const windowStart = todayStart - 29 * DAY_MS;
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);

  const days = Array.from({ length: 30 }, (_, i) => ({ start: windowStart + i * DAY_MS, usd: 0 }));
  const kinds = new Map<string, number>();
  const models = new Map<string, number>();
  let month = 0;
  let last30 = 0;

  for (const r of rows) {
    const at = Date.parse(r.created_at);
    const usd = Number(r.cost_usd);
    if (!Number.isFinite(at) || !Number.isFinite(usd) || at > now.getTime()) continue;
    if (at >= monthStart) month += usd;
    if (at < windowStart) continue;
    last30 += usd;
    days[Math.min(29, Math.floor((at - windowStart) / DAY_MS))].usd += usd;
    const kind = kindOfUnit(r.unit_type);
    kinds.set(kind, (kinds.get(kind) ?? 0) + usd);
    models.set(r.model, (models.get(r.model) ?? 0) + usd);
  }

  return {
    monthToDateUsd: round6(month),
    last30Usd: round6(last30),
    byDay: days.map((d) => ({ date: new Date(d.start).toISOString().slice(0, 10), usd: round6(d.usd) })),
    byKind: ranked(kinds, last30, "kind") as SpendSummary["byKind"],
    byModel: ranked(models, last30, "model") as SpendSummary["byModel"],
  };
}
