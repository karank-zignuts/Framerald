import { authConfig } from "@/lib/auth/config";
import { bearerMatches } from "@/lib/auth/session";
import { handle, HttpError } from "@/lib/http";
import { refreshRunningVideoJobs } from "@/features/videos/server";

export const maxDuration = 60;

// Checks every running clip and fails the ones that are stuck, so clips finish with the tab closed.
// Off unless CRON_SECRET is set. Vercel Cron calls this with `Authorization: Bearer <CRON_SECRET>`.
export const GET = handle(async (request: Request) => {
  const { cronSecret } = authConfig();
  if (!cronSecret) throw new HttpError(404, "The cron route is off. Set CRON_SECRET to turn it on.");
  if (!bearerMatches(request.headers.get("authorization"), cronSecret)) throw new HttpError(401, "Not allowed.");
  return Response.json(await refreshRunningVideoJobs());
});
