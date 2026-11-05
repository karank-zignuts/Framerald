import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { listAssets } from "@/features/library/server";

export const GET = handle(async (request: NextRequest) => {
  const p = request.nextUrl.searchParams;
  const limit = Number(p.get("limit"));
  return Response.json(
    await listAssets({
      cursor: p.get("cursor"),
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
      favoritesOnly: p.get("favorites") === "1",
    }),
  );
});
