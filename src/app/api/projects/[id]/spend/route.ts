import { handle } from "@/lib/http";
import { uuidParam } from "@/lib/ids";
import { getProjectSpend } from "@/features/spend/server";

export const GET = handle(async (_request: Request, { params }: RouteContext<"/api/projects/[id]/spend">) =>
  Response.json({ usd: await getProjectSpend(await uuidParam(params)) }),
);
