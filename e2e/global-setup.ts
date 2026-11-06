import { createClient } from "@supabase/supabase-js";

const OWNER_ID = "00000000-0000-0000-0000-000000000001";

// Every generation now belongs to a project. The tests get one of their own ("[e2e] ..."), and each browser starts
// inside it (see fixtures.ts), so the pages they open and the items they make API calls for are in the same place.
export default async function globalSetup() {
  process.loadEnvFile(".env.local");
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const { data, error } = await sb.from("projects").insert({ owner_id: OWNER_ID, name: "[e2e] studio" }).select("id").single();
  if (error || !data) throw new Error(`Couldn't make the test project: ${error?.message}`);
  process.env.E2E_PROJECT_ID = data.id as string; // visible to the workers started after this
}
