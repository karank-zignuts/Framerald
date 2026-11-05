import { z } from "zod";
import { handle, HttpError } from "@/lib/http";
import { getReRunSettings } from "@/features/library/server";

// Everything needed to repeat an earlier generation.
export const GET = handle(async (_request: Request, { params }: RouteContext<"/api/generations/[id]">) => {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new HttpError(400, "That id isn't valid.");
  return Response.json(await getReRunSettings(id));
});
