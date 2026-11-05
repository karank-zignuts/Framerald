import { assertSameOrigin, handle, HttpError } from "@/lib/http";
import { completeUploadSchema } from "@/features/assets/schemas";
import { completeUpload } from "@/features/assets/server";

export const POST = handle(async (request: Request) => {
  assertSameOrigin(request);
  const body = completeUploadSchema.parse(
    await request.json().catch(() => {
      throw new HttpError(400, "That request wasn't valid JSON.");
    }),
  );
  return Response.json(await completeUpload(body));
});
