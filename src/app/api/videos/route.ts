import type { NextRequest } from "next/server";
import { z } from "zod";
import { assertSameOrigin, handle, HttpError } from "@/lib/http";
import { generateVideoSchema } from "@/features/videos/schemas";
import { listRecentVideoJobs, startVideoGeneration } from "@/features/videos/server";

export const maxDuration = 120; // starting a clip is quick; the clip itself is followed by polling

export const GET = handle(async (request: NextRequest) => {
  const limit = Number(request.nextUrl.searchParams.get("limit"));
  const project = request.nextUrl.searchParams.get("project");
  return Response.json(
    await listRecentVideoJobs(Number.isFinite(limit) && limit > 0 ? limit : undefined, project && z.uuid().safeParse(project).success ? project : null),
  );
});

export const POST = handle(async (request: Request) => {
  assertSameOrigin(request);
  const body = generateVideoSchema.parse(
    await request.json().catch(() => {
      throw new HttpError(400, "That request wasn't valid JSON.");
    }),
  );
  return Response.json(await startVideoGeneration(body));
});
