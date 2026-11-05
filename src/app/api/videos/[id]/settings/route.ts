import { handle } from "@/lib/http";
import { uuidParam } from "@/lib/ids";
import { getVideoReRunSettings } from "@/features/videos/server";

export const GET = handle(async (_request: Request, { params }: RouteContext<"/api/videos/[id]/settings">) => {
  return Response.json(await getVideoReRunSettings(await uuidParam(params)));
});
