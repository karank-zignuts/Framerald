import "server-only";
import { ZodError } from "zod";

/** An error with a status code and a message that is safe to show the user. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Wraps a route handler so thrown errors become `{ error }` JSON with the right status. */
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
      if (error instanceof ZodError) {
        return Response.json({ error: error.issues[0]?.message ?? "That request isn't valid." }, { status: 400 });
      }
      console.error(error);
      const message = error instanceof Error ? error.message : "Something went wrong.";
      return Response.json({ error: message }, { status: 500 });
    }
  };
}

/**
 * Rejects browser requests that come from another website. Requests with no
 * Origin header (curl, tests, server code) pass; browsers always send one on
 * cross-site POST, PATCH and DELETE.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("host");
  if (!host || new URL(origin).host !== host) throw new HttpError(403, "That request came from another site.");
}
