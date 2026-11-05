import { assertSameOrigin, handle } from "@/lib/http";
import { uuidParam } from "@/lib/ids";
import { renameThreadSchema } from "@/features/agent/schemas";
import { deleteThread, renameThread } from "@/features/agent/server";

export const PATCH = handle(async (request: Request, { params }: RouteContext<"/api/agent/threads/[id]">) => {
  assertSameOrigin(request);
  const body = renameThreadSchema.parse(await request.json().catch(() => ({})));
  return Response.json(await renameThread(await uuidParam(params), body.title));
});

export const DELETE = handle(async (request: Request, { params }: RouteContext<"/api/agent/threads/[id]">) => {
  assertSameOrigin(request);
  await deleteThread(await uuidParam(params));
  return Response.json({ ok: true });
});

