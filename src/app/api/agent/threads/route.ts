import type { NextRequest } from "next/server";
import { z } from "zod";
import { assertSameOrigin, handle } from "@/lib/http";
import { createThreadSchema } from "@/features/agent/schemas";
import { createThread, listThreads } from "@/features/agent/server";

export const GET = handle(async (request: NextRequest) => {
  const project = request.nextUrl.searchParams.get("project");
  return Response.json(await listThreads(project && z.uuid().safeParse(project).success ? project : null));
});

export const POST = handle(async (request: Request) => {
  assertSameOrigin(request);
  const body = createThreadSchema.parse(await request.json().catch(() => ({})));
  return Response.json(await createThread(body.title, body.projectId));
});
