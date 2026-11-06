import { assertSameOrigin, handle, HttpError } from "@/lib/http";
import { projectNameSchema } from "@/features/projects/schemas";
import type { NextRequest } from "next/server";
import { createProject, listDeletedProjects, listProjects } from "@/features/projects/server";

export const GET = handle(async (request: NextRequest) =>
  Response.json(request.nextUrl.searchParams.get("trash") === "1" ? await listDeletedProjects() : await listProjects()),
);

export const POST = handle(async (request: Request) => {
  assertSameOrigin(request);
  const body = projectNameSchema.parse(
    await request.json().catch(() => {
      throw new HttpError(400, "That request wasn't valid JSON.");
    }),
  );
  return Response.json(await createProject(body.name));
});
