import { assertSameOrigin, handle } from "@/lib/http";
import { uuidParam } from "@/lib/ids";
import { restoreProject } from "@/features/projects/server";

export const POST = handle(async (request: Request, { params }: RouteContext<"/api/projects/[id]/restore">) => {
  assertSameOrigin(request);
  return Response.json(await restoreProject(await uuidParam(params)));
});
