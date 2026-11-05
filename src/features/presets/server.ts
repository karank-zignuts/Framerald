import "server-only";
import { z } from "zod";
import { db, OWNER_ID } from "@/lib/supabase/server";
import { HttpError } from "@/lib/http";
import { BUILTIN_PRESETS, type CreatePresetInput, type PresetKind, type PresetTemplate } from "./templates";

type PresetRow = {
  id: string;
  kind: PresetKind;
  name: string;
  prompt_template: string;
  params: unknown;
};

// The table has one `kind` column; the group and the full list of kinds live in `params`.
const paramsSchema = z.object({
  group: z.enum(["camera", "style"]).default("style"),
  kinds: z.array(z.enum(["image", "video"])).optional(),
});

const COLUMNS = "id,kind,name,prompt_template,params";

function toPreset(row: PresetRow): PresetTemplate {
  const params = paramsSchema.safeParse(row.params);
  const p = params.success ? params.data : { group: "style" as const, kinds: undefined };
  return { id: row.id, name: row.name, group: p.group, template: row.prompt_template, kinds: p.kinds ?? [row.kind], builtin: false };
}

/** The built-in presets plus your own, for one kind of media. */
export async function listPresets(kind: PresetKind): Promise<PresetTemplate[]> {
  const { data, error } = await db()
    .from("presets")
    .select(COLUMNS)
    .eq("owner_id", OWNER_ID)
    .is("deleted_at", null)
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error(`Couldn't load your presets: ${error.message}`);
  const mine = (data as PresetRow[]).map(toPreset).filter((p) => p.kinds?.includes(kind));
  return [...BUILTIN_PRESETS.filter((p) => p.kinds?.includes(kind)), ...mine];
}

export async function createPreset(input: CreatePresetInput): Promise<PresetTemplate> {
  const { data, error } = await db()
    .from("presets")
    .insert({
      owner_id: OWNER_ID,
      kind: input.kinds[0],
      name: input.name,
      prompt_template: input.template,
      params: { group: input.group, kinds: input.kinds },
    })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(`Couldn't save the preset: ${error.message}`);
  return toPreset(data as PresetRow);
}

/** Soft delete. Built-in presets aren't rows, so they can't be deleted. */
export async function deletePreset(id: string): Promise<void> {
  const { data, error } = await db()
    .from("presets")
    .update({ deleted_at: new Date().toISOString() })
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .is("deleted_at", null)
    .select("id");
  if (error) throw new Error(`Couldn't delete the preset: ${error.message}`);
  if (!data?.length) throw new HttpError(404, "That preset doesn't exist any more.");
}
