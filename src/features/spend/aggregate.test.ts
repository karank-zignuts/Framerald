import { describe, expect, it } from "vitest";
import { aggregateSpend, kindOfUnit, type UsageRow } from "./aggregate";

const now = new Date("2026-11-05T12:00:00Z");
const row = (usd: number | string, at: string, unit = "image", model = "gemini-nano-banana-2.1"): UsageRow => ({
  cost_usd: usd,
  created_at: at,
  unit_type: unit,
  model,
});

describe("kindOfUnit", () => {
  it("maps what was billed to image, video or agent", () => {
    expect(kindOfUnit("image")).toBe("image");
    expect(kindOfUnit("video_second")).toBe("video");
    expect(kindOfUnit("input_token")).toBe("agent");
    expect(kindOfUnit("output_token")).toBe("agent");
    expect(kindOfUnit("something_new")).toBe("other");
  });
});

describe("aggregateSpend", () => {
  it("is all zeros, with no NaN, when there is nothing", () => {
    const r = aggregateSpend([], now);
    expect(r.monthToDateUsd).toBe(0);
    expect(r.last30Usd).toBe(0);
    expect(r.byDay).toHaveLength(30);
    expect(r.byDay.every((d) => d.usd === 0)).toBe(true);
    expect(r.byKind).toEqual([]);
    expect(r.byModel).toEqual([]);
  });

  it("separates this calendar month from the last 30 days, in UTC", () => {
    const r = aggregateSpend(
      [
        row(1, "2026-11-05T09:00:00Z"), // this month and last 30 days
        row(2, "2026-10-20T09:00:00Z"), // last 30 days only
        row(4, "2026-09-30T09:00:00Z"), // older than both
      ],
      now,
    );
    expect(r.monthToDateUsd).toBe(1);
    expect(r.last30Usd).toBe(3);
  });

  it("gives 30 days ending today, oldest first, with empty days as zero", () => {
    const r = aggregateSpend([row(0.5, "2026-11-05T00:00:01Z"), row(0.25, "2026-11-04T23:59:59Z")], now);
    expect(r.byDay[0].date).toBe("2026-10-07");
    expect(r.byDay.at(-1)).toEqual({ date: "2026-11-05", usd: 0.5 });
    expect(r.byDay.at(-2)).toEqual({ date: "2026-11-04", usd: 0.25 });
    expect(r.byDay.filter((d) => d.usd === 0)).toHaveLength(28);
  });

  it("accepts costs that arrive as strings and adds without float noise", () => {
    const r = aggregateSpend([row("0.1", "2026-11-05T01:00:00Z"), row(0.2, "2026-11-05T02:00:00Z")], now);
    expect(r.last30Usd).toBe(0.3);
  });

  it("groups by kind and by model, largest first, with shares that add up to 1", () => {
    const r = aggregateSpend(
      [
        row(0.12, "2026-11-05T01:00:00Z", "video_second", "veo-3.1-lite-generate-001"),
        row(0.039, "2026-11-05T02:00:00Z", "image", "gemini-nano-banana-2.1"),
        row(0.001, "2026-11-05T03:00:00Z", "input_token", "gemini-3.8-flash"),
        row(0.003, "2026-11-05T03:00:00Z", "output_token", "gemini-3.8-flash"),
      ],
      now,
    );
    expect(r.byKind.map((k) => k.kind)).toEqual(["video", "image", "agent"]);
    expect(r.byKind.find((k) => k.kind === "agent")?.usd).toBe(0.004);
    expect(r.byModel.map((m) => m.model)).toEqual(["veo-3.1-lite-generate-001", "gemini-nano-banana-2.1", "gemini-3.8-flash"]);
    expect(r.byKind.reduce((n, k) => n + k.share, 0)).toBeCloseTo(1, 6);
    expect(r.byModel[0].share).toBeCloseTo(0.12 / 0.163, 4);
  });
});
