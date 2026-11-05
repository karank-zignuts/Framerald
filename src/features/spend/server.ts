import "server-only";
import { db, OWNER_ID } from "@/lib/supabase/server";
import { aggregateSpend, type SpendSummary, type UsageRow } from "./aggregate";

export type ExpensiveGeneration = {
  id: string;
  kind: "image" | "video";
  prompt: string;
  model: string;
  costUsd: number;
  createdAt: string;
};

export type SpendDto = {
  summary: SpendSummary;
  /** Generations and agent replies in the last 30 days whose cost we couldn't work out. They are not in the totals. */
  unknownCostCount: number;
  expensive: ExpensiveGeneration[];
  generatedAt: string;
};

const PAGE = 1000; // PostgREST returns at most 1000 rows per request
const MAX_PAGES = 20;

async function fetchUsage(sinceIso: string): Promise<UsageRow[]> {
  const rows: UsageRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await db()
      .from("usage_events")
      .select("model,unit_type,cost_usd,created_at")
      .eq("owner_id", OWNER_ID)
      .gte("created_at", sinceIso)
      .order("created_at")
      .order("id") // tiebreaker, so rows sharing a timestamp can't straddle a page and be skipped or repeated
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw new Error(`Couldn't load your spend: ${error.message}`);
    rows.push(...((data ?? []) as UsageRow[]));
    if ((data?.length ?? 0) < PAGE) break;
  }
  return rows;
}

export async function getSpend(now = new Date()): Promise<SpendDto> {
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const windowStart = new Date(todayStart - 29 * 86_400_000).toISOString();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const since = monthStart < windowStart ? monthStart : windowStart;

  const [usage, unknownGenerations, unknownReplies, expensive] = await Promise.all([
    fetchUsage(since),
    db()
      .from("generations")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", OWNER_ID)
      .eq("status", "succeeded")
      .is("cost_usd", null)
      .gte("created_at", windowStart),
    db()
      .from("agent_messages")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", OWNER_ID)
      .eq("role", "assistant")
      .is("cost_usd", null) // failed replies and unpriced ones: Google may still have billed for them
      .gte("created_at", windowStart),
    db()
      .from("generations")
      .select("id,kind,prompt,model,cost_usd,created_at")
      .eq("owner_id", OWNER_ID)
      .not("cost_usd", "is", null)
      .gte("created_at", windowStart)
      .order("cost_usd", { ascending: false })
      .limit(8),
  ]);
  for (const result of [unknownGenerations, unknownReplies, expensive]) {
    if (result.error) throw new Error(`Couldn't load your spend: ${result.error.message}`);
  }

  return {
    summary: aggregateSpend(usage, now),
    unknownCostCount: (unknownGenerations.count ?? 0) + (unknownReplies.count ?? 0),
    expensive: (expensive.data ?? []).map((g) => ({
      id: g.id as string,
      kind: g.kind as "image" | "video",
      prompt: g.prompt as string,
      model: g.model as string,
      costUsd: Number(g.cost_usd),
      createdAt: g.created_at as string,
    })),
    generatedAt: now.toISOString(),
  };
}

/** Everything the app spent on paid calls since a moment, in USD. Powers the balance chip. */
export async function getSpentSince(sinceIso: string): Promise<number> {
  const rows = await fetchUsage(sinceIso);
  return rows.reduce((sum, r) => sum + Number(r.cost_usd ?? 0), 0);
}
