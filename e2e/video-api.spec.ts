import { test, expect } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import sharp from "sharp";
import { uploadImage } from "./upload";

// Video jobs and presets over HTTP, with the AI mocked (E2E_MOCK_AI=1). A mock clip takes
// about 2 seconds ("[slow]" takes 8, "[fail]" ends in an error) and returns a tiny real mp4.
// A default request (Fast, 720p, 4 s, no sound) is estimated at 4 x $0.08 = $0.32.

type Asset = { id: string; kind: string; url: string; thumbnailUrl: string; durationMs: number | null; generation: { id: string } | null };
type Job = {
  id: string; status: "running" | "succeeded" | "failed"; error: string | null; mode: string; costUsd: number | null;
  durationSeconds: number; asset: Asset | null;
};

const tag = (s: string) => `[e2e] ${s} ${Math.random().toString(36).slice(2, 8)}`;

async function start(request: APIRequestContext, data: Record<string, unknown>) {
  const res = await request.post("/api/videos", { data });
  return { res, job: (await res.json()) as Job };
}

async function finished(request: APIRequestContext, id: string): Promise<Job> {
  for (let i = 0; i < 40; i++) {
    const job = (await (await request.get(`/api/videos/${id}`)).json()) as Job;
    if (job.status !== "running") return job;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("the mock clip never finished");
}

test("starting a clip returns at once, shows its cost, and lists it as running", async ({ request }) => {
  const t0 = Date.now();
  const { res, job } = await start(request, { prompt: tag("a red door") });
  expect(res.status()).toBe(200);
  expect(Date.now() - t0).toBeLessThan(5000); // it doesn't wait for the clip
  expect(job).toMatchObject({ status: "running", mode: "text_to_video", durationSeconds: 4, costUsd: 0.32, asset: null });

  const list = (await (await request.get("/api/videos")).json()) as Job[];
  expect(list.find((j) => j.id === job.id)?.status).toBe("running");
  await finished(request, job.id);
});

test("a finished clip is saved: playable file, duration, cost, in the library as a video", async ({ request }) => {
  const { job } = await start(request, { prompt: tag("harbour at dawn") });
  const done = await finished(request, job.id);
  expect(done.status).toBe("succeeded");
  expect(done.costUsd).toBe(0.32);
  expect(done.asset).toMatchObject({ kind: "video", durationMs: 4000 });

  const file = await request.get(done.asset!.url);
  expect(file.status()).toBe(200);
  expect(file.headers()["content-type"]).toBe("video/mp4");
  expect((await file.body()).length).toBeGreaterThan(1000);

  const videos = (await (await request.get("/api/library?kind=video&limit=60")).json()) as { items: Asset[] };
  expect(videos.items.map((a) => a.id)).toContain(done.asset!.id);
  const images = (await (await request.get("/api/library?kind=image&limit=60")).json()) as { items: Asset[] };
  expect(images.items.map((a) => a.id)).not.toContain(done.asset!.id);
});

test("five checks at once save the clip exactly once", async ({ request }) => {
  const { job } = await start(request, { prompt: tag("race") });
  await new Promise((r) => setTimeout(r, 2600)); // let the mock clip finish first
  const results = await Promise.all(Array.from({ length: 5 }, () => request.get(`/api/videos/${job.id}`).then((r) => r.json() as Promise<Job>)));
  expect(results.every((r) => ["running", "succeeded"].includes(r.status))).toBe(true);

  const final = await finished(request, job.id);
  expect(final.status).toBe("succeeded");
  const videos = (await (await request.get("/api/library?kind=video&limit=60")).json()) as { items: Asset[] };
  expect(videos.items.filter((a) => a.generation?.id === job.id)).toHaveLength(1);
});

test("a clip that fails is saved with the reason and has no cost or file", async ({ request }) => {
  const { job } = await start(request, { prompt: tag("[fail] nope") });
  const done = await finished(request, job.id);
  expect(done.status).toBe("failed");
  expect(done.error).toMatch(/Mock failure/);
  expect(done.costUsd).toBeNull();
  expect(done.asset).toBeNull();
});

test("bad requests get plain messages", async ({ request }) => {
  const long = await request.post("/api/videos", { data: { prompt: tag("x"), resolution: "1080p", durationSeconds: 4 } });
  expect(long.status()).toBe(400);
  expect((await long.json()).error).toBe("1080p and 4K clips are 8 seconds long.");

  const lite = await request.post("/api/videos", { data: { prompt: tag("x"), model: "lite", resolution: "4k", durationSeconds: 8 } });
  expect(lite.status()).toBe(400);
  expect((await lite.json()).error).toMatch(/can't make this resolution/);

  const square = await request.post("/api/videos", { data: { prompt: tag("x"), aspectRatio: "1:1" } });
  expect(square.status()).toBe(400);

  const orphan = await request.post("/api/videos", { data: { prompt: tag("x"), lastFrameAssetId: "11111111-1111-4111-8111-111111111111" } });
  expect((await orphan.json()).error).toBe("Add a first frame before a last frame.");

  const foreign = await request.post("/api/videos", { headers: { origin: "https://evil.example" }, data: { prompt: tag("x") } });
  expect(foreign.status()).toBe(403);

  expect((await request.get("/api/videos/00000000-0000-4000-8000-000000000099")).status()).toBe(404);
  expect((await request.get("/api/videos/not-a-uuid")).status()).toBe(400);
});

test("image to video: the first frame becomes the clip's thumbnail, and settings can be re-run", async ({ request }) => {
  const png = await sharp({ create: { width: 64, height: 36, channels: 3, background: "#10b981" } }).png().toBuffer();
  const frame = (await uploadImage(request, png)) as unknown as Asset;

  const prompt = tag("the door opens");
  const { job } = await start(request, { prompt, firstFrameAssetId: frame.id, aspectRatio: "9:16", durationSeconds: 6, generateAudio: true });
  expect(job.mode).toBe("image_to_video");
  expect(job.costUsd).toBe(0.6); // 6 s x $0.10 with sound

  const done = await finished(request, job.id);
  expect(done.status).toBe("succeeded");
  expect(done.asset!.thumbnailUrl).not.toBe(done.asset!.url); // a picture, not the video file

  const settings = await (await request.get(`/api/videos/${job.id}/settings`)).json();
  expect(settings).toMatchObject({ prompt, model: "fast", aspectRatio: "9:16", durationSeconds: 6, resolution: "720p", audio: true });
  expect(settings.firstFrame.id).toBe(frame.id);
  expect(settings.lastFrame).toBeNull();
  expect(settings.missingFrames).toBe(false);

  // If the first frame is deleted later, re-running must say so instead of quietly becoming text to video.
  expect((await request.delete(`/api/assets/${frame.id}`)).status()).toBe(200);
  const after = await (await request.get(`/api/videos/${job.id}/settings`)).json();
  expect(after).toMatchObject({ firstFrame: null, missingFrames: true });
});

test("presets: built-ins for each kind, your own can be added and deleted", async ({ request }) => {
  const video = (await (await request.get("/api/presets?kind=video")).json()) as { id: string; group: string; builtin: boolean }[];
  expect(video.filter((p) => p.group === "camera").length).toBeGreaterThanOrEqual(6);
  expect(video.filter((p) => p.group === "style").length).toBeGreaterThanOrEqual(6);

  const image = (await (await request.get("/api/presets?kind=image")).json()) as { group: string }[];
  expect(image.every((p) => p.group === "style")).toBe(true); // camera moves are for video

  expect((await request.get("/api/presets?kind=audio")).status()).toBe(400);

  const name = tag("my grain");
  const made = await request.post("/api/presets", { data: { name, group: "style", kinds: ["image"], template: "heavy 16mm grain" } });
  expect(made.status()).toBe(200);
  const preset = await made.json();
  expect(preset).toMatchObject({ name, group: "style", builtin: false });

  expect(((await (await request.get("/api/presets?kind=image")).json()) as { id: string }[]).map((p) => p.id)).toContain(preset.id);
  expect(((await (await request.get("/api/presets?kind=video")).json()) as { id: string }[]).map((p) => p.id)).not.toContain(preset.id);

  expect((await request.post("/api/presets", { data: { name: " ", group: "style", kinds: ["image"], template: "x" } })).status()).toBe(400);

  expect((await request.delete(`/api/presets/${preset.id}`)).status()).toBe(200);
  expect(((await (await request.get("/api/presets?kind=image")).json()) as { id: string }[]).map((p) => p.id)).not.toContain(preset.id);
  expect((await request.delete(`/api/presets/${preset.id}`)).status()).toBe(404);
  expect((await request.delete("/api/presets/style-noir")).status()).toBe(400); // built-ins aren't rows
});
