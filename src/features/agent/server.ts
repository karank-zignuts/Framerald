import "server-only";
import { z } from "zod";
import { db, OWNER_ID } from "@/lib/supabase/server";
import { HttpError } from "@/lib/http";
import { assertProject } from "@/features/projects/server";
import { AGENT_MODEL, agentErrorMessage, refinePrompt, streamAgentReply } from "@/lib/ai/agent";
import { textCostUsd, type TextUsage } from "@/lib/ai/cost";
import { buildContents, type StoredMessage } from "./history";
import { shotListSchema, titleFromMessage, type AgentMessageDto, type ShotList, type ThreadDto } from "./schemas";
import { encodeEvent, type AgentEvent } from "./stream";

const DEFAULT_TITLE = "New chat";
const REFINEMENTS_TITLE = "Prompt refinements";
const HISTORY_FETCH = 60; // newest messages read for a reply; buildContents trims further

type ThreadRow = { id: string; title: string | null; updated_at: string; project_id: string | null };
type MessageRow = {
  id: string;
  role: "user" | "assistant" | "tool";
  content: unknown;
  cost_usd: number | string | null;
  created_at: string;
};

// What we keep in agent_messages.content.
const contentSchema = z.object({
  text: z.string().default(""),
  shotList: shotListSchema.optional(),
  error: z.string().optional(),
});

const toThreadDto = (r: ThreadRow): ThreadDto => ({ id: r.id, title: r.title ?? DEFAULT_TITLE, updatedAt: r.updated_at, projectId: r.project_id });

function toMessageDto(r: MessageRow): AgentMessageDto | null {
  if (r.role === "tool") return null;
  const parsed = contentSchema.safeParse(r.content);
  const c = parsed.success ? parsed.data : { text: "" };
  return {
    id: r.id,
    role: r.role,
    text: c.text,
    shotList: ("shotList" in c ? c.shotList : undefined) ?? null,
    error: ("error" in c ? c.error : undefined) ?? null,
    createdAt: r.created_at,
    costUsd: r.cost_usd === null ? null : Number(r.cost_usd),
  };
}

const THREAD_COLUMNS = "id,title,updated_at,project_id";
const MESSAGE_COLUMNS = "id,role,content,cost_usd,created_at";

// ─── Threads ─────────────────────────────────────────────────────────────────

export async function listThreads(): Promise<ThreadDto[]> {
  const { data, error } = await db()
    .from("agent_threads")
    .select(THREAD_COLUMNS)
    .eq("owner_id", OWNER_ID)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Couldn't load your chats: ${error.message}`);
  return (data as ThreadRow[]).map(toThreadDto);
}

export async function createThread(title?: string, projectId?: string | null): Promise<ThreadDto> {
  if (projectId) await assertProject(projectId);
  const { data, error } = await db()
    .from("agent_threads")
    .insert({ owner_id: OWNER_ID, title: title ?? DEFAULT_TITLE, project_id: projectId ?? null })
    .select(THREAD_COLUMNS)
    .single();
  if (error) throw new Error(`Couldn't start the chat: ${error.message}`);
  return toThreadDto(data as ThreadRow);
}

async function getThread(id: string): Promise<ThreadDto> {
  const { data, error } = await db()
    .from("agent_threads")
    .select(THREAD_COLUMNS)
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load that chat: ${error.message}`);
  if (!data) throw new HttpError(404, "That chat doesn't exist any more.");
  return toThreadDto(data as ThreadRow);
}

export async function updateThread(id: string, change: { title?: string; projectId?: string | null }): Promise<ThreadDto> {
  if (change.projectId) await assertProject(change.projectId);
  const { data, error } = await db()
    .from("agent_threads")
    .update({ ...(change.title !== undefined && { title: change.title }), ...(change.projectId !== undefined && { project_id: change.projectId }) })
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .is("deleted_at", null)
    .select(THREAD_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(`Couldn't rename the chat: ${error.message}`);
  if (!data) throw new HttpError(404, "That chat doesn't exist any more.");
  return toThreadDto(data as ThreadRow);
}

