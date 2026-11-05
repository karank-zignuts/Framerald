import { assertSameOrigin, handle, HttpError } from "@/lib/http";
import { saveUpload } from "@/features/assets/server";

export const POST = handle(async (request: Request) => {
  assertSameOrigin(request);
  const form = await request.formData().catch(() => {
    throw new HttpError(400, "That upload wasn't valid.");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Choose an image to upload.");
  return Response.json(await saveUpload(file));
});
