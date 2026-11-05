import { handle } from "@/lib/http";
import { uuidParam } from "@/lib/ids";
import { refreshVideoJob } from "@/features/videos/server";

export const maxDuration = 120;

// The status check. Polled every few seconds while a clip runs; saves the clip once Google has it.
export const GET = handle(async (_request: Request, { params }: RouteContext<"/api/videos/[id]">) => {
  return Response.json(await refreshVideoJob(await uuidParam(params)));
});
