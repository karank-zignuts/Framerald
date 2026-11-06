import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { ASSET_LOG } from "./cleanup";

// Removes everything the tests created in the real Supabase project:
// generations whose prompt starts with "[e2e]", their assets, usage rows and
// stored files, plus uploads recorded by trackAsset().
export default async function globalTeardown() {
  process.loadEnvFile(".env.local");
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });

  const { data: gens } = await sb.from("generations").select("id").like("prompt", "[e2e]%");
  const genIds = (gens ?? []).map((g) => g.id as string);
  const tracked = existsSync(ASSET_LOG) ? readFileSync(ASSET_LOG, "utf8").split("\n").filter(Boolean) : [];

  const found = new Map<string, { storage_path: string; thumbnail_path: string | null }>();
  if (genIds.length) {
    const { data } = await sb.from("assets").select("id,storage_path,thumbnail_path").in("generation_id", genIds);
    for (const a of data ?? []) found.set(a.id as string, a);
  }
  if (tracked.length) {
    const { data } = await sb.from("assets").select("id,storage_path,thumbnail_path").in("id", tracked);
    for (const a of data ?? []) found.set(a.id as string, a);
  }

  const files = [...found.values()].flatMap((a) => [a.storage_path, a.thumbnail_path].filter((p): p is string => !!p));
  if (files.length) await sb.storage.from("media").remove(files);
  if (genIds.length) await sb.from("usage_events").delete().in("generation_id", genIds);
  if (found.size) await sb.from("assets").delete().in("id", [...found.keys()]);
  if (genIds.length) await sb.from("generations").delete().in("id", genIds);
  if (existsSync(ASSET_LOG)) rmSync(ASSET_LOG);

  // Agent chats: threads titled "[e2e]...", any message whose text starts with "[e2e]" (refinements land
  // in the shared "Prompt refinements" chat), their usage rows, and a refinements chat left empty.
  const { data: threads } = await sb.from("agent_threads").select("id").like("title", "[e2e]%");
  const threadIds = (threads ?? []).map((t) => t.id as string);
  const messageIds = new Set<string>();
  if (threadIds.length) {
    const { data } = await sb.from("agent_messages").select("id").in("thread_id", threadIds);
    for (const m of data ?? []) messageIds.add(m.id as string);
  }
  const { data: tagged } = await sb.from("agent_messages").select("id").like("content->>text", "[e2e]%");
  for (const m of tagged ?? []) messageIds.add(m.id as string);
  if (messageIds.size) {
    await sb.from("usage_events").delete().in("agent_message_id", [...messageIds]);
    await sb.from("agent_messages").delete().in("id", [...messageIds]);
  }
  if (threadIds.length) await sb.from("agent_threads").delete().in("id", threadIds);
  const { data: refinements } = await sb.from("agent_threads").select("id").eq("title", "Prompt refinements");
  for (const t of refinements ?? []) {
    const { count } = await sb.from("agent_messages").select("id", { count: "exact", head: true }).eq("thread_id", t.id);
    if (!count) await sb.from("agent_threads").delete().eq("id", t.id);
  }

  // Presets created by tests are named "[e2e] ...".
  await sb.from("presets").delete().like("name", "[e2e]%");
  // Projects too (items that pointed at them were deleted above or just lose the link).
  // The test project and any others tests made. Their items were deleted above; anything left just loses the link.
  await sb.from("projects").delete().like("name", "[e2e]%");
}
