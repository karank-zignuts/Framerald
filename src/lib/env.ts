import "server-only";
import { z } from "zod";

// Server-only environment, validated once on first use.
// Nothing here may be prefixed NEXT_PUBLIC_.
const serverSchema = z.object({
  // Supabase. Only the server talks to the database in v1, so no browser key.
  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),

  // Google Cloud Vertex AI
  GOOGLE_CLOUD_PROJECT: z.string().min(1),
  GOOGLE_CLOUD_LOCATION: z.string().min(1).default("global"),
  // Base64 of the service account JSON key. Needed on Vercel. Locally you can
  // leave it empty and use Application Default Credentials instead
  // (`gcloud auth application-default login`).
  GOOGLE_SERVICE_ACCOUNT_KEY_B64: z.string().optional(),

  // Optional single password for when the app is deployed. Empty = open (local).
  APP_PASSWORD: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

export function env(): ServerEnv {
  if (!cached) {
    const parsed = serverSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Invalid environment: ${z.prettifyError(parsed.error)}. See .env.example.`,
      );
    }
    cached = parsed.data;
  }
  return cached;
}