/** Soft delete: the chat disappears from the list, the rows stay. */
export async function deleteThread(id: string): Promise<void> {
  const { data, error } = await db()
    .from("agent_threads")
    .update({ deleted_at: new Date().toISOString() })
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .is("deleted_at", null)
    .select("id");
  if (error) throw new Error(`Couldn't delete the chat: ${error.message}`);
  if (!data?.length) throw new HttpError(404, "That chat doesn't exist any more.");
}

// ─── Messages ────────────────────────────────────────────────────────────────

export async function listMessages(threadId: string): Promise<AgentMessageDto[]> {
  await getThread(threadId);
  const { data, error } = await db()
    .from("agent_messages")
    .select(MESSAGE_COLUMNS)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(500); // the newest 500, shown oldest first
  if (error) throw new Error(`Couldn't load the messages: ${error.message}`);
  return (data as MessageRow[]).reverse().flatMap((r) => toMessageDto(r) ?? []);
}

async function loadHistory(threadId: string): Promise<StoredMessage[]> {
  const { data, error } = await db()
    .from("agent_messages")
    .select(MESSAGE_COLUMNS)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_FETCH);
  if (error) throw new Error(`Couldn't load the chat history: ${error.message}`);
  return (data as MessageRow[])
    .reverse()
    .flatMap((r) => toMessageDto(r) ?? [])
    .map((m) => ({ role: m.role, text: m.text, shotList: m.shotList, error: m.error }));
}

async function insertUserMessage(threadId: string, text: string): Promise<void> {
  const { error } = await db()
    .from("agent_messages")
    .insert({ thread_id: threadId, owner_id: OWNER_ID, role: "user", content: { text } });
  if (error) throw new Error(`Couldn't save your message: ${error.message}`);
}

