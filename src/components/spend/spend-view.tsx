"use client";

import { Button } from "@/components/ui/button";
import { modelLabel } from "@/lib/ai/models";
import { formatMoney } from "@/lib/format";
import type { UsageKind } from "@/features/spend/aggregate";
import { useSpend } from "@/features/spend/queries";
import type { SpendDto } from "@/features/spend/server";
import { PageLoader } from "@/components/loading/ripple";

const KIND_LABEL: Record<UsageKind, string> = { image: "Images", video: "Video", agent: "Agent", other: "Other" };

const dayLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

function Bars({ days }: { days: SpendDto["summary"]["byDay"] }) {
  const max = Math.max(...days.map((d) => d.usd), 0);
  const top = days.reduce((a, b) => (b.usd > a.usd ? b : a), days[0]);
  const summary = max > 0 ? `Spend per day for the last 30 days. The highest was ${formatMoney(top.usd)} on ${dayLabel(top.date)}.` : "No spend in the last 30 days.";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-xs tabular-nums text-muted-foreground">
        <span>{max > 0 ? `Peak ${formatMoney(max)}` : "Nothing yet"}</span>
      </div>
      <div role="img" aria-label={summary} className="flex h-40 items-end gap-1 border-b border-border" data-testid="spend-bars">
        {days.map((d, i) => (
          <div key={d.date} title={`${dayLabel(d.date)}: ${formatMoney(d.usd)}`} className="flex h-full flex-1 items-end">
            <div
              className={`w-full rounded-t-sm ${i === days.length - 1 ? "bg-brand" : "bg-muted-foreground/50"}`}
              style={{ height: d.usd > 0 && max > 0 ? `${Math.max((d.usd / max) * 100, 2)}%` : "0" }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{dayLabel(days[0].date)}</span>
        <span>Today</span>
      </div>
      {/* The same numbers as a table, for screen readers. */}
      <table className="sr-only">
        <caption>Spend per day, last 30 days</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Spend</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <td>{dayLabel(d.date)}</td>
              <td>{formatMoney(d.usd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: { label: string; usd: number; share: number }[] }) {
  return (
    <section aria-labelledby={`h-${title}`} className="flex flex-col gap-3">
      <h2 id={`h-${title}`} className="text-sm font-medium text-foreground">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing yet.</p>
      ) : (
        <table className="w-full text-sm">
          <caption className="sr-only">{title}</caption>
          <thead className="sr-only">
            <tr>
              <th>Name</th>
              <th>Spend</th>
              <th>Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-border last:border-0">
                <td className="py-2 pr-3">
                  <span className="block truncate">{r.label}</span>
                  <span aria-hidden className="mt-1 block h-1 w-full rounded bg-secondary">
                    <span className="block h-1 rounded bg-muted-foreground/60" style={{ width: `${Math.max(r.share * 100, 1)}%` }} />
                  </span>
                </td>
                <td className="whitespace-nowrap py-2 pl-3 text-right tabular-nums">{formatMoney(r.usd)}</td>
                <td className="w-14 whitespace-nowrap py-2 pl-3 text-right tabular-nums text-muted-foreground">{Math.round(r.share * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function SpendView() {
  const query = useSpend();

  return (
    // Focusable and named, so a keyboard user can scroll this region even though nothing inside it is a control.
    <div
      role="region"
      aria-label="Spend"
      tabIndex={0}
      className="mx-auto flex w-full max-w-4xl flex-col gap-10 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:overflow-y-auto"
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-medium text-foreground">Spend</h1>
        <p className="text-sm text-muted-foreground">Estimated from Google&apos;s list prices. Your real bill can differ.</p>
      </header>

      {query.isPending && (
        <PageLoader label="Loading spend" />
      )}

      {query.isError && (
        <div role="alert" className="flex max-w-md flex-col items-start gap-3 rounded-lg border border-destructive/50 p-4">
          <p className="text-sm">Couldn&apos;t load your spend: {query.error.message}</p>
          <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {query.data && <SpendBody data={query.data} />}
    </div>
  );
}

function SpendBody({ data }: { data: SpendDto }) {
  const { summary, unknownCostCount, expensive } = data;
  const empty = summary.last30Usd === 0;

  return (
    <>
      <section aria-label="Totals" className="flex flex-col gap-1">
        <p className="text-3xl font-medium tabular-nums text-foreground" data-testid="spend-month">
          {formatMoney(summary.monthToDateUsd)}
        </p>
        <p className="text-sm text-muted-foreground">so far this month</p>
        <p className="mt-2 text-sm tabular-nums text-foreground" data-testid="spend-30">
          {formatMoney(summary.last30Usd)} in the last 30 days
        </p>
        {unknownCostCount > 0 && (
          <p role="note" className="mt-2 max-w-xl text-sm text-muted-foreground" data-testid="spend-unknown">
            {unknownCostCount} {unknownCostCount === 1 ? "item" : "items"} in the last 30 days had no known price, so {unknownCostCount === 1 ? "it isn't" : "they aren't"} counted above.
          </p>
        )}
        {empty && <p className="mt-2 text-sm text-muted-foreground">No paid calls in the last 30 days.</p>}
      </section>

      <section aria-labelledby="h-days" className="flex flex-col gap-3">
        <h2 id="h-days" className="text-sm font-medium text-foreground">
          Per day
        </h2>
        <Bars days={summary.byDay} />
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Breakdown title="By kind" rows={summary.byKind.map((k) => ({ label: KIND_LABEL[k.kind], usd: k.usd, share: k.share }))} />
        <Breakdown title="By model" rows={summary.byModel.map((m) => ({ label: modelLabel(m.model), usd: m.usd, share: m.share }))} />
      </div>

      <section aria-labelledby="h-top" className="flex flex-col gap-3">
        <h2 id="h-top" className="text-sm font-medium text-foreground">
          Most expensive
        </h2>
        {expensive.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <ol className="flex flex-col" data-testid="expensive">
            {expensive.map((g) => (
              <li key={g.id} className="flex items-baseline justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-foreground">{g.prompt}</span>
                  <span className="text-xs text-muted-foreground">
                    {g.kind === "video" ? "Video" : "Image"}, {modelLabel(g.model)}, {dayLabel(g.createdAt.slice(0, 10))}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">{formatMoney(g.costUsd)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
