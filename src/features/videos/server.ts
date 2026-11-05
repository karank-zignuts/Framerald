import "server-only";
import { randomUUID } from "node:crypto";
import { db, OWNER_ID } from "@/lib/supabase/server";
import { downloadMedia, mediaPath, removeMedia, uploadMedia } from "@/lib/storage";
import { HttpError } from "@/lib/http";
import { MODELS, VIDEO_MODEL_KEYS, type VideoModelKey, type VideoResolution } from "@/lib/ai/models";
import { videoCostUsd } from "@/lib/ai/cost";
import { pollVideo, startVideo, VideoError, type FrameInput, type VideoPoll } from "@/lib/ai/video";
import { ASSET_SELECT, toAssetDtos, type AssetRow } from "@/features/library/server";
import type { AssetDto } from "@/features/library/types";
import { assertProject } from "@/features/projects/server";
import { decideJobAction, VIDEO_TIMEOUT_MS, type JobStatus, type OperationSnapshot } from "./job";
import { videoDimensions, type GenerateVideoRequest } from "./schemas";
import type { VideoJobDto, VideoReRunSettings } from "./types";

type JobRow = {
  id: string;
  mode: "text_to_video" | "image_to_video";
  status: JobStatus;
  model: string;
  prompt: string;
  params: {
    aspectRatio?: string;
    durationSeconds?: number;
    resolution?: string;
    generateAudio?: boolean;
  } | null;
  error: string | null;
  operation_name: string | null;
  project_id: string | null;
  created_at: string;
};

const JOB_COLUMNS = "id,mode,status,model,prompt,params,error,operation_name,project_id,created_at";
const CLAIM_STALE_MS = 10 * 60_000; // a finalize claim older than this is taken to be a crash and may be retried
const NEVER_STARTED_MS = 2 * 60_000;

// ─── Mapping ─────────────────────────────────────────────────────────────────

function modelKeyOf(modelId: string): VideoModelKey {
  return VIDEO_MODEL_KEYS.find((k) => MODELS.video[k].id === modelId) ?? "fast";
}

function toJobDto(row: JobRow, asset: AssetDto | null): VideoJobDto {
  const p = row.params ?? {};
  const status = row.status === "succeeded" ? "succeeded" : row.status === "failed" || row.status === "canceled" ? "failed" : "running";
  const seconds = p.durationSeconds ?? 4;
  const resolution = (p.resolution ?? "720p") as VideoResolution;
  return {
    id: row.id,
    status,
    error: row.error,
    prompt: row.prompt,
    mode: row.mode,
    modelLabel: MODELS.video[modelKeyOf(row.model)].label,
    aspectRatio: p.aspectRatio ?? "16:9",
    durationSeconds: seconds,
    resolution,
    audio: p.generateAudio ?? false,
    costUsd: status === "failed" ? null : videoCostUsd(row.model, { seconds, resolution, audio: p.generateAudio ?? false }),
    createdAt: row.created_at,
    asset,
  };
}

async function assetsByGeneration(ids: string[]): Promise<Map<string, AssetDto>> {
  const map = new Map<string, AssetDto>();
  if (ids.length === 0) return map;
  const { data, error } = await db()
    .from("assets")
    .select(`generation_id,${ASSET_SELECT}`)
    .eq("owner_id", OWNER_ID)
    .in("generation_id", ids)
    .is("deleted_at", null);
  if (error) throw new Error(`Couldn't load the clips: ${error.message}`);
  const rows = (data ?? []) as unknown as (AssetRow & { generation_id: string })[];
  const dtos = await toAssetDtos(rows);
  rows.forEach((r) => {
    const dto = dtos.find((d) => d.id === r.id);
    if (dto) map.set(r.generation_id, dto);
  });
  return map;
}

