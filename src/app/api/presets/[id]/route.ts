import { assertSameOrigin, handle } from "@/lib/http";
import { uuidParam } from "@/lib/ids";
import { deletePreset } from "@/features/presets/server";

export const DELETE = handle(async (request: Request, { params }: RouteContext<"/api/presets/[id]">) => {
  assertSameOrigin(request);
  await deletePreset(await uuidParam(params));
  return Response.json({ ok: true });
});
