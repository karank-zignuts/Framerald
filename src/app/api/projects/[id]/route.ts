import { assertSameOrigin, handle, HttpError } from "@/lib/http";
import { uuidParam } from "@/lib/ids";
import { projectNameSchema } from "@/features/projects/schemas";
import { deleteProject, renameProject } from "@/features/projects/server";

export const PATCH = handle(async (request: Request, { params }: RouteContext<"/api/projects/[id]">) => {
  assertSameOrigin(request);
  const body = projectNameSchema.parse(
    await request.json().catch(() => {
      throw new HttpError(400, "That request wasn't valid JSON.");
    }),
  );
  return Response.json(await renameProject(await uuidParam(params), body.name));
});

export const DELETE = handle(async (request: Request, { params }: RouteContext<"/api/projects/[id]">) => {
  assertSameOrigin(request);
  await deleteProject(await uuidParam(params));
  return Response.json({ ok: true });
});
