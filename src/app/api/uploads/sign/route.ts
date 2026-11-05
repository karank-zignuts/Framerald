import { assertSameOrigin, handle, HttpError } from "@/lib/http";
import { signUploadSchema } from "@/features/assets/schemas";
import { signUpload } from "@/features/assets/server";

export const POST = handle(async (request: Request) => {
  assertSameOrigin(request);
  const body = signUploadSchema.parse(
    await request.json().catch(() => {
      throw new HttpError(400, "That request wasn't valid JSON.");
    }),
  );
  return Response.json(await signUpload(body));
});
