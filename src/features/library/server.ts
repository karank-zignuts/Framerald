import "server-only";
import { db, OWNER_ID } from "@/lib/supabase/server";
import { signedUrlMap } from "@/lib/storage";
import { decodeCursor, encodeCursor } from "@/lib/cursor";
import { HttpError } from "@/lib/http";
import { IMAGE_MODEL_KEYS, MODELS } from "@/lib/ai/models";
import type { AssetDto, GenerationSummary, LibraryPage, ReRunSettings } from "./types";

type GenerationRow = {
  id: string;
  prompt: string;
  model: string;
  mode: string;
  params: { aspectRatio?: string; imageSize?: string; count?: number } | null;
  cost_usd: number | string | null;
};

export type AssetRow = {
  id: string;
  kind: "image" | "video";
  source: "generated" | "upload";
  storage_path: string;
  thumbnail_path: string | null;
  width: number | null;
  height: number | null;
  is_favorite: boolean;
  created_at: string;
  generation: GenerationRow | null;
};

export const ASSET_SELECT =
  "id,kind,source,storage_path,thumbnail_path,width,height,is_favorite,created_at," +
  "generation:generations!assets_generation_id_fkey(id,prompt,model,mode,params,cost_usd)";

export const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;
const STUCK_AFTER_MINUTES = 10;

/** Marks generations that never finished (server crashed mid-call) as failed. */
export async function failStuckGenerations(): Promise<void> {
  const cutoff = new Date(Date.now() - STUCK_AFTER_MINUTES * 60_000).toISOString();
  await db()
    .from("generations")
    .update({ status: "failed", error: "This generation never finished.", completed_at: new Date().toISOString() })
    .eq("owner_id", OWNER_ID)
    .in("status", ["queued", "running"])
    .lt("created_at", cutoff);
}

function summarize(g: GenerationRow): GenerationSummary {
  return {
    id: g.id,
    prompt: g.prompt,
    modelId: g.model,
    mode: g.mode,
    aspectRatio: g.params?.aspectRatio ?? null,
    imageSize: g.params?.imageSize ?? null,
    count: g.params?.count ?? 1,
    costUsd: g.cost_usd === null ? null : Number(g.cost_usd),
  };
}

/** Turns rows into browser-safe DTOs with signed links, in one storage request. */
export async function toAssetDtos(rows: AssetRow[]): Promise<AssetDto[]> {
  const paths = rows.flatMap((r) => [r.storage_path, r.thumbnail_path ?? r.storage_path]);
  const urls = await signedUrlMap(paths);
  return rows.flatMap((r) => {
    const url = urls.get(r.storage_path);
    if (!url) return [];
    return [
      {
        id: r.id,
        kind: r.kind,
        source: r.source,
        url,
        thumbnailUrl: urls.get(r.thumbnail_path ?? r.storage_path) ?? url,
        width: r.width,
        height: r.height,
        isFavorite: r.is_favorite,
        createdAt: r.created_at,
        generation: r.generation ? summarize(r.generation) : null,
      },
    ];
  });
}

export async function listAssets(opts: {
  cursor?: string | null;
  limit?: number;
  favoritesOnly?: boolean;
}): Promise<LibraryPage> {
  await failStuckGenerations();
  const limit = Math.min(Math.max(opts.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const cursor = decodeCursor(opts.cursor);
  if (opts.cursor && !cursor) throw new HttpError(400, "That page link isn't valid.");

  let q = db()
    .from("assets")
    .select(ASSET_SELECT)
    .eq("owner_id", OWNER_ID)
    .eq("source", "generated")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (opts.favoritesOnly) q = q.eq("is_favorite", true);
  if (cursor) {
    q = q.or(`created_at.lt."${cursor.createdAt}",and(created_at.eq."${cursor.createdAt}",id.lt.${cursor.id})`);
  }
  const { data, error } = await q;
  if (error) throw new Error(`Couldn't load the library: ${error.message}`);

  const rows = (data ?? []) as unknown as AssetRow[];
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    items: await toAssetDtos(page),
    nextCursor: rows.length > limit && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null,
  };
}

export async function getAsset(id: string): Promise<AssetDto> {
  const { data, error } = await db()
    .from("assets")
    .select(ASSET_SELECT)
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load that image: ${error.message}`);
  const [dto] = data ? await toAssetDtos([data as unknown as AssetRow]) : [];
  if (!dto) throw new HttpError(404, "That image doesn't exist any more.");
  return dto;
}

export async function setFavorite(id: string, isFavorite: boolean): Promise<void> {
  const { data, error } = await db()
    .from("assets")
    .update({ is_favorite: isFavorite })
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .is("deleted_at", null)
    .select("id");
  if (error) throw new Error(`Couldn't update the favourite: ${error.message}`);
  if (!data?.length) throw new HttpError(404, "That image doesn't exist any more.");
}

/** Soft delete: the row and files stay, the image disappears from every list. */
export async function softDeleteAsset(id: string): Promise<void> {
  const { data, error } = await db()
    .from("assets")
    .update({ deleted_at: new Date().toISOString() })
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .is("deleted_at", null)
    .select("id");
  if (error) throw new Error(`Couldn't delete that image: ${error.message}`);
  if (!data?.length) throw new HttpError(404, "That image doesn't exist any more.");
}

/** Everything the Image Studio form needs to repeat an earlier generation. */
export async function getReRunSettings(generationId: string): Promise<ReRunSettings> {
  const { data: gen, error } = await db()
    .from("generations")
    .select("id,prompt,model,mode,params,cost_usd")
    .eq("owner_id", OWNER_ID)
    .eq("id", generationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load that generation: ${error.message}`);
  if (!gen) throw new HttpError(404, "That generation doesn't exist any more.");
  const g = gen as unknown as GenerationRow;

  const { data: inputs, error: inputsError } = await db()
    .from("generation_inputs")
    .select("asset_id,position")
    .eq("generation_id", generationId)
    .order("position");
  if (inputsError) throw new Error(`Couldn't load the reference images: ${inputsError.message}`);

  // Skip references that were deleted since, and keep the original order.
  const ids = (inputs ?? []).map((i) => i.asset_id as string);
  const { data: refs, error: refsError } = ids.length
    ? await db().from("assets").select(ASSET_SELECT).eq("owner_id", OWNER_ID).in("id", ids).is("deleted_at", null)
    : { data: [], error: null };
  if (refsError) throw new Error(`Couldn't load the reference images: ${refsError.message}`);
  const byId = new Map((refs as unknown as AssetRow[]).map((r) => [r.id, r]));
  const assetRows = ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));

  const modelKey = IMAGE_MODEL_KEYS.find((k) => MODELS.image[k].id === g.model) ?? "default";
  return {
    prompt: g.prompt,
    model: modelKey,
    aspectRatio: g.params?.aspectRatio ?? "1:1",
    imageSize: g.params?.imageSize ?? "1K",
    count: g.params?.count ?? 1,
    references: await toAssetDtos(assetRows),
  };
}
