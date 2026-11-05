import type { NextRequest } from "next/server";
import { assertSameOrigin, handle, HttpError } from "@/lib/http";
import { createPresetSchema } from "@/features/presets/templates";
import { createPreset, listPresets } from "@/features/presets/server";

export const GET = handle(async (request: NextRequest) => {
  const kind = request.nextUrl.searchParams.get("kind");
  if (kind !== "image" && kind !== "video") throw new HttpError(400, "Say which kind of presets: image or video.");
  return Response.json(await listPresets(kind));
});

export const POST = handle(async (request: Request) => {
  assertSameOrigin(request);
  const body = createPresetSchema.parse(
    await request.json().catch(() => {
      throw new HttpError(400, "That request wasn't valid JSON.");
    }),
  );
  return Response.json(await createPreset(body));
});
