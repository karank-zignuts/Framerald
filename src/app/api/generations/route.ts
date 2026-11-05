import { assertSameOrigin, handle, HttpError } from "@/lib/http";
import { generateRequestSchema } from "@/features/generations/schemas";
import { runGeneration } from "@/features/generations/server";

// A 4-image request can take a minute or two.
export const maxDuration = 300;

export const POST = handle(async (request: Request) => {
  assertSameOrigin(request);
  const body = await request.json().catch(() => {
    throw new HttpError(400, "That request wasn't valid JSON.");
  });
  const result = await runGeneration(generateRequestSchema.parse(body));
  return Response.json(result);
});
