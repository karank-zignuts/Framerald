import { assertSameOrigin, handle } from "@/lib/http";
import { uuidParam } from "@/lib/ids";
import { updateThreadSchema } from "@/features/agent/schemas";
import { deleteThread, updateThread } from "@/features/agent/server";

export const PATCH = handle(async (request: Request, { params }: RouteContext<"/api/agent/threads/[id]">) => {
  assertSameOrigin(request);
  const body = updateThreadSchema.parse(await request.json().catch(() => ({})));
  return Response.json(await updateThread(await uuidParam(params), body));
});

export const DELETE = handle(async (request: Request, { params }: RouteContext<"/api/agent/threads/[id]">) => {
  assertSameOrigin(request);
  await deleteThread(await uuidParam(params));
  return Response.json({ ok: true });
});

