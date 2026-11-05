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
