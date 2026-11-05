import "server-only";
import { randomUUID } from "node:crypto";
import { db, OWNER_ID } from "@/lib/supabase/server";
import { downloadMedia, mediaPath, removeMedia, uploadMedia } from "@/lib/storage";
import { inspectImage, makeThumbnail } from "@/lib/image-processing";
import { generateImage, type ImageResult } from "@/lib/ai/image";
import { imageCostUsd } from "@/lib/ai/cost";
import { MODELS } from "@/lib/ai/models";
import { HttpError } from "@/lib/http";
import { ASSET_SELECT, failStuckGenerations, toAssetDtos, type AssetRow } from "@/features/library/server";
import type { AssetDto } from "@/features/library/types";
import type { GenerateRequest } from "./schemas";
import type { GenerationResult } from "./types";

type Reference = { id: string; bytes: Buffer; mimeType: string };

async function loadReferences(ids: string[]): Promise<Reference[]> {
  if (ids.length === 0) return [];
  const { data, error } = await db()
    .from("assets")
    .select("id,storage_path,mime_type")
    .eq("owner_id", OWNER_ID)
    .eq("kind", "image")
    .in("id", ids)
    .is("deleted_at", null);
  if (error) throw new Error(`Couldn't load the reference images: ${error.message}`);
  const byId = new Map((data ?? []).map((r) => [r.id as string, r]));
  if (byId.size !== new Set(ids).size) throw new HttpError(400, "One of the reference images doesn't exist any more.");
  return Promise.all(
    ids.map(async (id) => {
      const row = byId.get(id)!;
      return { id, bytes: await downloadMedia(row.storage_path), mimeType: row.mime_type as string };
    }),
  );
}

/**
 * Makes `count` images. The generations row exists before the model is called,
 * so a crash leaves a visible row instead of nothing. Costs are written for
 * every successful model call, even if saving the file then fails, because
 * Google has already charged for it.
 */
export async function runGeneration(req: GenerateRequest): Promise<GenerationResult> {
  await failStuckGenerations();
  const references = await loadReferences(req.referenceAssetIds);
  const spec = MODELS.image[req.model];
  const generationId = randomUUID();

  const { error: insertError } = await db()
    .from("generations")
    .insert({
      id: generationId,
      owner_id: OWNER_ID,
      parent_id: req.sourceGenerationId ?? null,
      kind: "image",
      mode: references.length ? "image_edit" : "text_to_image",
      status: "running",
      model: spec.id,
      prompt: req.prompt,
      params: { aspectRatio: req.aspectRatio, imageSize: req.imageSize, count: req.count },
      started_at: new Date().toISOString(),
    });
  if (insertError) throw new Error(`Couldn't start the generation: ${insertError.message}`);

  if (references.length) {
    const { error } = await db()
      .from("generation_inputs")
      .insert(references.map((r, position) => ({ generation_id: generationId, asset_id: r.id, role: "reference", position })));
    if (error) return finish(generationId, { stored: [], failures: [`Couldn't link the reference images: ${error.message}`], costs: [] });
  }

  const settled = await Promise.allSettled(
    Array.from({ length: req.count }, () =>
      generateImage({
        modelKey: req.model,
        prompt: req.prompt,
        aspectRatio: req.aspectRatio,
        imageSize: req.imageSize,
        references: references.map(({ bytes, mimeType }) => ({ bytes, mimeType })),
      }),
    ),
  );

  const failures: string[] = [];
  const stored: string[] = []; // asset ids
  const costs: (number | null)[] = [];
  await Promise.all(
    settled.map(async (outcome) => {
      if (outcome.status === "rejected") {
        failures.push(outcome.reason instanceof Error ? outcome.reason.message : "The model call failed.");
        return;
      }
      const cost = imageCostUsd(outcome.value.modelId, outcome.value.usage);
      costs.push(cost);
      try {
        const assetId = await storeImage(generationId, outcome.value);
        stored.push(assetId);
        await recordUsage(generationId, outcome.value.modelId, cost);
      } catch (error) {
        failures.push(error instanceof Error ? error.message : "Couldn't save an image.");
        await recordUsage(generationId, outcome.value.modelId, cost).catch(() => {});
      }
    }),
  );

  return finish(generationId, { stored, failures, costs });
}

async function storeImage(generationId: string, image: ImageResult): Promise<string> {
  const info = await inspectImage(image.bytes);
  const assetId = randomUUID();
  const storagePath = mediaPath(OWNER_ID, assetId, info.ext);
  const thumbPath = mediaPath(OWNER_ID, assetId, "webp", "thumb");
  await Promise.all([
    uploadMedia(storagePath, image.bytes, info.mimeType),
    makeThumbnail(image.bytes).then((t) => uploadMedia(thumbPath, t, "image/webp")),
  ]);
  const { error } = await db().from("assets").insert({
    id: assetId,
    owner_id: OWNER_ID,
    generation_id: generationId,
    kind: "image",
    source: "generated",
    storage_path: storagePath,
    thumbnail_path: thumbPath,
    mime_type: info.mimeType,
    bytes: image.bytes.length,
    width: info.width,
    height: info.height,
  });
  if (error) {
    await removeMedia([storagePath, thumbPath]); // no row, so don't leave the files behind
    throw new Error(`Couldn't record the image: ${error.message}`);
  }
  return assetId;
}

async function recordUsage(generationId: string, model: string, cost: number | null): Promise<void> {
  if (cost === null) return; // unknown price: write nothing rather than a guess
  const { error } = await db()
    .from("usage_events")
    .insert({ owner_id: OWNER_ID, generation_id: generationId, model, unit_type: "image", units: 1, cost_usd: cost });
  if (error) throw new Error(`Couldn't record the cost: ${error.message}`);
}

async function finish(
  generationId: string,
  outcome: { stored: string[]; failures: string[]; costs: (number | null)[] },
): Promise<GenerationResult> {
  const { stored, failures, costs } = outcome;
  const succeeded = stored.length > 0;
  // Known only if every paid call had a known price.
  const costUsd = costs.length > 0 && costs.every((c) => c !== null)
    ? Math.round(costs.reduce<number>((n, c) => n + (c as number), 0) * 10_000) / 10_000
    : null;
  const error = failures.length ? [...new Set(failures)].join(" ") : null;

  const { error: updateError } = await db()
    .from("generations")
    .update({
      status: succeeded ? "succeeded" : "failed",
      error,
      cost_usd: costUsd,
      completed_at: new Date().toISOString(),
    })
    .eq("id", generationId);
  if (updateError) throw new Error(`Couldn't finish the generation: ${updateError.message}`);

  let assets: AssetDto[] = [];
  if (stored.length) {
    const { data, error: readError } = await db()
      .from("assets")
      .select(ASSET_SELECT)
      .in("id", stored)
      .order("created_at", { ascending: true });
    if (readError) throw new Error(`Couldn't read the new images: ${readError.message}`);
    assets = await toAssetDtos((data ?? []) as unknown as AssetRow[]);
  }
  return { id: generationId, status: succeeded ? "succeeded" : "failed", error, costUsd, assets };
}
