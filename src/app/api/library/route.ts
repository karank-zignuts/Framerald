import type { NextRequest } from "next/server";
import { z } from "zod";
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
      projectId: z.uuid().safeParse(p.get("project")).success ? p.get("project") : null,
      q: p.get("q"),
      source: p.get("source") === "upload" ? "upload" : "generated",
      unsorted: p.get("unsorted") === "1",
      trashed: p.get("trash") === "1",
      order: p.get("order") === "oldest" ? "oldest" : "newest",
      kind: p.get("kind") === "image" || p.get("kind") === "video" ? (p.get("kind") as "image" | "video") : null,
    }),
  );
});
