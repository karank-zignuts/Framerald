import { assertSameOrigin, handle, HttpError } from "@/lib/http";
import { uuidParam } from "@/lib/ids";
import { sendMessageSchema } from "@/features/agent/schemas";
import { listMessages, streamReply } from "@/features/agent/server";

// A reply can take a minute with thinking.
export const maxDuration = 300;

export const GET = handle(async (_request: Request, { params }: RouteContext<"/api/agent/threads/[id]/messages">) => {
  return Response.json(await listMessages(await uuidParam(params)));
});

// Streams newline-delimited JSON events; see features/agent/stream.ts.
export const POST = handle(async (request: Request, { params }: RouteContext<"/api/agent/threads/[id]/messages">) => {
  assertSameOrigin(request);
  const body = sendMessageSchema.parse(
    await request.json().catch(() => {
      throw new HttpError(400, "That request wasn't valid JSON.");
    }),
  );
  const stream = await streamReply(await uuidParam(params), body.text);
  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no", // don't let a proxy hold the stream back
    },
  });
});