/** Saves the assistant's reply with its token counts and cost, and logs usage. */
async function saveAssistantMessage(
  threadId: string,
  reply: { text: string; shotList: ShotList | null; error: string | null; usage: TextUsage | undefined },
): Promise<AgentMessageDto> {
  const { text, shotList, error, usage } = reply;
  const cost = textCostUsd(AGENT_MODEL.id, usage);
  const outputTokens = usage ? (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0) : null;

  const { data, error: insertError } = await db()
    .from("agent_messages")
    .insert({
      thread_id: threadId,
      owner_id: OWNER_ID,
      role: "assistant",
      content: { text, ...(shotList && { shotList }), ...(error && { error }) },
      model: AGENT_MODEL.id,
      input_tokens: usage ? (usage.promptTokenCount ?? 0) : null,
      output_tokens: outputTokens,
      cost_usd: cost?.totalUsd ?? null,
    })
    .select(MESSAGE_COLUMNS)
    .single();
  if (insertError) throw new Error(`Couldn't save the reply: ${insertError.message}`);
  const row = data as MessageRow;

  await recordUsage(row.id, usage, cost);
  await db().from("agent_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
  return toMessageDto(row)!;
}

async function recordUsage(messageId: string, usage: TextUsage | undefined, cost: ReturnType<typeof textCostUsd>) {
  if (!usage || !cost) {
    // Google may have charged for this call but we can't price it. Say so; never write a guess.
    console.error(`[cost] agent message ${messageId} has unknown usage or price; no usage_events row written`);
    return;
  }
  const rows = [
    { unit_type: "input_token", units: usage.promptTokenCount ?? 0, cost_usd: cost.inputUsd },
    { unit_type: "output_token", units: (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0), cost_usd: cost.outputUsd },
  ]
    .filter((r) => r.units > 0)
    .map((r) => ({ ...r, owner_id: OWNER_ID, agent_message_id: messageId, model: AGENT_MODEL.id }));
  if (rows.length === 0) return;
  const { error } = await db().from("usage_events").insert(rows);
  if (error) console.error(`[cost] couldn't record agent usage for ${messageId}: ${error.message}`);
}

/**
 * Saves the user's message, then streams the agent's reply as NDJSON events.
 * The reply is saved when the stream ends, even if it failed or the browser
 * left, so the chat never shows a half-finished state it can't explain.
 */
export async function streamReply(threadId: string, text: string): Promise<ReadableStream<Uint8Array>> {
  const thread = await getThread(threadId);
  await insertUserMessage(threadId, text);
  if (thread.title === DEFAULT_TITLE) await updateThread(threadId, { title: titleFromMessage(text) });
  const history = await loadHistory(threadId);

  const encoder = new TextEncoder();
  let cancelled = false;
  const CANCELLED = Symbol("cancelled");
  let cancelNow: () => void = () => {};
  const cancelled$ = new Promise<typeof CANCELLED>((resolve) => {
    cancelNow = () => resolve(CANCELLED);
  });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AgentEvent) => {
        if (cancelled) return;
        try {
          controller.enqueue(encoder.encode(encodeEvent(event)));
        } catch {
          cancelled = true; // the browser went away
        }
      };

      let replyText = "";
      let shotList: ShotList | null = null;
      let usage: TextUsage | undefined;
      let failure: string | null = null;

      const iterator = streamAgentReply(buildContents(history))[Symbol.asyncIterator]();
      try {
        for (;;) {
          // Race the next chunk against "the browser left", so a stopped reply is saved at once, in order.
          const step = await Promise.race([iterator.next(), cancelled$]);
          if (step === CANCELLED) {
            void iterator.return(undefined).catch(() => {});
            break;
          }
          if (step.done) break;
          const event = step.value;
          if (event.type === "text") {
            replyText += event.delta;
            send({ type: "text", delta: event.delta });
          } else if (event.type === "shots") {
            const parsed = shotListSchema.safeParse(event.shotList);
            if (parsed.success) {
              shotList = parsed.data;
              send({ type: "shots", shotList });
            } else {
              const note = "\n\n(The shot list didn't come through in a usable form. Ask for it again.)";
              replyText += note;
              send({ type: "text", delta: note });
            }
          } else {
            usage = event.usage; // the latest tokens seen; kept even if the stream later fails
          }
        }
      } catch (error) {
        failure = agentErrorMessage(error);
      }
      if (cancelled && !failure) failure = "Stopped before the reply finished.";
      if (!failure && !replyText.trim() && !shotList) failure = "The agent sent an empty reply. Try again.";

      try {
        const message = await saveAssistantMessage(threadId, { text: replyText, shotList, error: failure, usage });
        send(failure ? { type: "error", message: failure } : { type: "done", message });
      } catch (error) {
        console.error(error);
        send({ type: "error", message: "The reply was written but couldn't be saved. Try again." });
      } finally {
        try {
          controller.close();
        } catch {
          // already closed by the browser leaving
        }
      }
    },
    cancel() {
      cancelled = true;
      cancelNow();
    },
  });
}

// ─── Prompt refinement (Image Studio) ────────────────────────────────────────

async function refinementsThreadId(): Promise<string> {
  const { data, error } = await db()
    .from("agent_threads")
    .select("id")
    .eq("owner_id", OWNER_ID)
    .eq("title", REFINEMENTS_TITLE)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Couldn't open the refinements chat: ${error.message}`);
  return data ? (data.id as string) : (await createThread(REFINEMENTS_TITLE)).id;
}

/** Asks the agent for a better prompt and keeps the exchange in one "Prompt refinements" chat. */
export async function refineInThread(input: { prompt: string; aspectRatio?: string; kind?: "image" | "video" }): Promise<{ prompt: string }> {
  let result;
  try {
    result = await refinePrompt(input);
  } catch (error) {
    throw new HttpError(502, agentErrorMessage(error));
  }
  // The call is already paid for, so a failure to keep the history must not lose the answer.
  try {
    const threadId = await refinementsThreadId();
    await insertUserMessage(threadId, input.aspectRatio ? `${input.prompt}\n(Aspect ratio ${input.aspectRatio})` : input.prompt);
    await saveAssistantMessage(threadId, { text: result.prompt, shotList: null, error: null, usage: result.usage });
  } catch (error) {
    console.error("[refine] couldn't save the exchange; cost not recorded", error);
  }
  return { prompt: result.prompt };
}
