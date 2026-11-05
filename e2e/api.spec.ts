import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { trackAsset } from "./cleanup";

// The routes over HTTP, with the AI mocked (E2E_MOCK_AI=1, set by playwright.config.ts).
// Mock images cost $0.039 each (the usage of one real 1K call).

type Asset = {
  id: string; url: string; thumbnailUrl: string; width: number; height: number; isFavorite: boolean;
  generation: { id: string; prompt: string; mode: string; costUsd: number | null } | null;
};
type Result = { id: string; status: string; error: string | null; costUsd: number | null; assets: Asset[] };

const tag = (s: string) => `[e2e] ${s} ${Math.random().toString(36).slice(2, 8)}`;

async function png() {
  return sharp({ create: { width: 64, height: 48, channels: 3, background: "#10b981" } }).png().toBuffer();
}

test("rejects bad requests with a plain message", async ({ request }) => {
  const empty = await request.post("/api/generations", { data: { prompt: "   " } });
  expect(empty.status()).toBe(400);
  expect((await empty.json()).error).toBe("Write a prompt first.");

  const many = await request.post("/api/generations", { data: { prompt: tag("x"), count: 9 } });
  expect(many.status()).toBe(400);

  const lite = await request.post("/api/generations", { data: { prompt: tag("x"), model: "fast", imageSize: "4K" } });
  expect(lite.status()).toBe(400);
  expect((await lite.json()).error).toMatch(/can't make this size/);
});

test("refuses requests that come from another website", async ({ request }) => {
  const res = await request.post("/api/generations", {
    headers: { origin: "https://evil.example" },
    data: { prompt: tag("x") },
  });
  expect(res.status()).toBe(403);
});

test("makes an image: stored, linked, thumbnailed, with its cost", async ({ request }) => {
  const res = await request.post("/api/generations", {
    data: { prompt: tag("red door"), aspectRatio: "16:9" },
  });
  expect(res.status()).toBe(200);
  const gen = (await res.json()) as Result;
  expect(gen.status).toBe("succeeded");
  expect(gen.error).toBeNull();
  expect(gen.costUsd).toBe(0.039);
  expect(gen.assets).toHaveLength(1);

  const [asset] = gen.assets;
  expect(Math.round((asset.width / asset.height) * 100)).toBe(Math.round((16 / 9) * 100));
  expect(asset.generation?.costUsd).toBe(0.039);

  const full = await request.get(asset.url);
  expect(full.status()).toBe(200);
  expect(full.headers()["content-type"]).toBe("image/png");
  const thumb = await request.get(asset.thumbnailUrl);
  expect(thumb.headers()["content-type"]).toBe("image/webp");
  expect((await thumb.body()).length).toBeLessThan((await full.body()).length);
});

test("count 2 makes two images and adds up the cost", async ({ request }) => {
  const gen = (await (await request.post("/api/generations", { data: { prompt: tag("pair"), count: 2 } })).json()) as Result;
  expect(gen.assets).toHaveLength(2);
  expect(gen.costUsd).toBe(0.078);
});

test("a failed model call is saved and reported, not thrown away", async ({ request }) => {
  const res = await request.post("/api/generations", { data: { prompt: tag("[fail] nope") } });
  expect(res.status()).toBe(200);
  const gen = (await res.json()) as Result;
  expect(gen.status).toBe("failed");
  expect(gen.error).toMatch(/Mock failure/);
  expect(gen.assets).toEqual([]);
  expect(gen.costUsd).toBeNull();
});

test("library: newest first, paged by cursor, favourites, soft delete", async ({ request }) => {
  const made: Asset[] = [];
  for (const name of ["one", "two", "three"]) {
    const gen = (await (await request.post("/api/generations", { data: { prompt: tag(name) } })).json()) as Result;
    made.push(gen.assets[0]);
  }
  const [one, two, three] = made;

  // Walk every page with a page size of 2.
  const seen: string[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 50; i++) {
    const page: { items: Asset[]; nextCursor: string | null } = await (
      await request.get(`/api/library?limit=2${cursor ? `&cursor=${cursor}` : ""}`)
    ).json();
    expect(page.items.length).toBeLessThanOrEqual(2);
    seen.push(...page.items.map((a) => a.id));
    cursor = page.nextCursor;
    if (!cursor) break;
  }
  expect(new Set(seen).size).toBe(seen.length); // no duplicates across pages
  const order = [three.id, two.id, one.id].map((id) => seen.indexOf(id));
  expect(order.every((i) => i >= 0)).toBe(true);
  expect(order).toEqual([...order].sort((a, b) => a - b)); // newest first

  // Favourite shows up in the favourites view and nowhere else changes.
  expect((await request.patch(`/api/assets/${two.id}`, { data: { isFavorite: true } })).status()).toBe(200);
  const favs: { items: Asset[] } = await (await request.get("/api/library?favorites=1&limit=60")).json();
  expect(favs.items.map((a) => a.id)).toContain(two.id);
  expect(favs.items.every((a) => a.isFavorite)).toBe(true);

  // Soft delete removes it from lists and from direct lookup.
  expect((await request.delete(`/api/assets/${two.id}`)).status()).toBe(200);
  expect((await request.get(`/api/assets/${two.id}`)).status()).toBe(404);
  const after: { items: Asset[] } = await (await request.get("/api/library?favorites=1&limit=60")).json();
  expect(after.items.map((a) => a.id)).not.toContain(two.id);
  expect((await request.delete(`/api/assets/${two.id}`)).status()).toBe(404);
});

test("rejects a bad cursor", async ({ request }) => {
  expect((await request.get("/api/library?cursor=garbage")).status()).toBe(400);
});

test("upload, then edit with it as a reference, then re-run the settings", async ({ request }) => {
  const up = await request.post("/api/uploads", {
    multipart: { file: { name: "ref.png", mimeType: "image/png", buffer: await png() } },
  });
  expect(up.status()).toBe(200);
  const ref = (await up.json()) as Asset;
  trackAsset(ref.id);
  expect(ref.width).toBe(64);

  const prompt = tag("api edit");
  const gen = (await (
    await request.post("/api/generations", {
      data: { prompt, referenceAssetIds: [ref.id], aspectRatio: "4:3", count: 1 },
    })
  ).json()) as Result;
  expect(gen.status).toBe("succeeded");
  expect(gen.assets[0].generation?.mode).toBe("image_edit");

  const settings = await (await request.get(`/api/generations/${gen.id}`)).json();
  expect(settings).toMatchObject({ prompt, model: "default", aspectRatio: "4:3", imageSize: "1K", count: 1 });
  expect(settings.references.map((r: Asset) => r.id)).toEqual([ref.id]);

  // A reference deleted later is left out of the re-run, not an error.
  await request.delete(`/api/assets/${ref.id}`);
  const again = await (await request.get(`/api/generations/${gen.id}`)).json();
  expect(again.references).toEqual([]);

  // Using a missing reference is a clear 400.
  const bad = await request.post("/api/generations", { data: { prompt: tag("x"), referenceAssetIds: [ref.id] } });
  expect(bad.status()).toBe(400);
  expect((await bad.json()).error).toMatch(/reference images? doesn't exist/);
});

test("upload refuses non-images and files over 10 MB", async ({ request }) => {
  const text = await request.post("/api/uploads", {
    multipart: { file: { name: "a.png", mimeType: "image/png", buffer: Buffer.from("not an image") } },
  });
  expect(text.status()).toBe(400);
  expect((await text.json()).error).toMatch(/isn't an image/);

  const big = await request.post("/api/uploads", {
    multipart: { file: { name: "big.png", mimeType: "image/png", buffer: Buffer.alloc(10 * 1024 * 1024 + 1) } },
  });
  expect(big.status()).toBe(400);
  expect((await big.json()).error).toMatch(/over 10 MB/);
});
