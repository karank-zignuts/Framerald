import { z } from "zod";
import { handle, HttpError } from "@/lib/http";
import { getSpentSince } from "@/features/spend/server";

const querySchema = z.object({ from: z.iso.datetime({ message: "Give a valid start time." }) });

export const GET = handle(async (request: Request) => {
  const parsed = querySchema.parse({ from: new URL(request.url).searchParams.get("from") });
  if (new Date(parsed.from).getTime() > Date.now() + 60_000) throw new HttpError(400, "That start time is in the future.");
  return Response.json({ usd: await getSpentSince(parsed.from) });
});
