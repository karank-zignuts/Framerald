import { assertSameOrigin, handle, HttpError } from "@/lib/http";
import { refinePromptSchema } from "@/features/agent/schemas";
import { refineInThread } from "@/features/agent/server";

export const maxDuration = 120;

export const POST = handle(async (request: Request) => {
  assertSameOrigin(request);
  const body = refinePromptSchema.parse(
    await request.json().catch(() => {
      throw new HttpError(400, "That request wasn't valid JSON.");
    }),
  );
  return Response.json(await refineInThread(body));
});
