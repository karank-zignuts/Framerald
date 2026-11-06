import { z } from "zod";
import { assertSameOrigin, handle, HttpError } from "@/lib/http";
import { getAsset, moveAsset, renameAsset, restoreAsset, setFavorite, softDeleteAsset } from "@/features/library/server";
import { projectFieldSchema } from "@/features/projects/schemas";

async function idFrom(params: Promise<{ id: string }>) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new HttpError(400, "That id isn't valid.");
  return id;
}

export const GET = handle(async (_request: Request, { params }: RouteContext<"/api/assets/[id]">) => {
  return Response.json(await getAsset(await idFrom(params)));
});

const patchSchema = z
  .object({
    isFavorite: z.boolean().optional(),
    projectId: projectFieldSchema,
    restore: z.literal(true).optional(),
    name: z.string().trim().min(1, "Give it a name, or leave it as it is.").max(80, "Keep the name under 80 characters.").nullable().optional(),
  })
  .refine((b) => b.isFavorite !== undefined || b.projectId !== undefined || b.name !== undefined || b.restore === true, { message: "Say what to change." });

export const PATCH = handle(async (request: Request, { params }: RouteContext<"/api/assets/[id]">) => {
  assertSameOrigin(request);
  const body = patchSchema.parse(await request.json().catch(() => ({})));
  const id = await idFrom(params);
  if (body.isFavorite !== undefined) await setFavorite(id, body.isFavorite);
  if (body.projectId !== undefined) await moveAsset(id, body.projectId);
  if (body.name !== undefined) await renameAsset(id, body.name);
  if (body.restore) await restoreAsset(id);
  return Response.json({ ok: true });
});

export const DELETE = handle(async (request: Request, { params }: RouteContext<"/api/assets/[id]">) => {
  assertSameOrigin(request);
  await softDeleteAsset(await idFrom(params));
  return Response.json({ ok: true });
});
