import { z } from "zod";
import { assertSameOrigin, handle, HttpError } from "@/lib/http";
import { getAsset, moveAsset, setFavorite, softDeleteAsset } from "@/features/library/server";
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
  .object({ isFavorite: z.boolean().optional(), projectId: projectFieldSchema })
  .refine((b) => b.isFavorite !== undefined || b.projectId !== undefined, { message: "Say what to change." });

export const PATCH = handle(async (request: Request, { params }: RouteContext<"/api/assets/[id]">) => {
  assertSameOrigin(request);
  const body = patchSchema.parse(await request.json().catch(() => ({})));
  const id = await idFrom(params);
  if (body.isFavorite !== undefined) await setFavorite(id, body.isFavorite);
  if (body.projectId !== undefined) await moveAsset(id, body.projectId);
  return Response.json({ ok: true });
});

export const DELETE = handle(async (request: Request, { params }: RouteContext<"/api/assets/[id]">) => {
  assertSameOrigin(request);
  await softDeleteAsset(await idFrom(params));
  return Response.json({ ok: true });
});