async function getJobRow(id: string): Promise<JobRow> {
  const { data, error } = await db()
    .from("generations")
    .select(JOB_COLUMNS)
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .eq("kind", "video")
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load that clip: ${error.message}`);
  if (!data) throw new HttpError(404, "That clip doesn't exist any more.");
  return data as JobRow;
}

async function jobDto(row: JobRow): Promise<VideoJobDto> {
  const asset = row.status === "succeeded" ? ((await assetsByGeneration([row.id])).get(row.id) ?? null) : null;
  return toJobDto(row, asset);
}

// ─── Start ───────────────────────────────────────────────────────────────────

async function loadFrame(assetId: string): Promise<{ frame: FrameInput; thumbnailPath: string | null }> {
  const { data, error } = await db()
    .from("assets")
    .select("storage_path,thumbnail_path,mime_type")
    .eq("owner_id", OWNER_ID)
    .eq("kind", "image")
    .eq("id", assetId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load the frame: ${error.message}`);
  if (!data) throw new HttpError(400, "One of the frames doesn't exist any more.");
  return { frame: { bytes: await downloadMedia(data.storage_path), mimeType: data.mime_type }, thumbnailPath: data.thumbnail_path };
}

/** Creates the row, asks Google to start the clip, and returns at once. Finishing happens in refreshVideoJob. */
export async function startVideoGeneration(req: GenerateVideoRequest): Promise<VideoJobDto> {
  await sweepStuckVideos();
  if (req.projectId) await assertProject(req.projectId);
  const first = req.firstFrameAssetId ? await loadFrame(req.firstFrameAssetId) : null;
  const last = req.lastFrameAssetId ? await loadFrame(req.lastFrameAssetId) : null;
  const spec = MODELS.video[req.model];
  const generationId = randomUUID();

  const { data, error: insertError } = await db()
    .from("generations")
    .insert({
      id: generationId,
      owner_id: OWNER_ID,
      project_id: req.projectId ?? null,
      parent_id: req.sourceGenerationId ?? null,
      kind: "video",
      mode: first ? "image_to_video" : "text_to_video",
      status: "running",
      model: spec.id,
      prompt: req.prompt,
      params: {
        aspectRatio: req.aspectRatio,
        durationSeconds: req.durationSeconds,
        resolution: req.resolution,
        generateAudio: req.generateAudio,
      },
      started_at: new Date().toISOString(),
    })
    .select(JOB_COLUMNS)
    .single();
  if (insertError) throw new Error(`Couldn't start the clip: ${insertError.message}`);
  const row = data as JobRow;

  const inputs = [
    ...(req.firstFrameAssetId ? [{ generation_id: generationId, asset_id: req.firstFrameAssetId, role: "first_frame", position: 0 }] : []),
    ...(req.lastFrameAssetId ? [{ generation_id: generationId, asset_id: req.lastFrameAssetId, role: "last_frame", position: 1 }] : []),
  ];
  if (inputs.length) {
    const { error } = await db().from("generation_inputs").insert(inputs);
    if (error) {
      await markFailed(generationId, `Couldn't link the frames: ${error.message}`);
      throw new Error(`Couldn't link the frames: ${error.message}`);
    }
  }

  let operationName: string;
  try {
    ({ operationName } = await startVideo({
      modelKey: req.model,
      prompt: req.prompt,
      aspectRatio: req.aspectRatio,
      durationSeconds: req.durationSeconds,
      resolution: req.resolution,
      generateAudio: req.generateAudio,
      firstFrame: first?.frame,
      lastFrame: last?.frame,
    }));
  } catch (error) {
    const reason = error instanceof VideoError ? error.message : "Google couldn't start this clip. Try again.";
    await markFailed(generationId, reason);
    throw new HttpError(502, reason);
  }

  // Google is already making this clip, so try twice before giving up on saving its handle.
  let { error: nameError } = await db().from("generations").update({ operation_name: operationName }).eq("id", generationId);
  if (nameError) ({ error: nameError } = await db().from("generations").update({ operation_name: operationName }).eq("id", generationId));
  if (nameError) {
    // Google is already making (and will bill for) this clip, and we've lost its handle. Say so loudly.
    console.error(`[video] started ${operationName} for ${generationId} but couldn't save it: ${nameError.message}`);
    await markFailed(generationId, "The clip started but its job couldn't be saved. Try again.");
    throw new Error(`Couldn't save the clip's job: ${nameError.message}`);
  }
  return toJobDto({ ...row, operation_name: operationName }, null);
}

