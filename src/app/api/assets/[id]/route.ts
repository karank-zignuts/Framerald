import { z } from "zod";
import { assertSameOrigin, handle, HttpError } from "@/lib/http";
import { getAsset, setFavorite, softDeleteAsset } from "@/features/library/server";

async function idFrom(params: Promise<{ id: string }>) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new HttpError(400, "That id isn't valid.");
  return id;
}

export const GET = handle(async (_request: Request, { params }: RouteContext<"/api/assets/[id]">) => {
  return Response.json(await getAsset(await idFrom(params)));
});

const patchSchema = z.object({ isFavorite: z.boolean() });

export const PATCH = handle(async (request: Request, { params }: RouteContext<"/api/assets/[id]">) => {
  assertSameOrigin(request);
  const body = patchSchema.parse(await request.json().catch(() => ({})));
  await setFavorite(await idFrom(params), body.isFavorite);
  return Response.json({ ok: true });
});

export const DELETE = handle(async (request: Request, { params }: RouteContext<"/api/assets/[id]">) => {
  assertSameOrigin(request);
  await softDeleteAsset(await idFrom(params));
  return Response.json({ ok: true });
});
