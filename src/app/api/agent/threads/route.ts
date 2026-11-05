import { assertSameOrigin, handle } from "@/lib/http";
import { createThreadSchema } from "@/features/agent/schemas";
import { createThread, listThreads } from "@/features/agent/server";

export const GET = handle(async () => Response.json(await listThreads()));

export const POST = handle(async (request: Request) => {
  assertSameOrigin(request);
  const body = createThreadSchema.parse(await request.json().catch(() => ({})));
  return Response.json(await createThread(body.title));
});