// ─── Check, and finish exactly once ──────────────────────────────────────────

/** Fails a job that is still running. Never overwrites a job that already succeeded. */
async function markFailed(id: string, reason: string): Promise<void> {
  const { error } = await db()
    .from("generations")
    .update({ status: "failed", error: reason, completed_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["queued", "running"]);
  if (error) console.error(`[video] couldn't mark ${id} failed: ${error.message}`);
}

/** Only one caller wins the right to save a finished clip, even if two status checks arrive together. */
async function claimFinalize(id: string): Promise<boolean> {
  const now = new Date().toISOString();
  const fresh = await db()
    .from("generations")
    .update({ completed_at: now })
    .eq("id", id)
    .eq("status", "running")
    .is("completed_at", null)
    .select("id");
  if (fresh.data?.length) return true;
  // A claim that is old and never finished means the claimer crashed; take it over.
  const stale = await db()
    .from("generations")
    .update({ completed_at: now })
    .eq("id", id)
    .eq("status", "running")
    .lt("completed_at", new Date(Date.now() - CLAIM_STALE_MS).toISOString())
    .select("id");
  return Boolean(stale.data?.length);
}

/** Writes the cost once per clip, even if finalize runs twice. */
async function recordVideoUsage(row: JobRow, seconds: number, resolution: VideoResolution, audio: boolean): Promise<number | null> {
  const cost = videoCostUsd(row.model, { seconds, resolution, audio });
  if (cost === null) {
    console.error(`[cost] video ${row.id} (${row.model}) has no known price; no usage_events row written`);
    return null;
  }
  const { data: existing } = await db().from("usage_events").select("id").eq("generation_id", row.id).eq("unit_type", "video_second").limit(1);
  if (!existing?.length) {
    const { error } = await db()
      .from("usage_events")
      .insert({ owner_id: OWNER_ID, generation_id: row.id, model: row.model, unit_type: "video_second", units: seconds, cost_usd: cost });
    if (error) console.error(`[cost] couldn't record video usage for ${row.id}: ${error.message}`);
  }
  return cost;
}

async function finalize(row: JobRow, poll: VideoPoll): Promise<VideoJobDto> {
  if (!(await claimFinalize(row.id))) return toJobDto(row, null); // another check is saving it

  const p = row.params ?? {};
  const seconds = p.durationSeconds ?? 4;
  const resolution = (p.resolution ?? "720p") as VideoResolution;
  const audio = p.generateAudio ?? false;

  // An earlier attempt may have saved the clip and died before marking it done. Never save it twice.
  const { data: already } = await db().from("assets").select("id").eq("generation_id", row.id).eq("kind", "video").limit(1);
  if (!already?.length) {
    const bytes = poll.video?.bytes;
    if (!bytes) {
      await markFailed(row.id, "Google made the clip but saved it to Cloud Storage instead of returning it, so it can't be fetched here.");
      return jobDto({ ...(await getJobRow(row.id)) });
    }

    const assetId = randomUUID();
    const storagePath = mediaPath(OWNER_ID, assetId, "mp4");
    try {
      // An image-to-video clip reuses its first frame's thumbnail; a text-to-video clip is shown with <video>.
      const { data: firstInput } = await db()
        .from("generation_inputs")
        .select("asset:assets(thumbnail_path)")
        .eq("generation_id", row.id)
        .eq("role", "first_frame")
        .maybeSingle();
      const thumbnailPath = (firstInput as { asset?: { thumbnail_path?: string | null } | null } | null)?.asset?.thumbnail_path ?? null;

      await uploadMedia(storagePath, bytes, poll.video?.mimeType ?? "video/mp4");
      const { width, height } = videoDimensions(resolution, p.aspectRatio ?? "16:9");
      const { error: assetError } = await db().from("assets").insert({
        id: assetId,
        owner_id: OWNER_ID,
        project_id: row.project_id,
        generation_id: row.id,
        kind: "video",
        source: "generated",
        storage_path: storagePath,
        thumbnail_path: thumbnailPath,
        mime_type: poll.video?.mimeType ?? "video/mp4",
        bytes: bytes.length,
        width,
        height,
        duration_ms: seconds * 1000,
      });
      if (assetError) throw new Error(assetError.message);
    } catch (error) {
      await removeMedia([storagePath]);
      // Leave it running: the claim goes stale and a later check retries while the result is still available.
      console.error(`[video] couldn't save the finished clip ${row.id}`, error);
      return toJobDto(row, null);
    }
  }

  const cost = await recordVideoUsage(row, seconds, resolution, audio);
  const { error: doneError } = await db()
    .from("generations")
    .update({ status: "succeeded", error: null, cost_usd: cost, completed_at: new Date().toISOString() })
    .eq("id", row.id);
  if (doneError) {
    console.error(`[video] saved ${row.id} but couldn't mark it done: ${doneError.message}`);
    return toJobDto(row, null); // a later check finds the saved clip and marks it done without saving it again
  }
  return jobDto({ ...row, status: "succeeded", error: null });
}

/** Checks a clip with Google, and saves it if it's ready. Called by the browser every few seconds while a clip runs. */
export async function refreshVideoJob(id: string): Promise<VideoJobDto> {
  const row = await getJobRow(id);
  if (row.status !== "running" && row.status !== "queued") return jobDto(row);

  const ageMs = Date.now() - Date.parse(row.created_at);
  if (!row.operation_name) {
    if (ageMs > NEVER_STARTED_MS) {
      await markFailed(id, "This clip never started. Try again.");
      return jobDto(await getJobRow(id));
    }
    return toJobDto(row, null);
  }

  let poll: VideoPoll | null = null;
  try {
    poll = await pollVideo(row.operation_name, modelKeyOf(row.model));
  } catch (error) {
    // A failed check says nothing about the clip. Keep waiting; the timeout still applies.
    console.error(`[video] couldn't check ${id}`, error);
  }
  const operation: OperationSnapshot | null = poll ? { done: poll.done, errorMessage: poll.errorMessage, hasVideo: Boolean(poll.video) } : null;
  const decision = decideJobAction({ status: row.status, ageMs, operation });

  if (decision.action === "fail") {
    await markFailed(id, decision.reason);
    return jobDto(await getJobRow(id));
  }
  if (decision.action === "finalize" && poll) return finalize(row, poll);
  return toJobDto(row, null);
}

// ─── Lists and re-run ────────────────────────────────────────────────────────

/** Checks every running clip with Google (saving the finished ones) and then sweeps the stuck ones. For the cron route. */
export async function refreshRunningVideoJobs(): Promise<{ checked: number; succeeded: number; failed: number; stillRunning: number }> {
  const { data, error } = await db()
    .from("generations")
    .select("id")
    .eq("owner_id", OWNER_ID)
    .eq("kind", "video")
    .in("status", ["queued", "running"])
    .order("created_at")
    .limit(20);
  if (error) throw new Error(`Couldn't list running clips: ${error.message}`);
  const counts = { checked: 0, succeeded: 0, failed: 0, stillRunning: 0 };
  for (const row of data ?? []) {
    try {
      const job = await refreshVideoJob(row.id as string);
      counts.checked += 1;
      if (job.status === "succeeded") counts.succeeded += 1;
      else if (job.status === "failed") counts.failed += 1;
      else counts.stillRunning += 1;
    } catch (cause) {
      console.error(`[cron] couldn't check clip ${row.id}`, cause);
    }
  }
  await sweepStuckVideos();
  return counts;
}

let lastVideoSweep = 0;

/**
 * A clip that has run longer than the timeout is checked with Google before anything is decided: if
 * Google finished it (and billed for it), it is saved; only a clip Google still hasn't finished is failed.
 * At most once a minute per server.
 */
export async function sweepStuckVideos(): Promise<void> {
  if (Date.now() - lastVideoSweep < 60_000) return;
  lastVideoSweep = Date.now();
  const { data } = await db()
    .from("generations")
    .select("id")
    .eq("owner_id", OWNER_ID)
    .eq("kind", "video")
    .in("status", ["queued", "running"])
    .lt("created_at", new Date(Date.now() - VIDEO_TIMEOUT_MS).toISOString())
    .limit(20);
  for (const row of data ?? []) {
    try {
      await refreshVideoJob(row.id as string);
    } catch (error) {
      console.error(`[video] couldn't check old clip ${row.id}`, error);
    }
  }
}

/** The newest clips (running, finished and failed), so a reload still shows what is in flight. */
export async function listRecentVideoJobs(limit = 30): Promise<VideoJobDto[]> {
  await sweepStuckVideos();
  const { data, error } = await db()
    .from("generations")
    .select(JOB_COLUMNS)
    .eq("owner_id", OWNER_ID)
    .eq("kind", "video")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(Math.floor(limit), 1), 30));
  if (error) throw new Error(`Couldn't load your clips: ${error.message}`);
  const rows = (data ?? []) as JobRow[];
  const assets = await assetsByGeneration(rows.filter((r) => r.status === "succeeded").map((r) => r.id));
  // A finished clip whose file was deleted from the Library is not shown again.
  return rows.flatMap((r) => (r.status === "succeeded" && !assets.has(r.id) ? [] : [toJobDto(r, assets.get(r.id) ?? null)]));
}

