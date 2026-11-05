import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// The only Supabase client in v1. It uses the secret key, bypasses RLS, and
// must stay in server code. When sign-in is added, add a per-request client
// built with the user's session and keep this one for jobs and webhooks.
let client: SupabaseClient | undefined;

export function db(): SupabaseClient {
  if (!client) {
    const e = env();
    client = createClient(e.SUPABASE_URL, e.SUPABASE_SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}

// The single owner of every row until multi-user arrives (see the foundation migration).
export const OWNER_ID = "00000000-0000-0000-0000-000000000001";