export async function getVideoReRunSettings(generationId: string): Promise<VideoReRunSettings> {
  const row = await getJobRow(generationId);
  const p = row.params ?? {};
  const { data: inputs, error } = await db()
    .from("generation_inputs")
    .select("asset_id,role")
    .eq("generation_id", generationId);
  if (error) throw new Error(`Couldn't load the frames: ${error.message}`);
  const ids = (inputs ?? []).map((i) => i.asset_id as string);
  const { data: rows, error: assetsError } = ids.length
    ? await db().from("assets").select(ASSET_SELECT).eq("owner_id", OWNER_ID).in("id", ids).is("deleted_at", null)
    : { data: [], error: null };
  if (assetsError) throw new Error(`Couldn't load the frames: ${assetsError.message}`);
  const dtos = await toAssetDtos((rows ?? []) as unknown as AssetRow[]);
  const frame = (role: string) => {
    const id = inputs?.find((i) => i.role === role)?.asset_id;
    return dtos.find((d) => d.id === id) ?? null;
  };
  const firstFrame = frame("first_frame");
  const lastFrame = frame("last_frame");
  const expected = (inputs ?? []).filter((i) => i.role === "first_frame" || i.role === "last_frame").length;
  return {
    prompt: row.prompt,
    model: modelKeyOf(row.model),
    aspectRatio: p.aspectRatio ?? "16:9",
    durationSeconds: p.durationSeconds ?? 4,
    resolution: p.resolution ?? "720p",
    audio: p.generateAudio ?? false,
    firstFrame,
    lastFrame,
    // The clip was made from frames that have since been deleted; re-running it would silently become text to video.
    missingFrames: expected > [firstFrame, lastFrame].filter(Boolean).length,
  };
}
