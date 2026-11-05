import { readJson } from "@/features/generations/api";
import type { AgentMessageDto, ThreadDto } from "./schemas";
import { createEventParser, type AgentEvent } from "./stream";

// Browser-side calls to the agent routes.

const json = { "content-type": "application/json" };

export const fetchThreads = () => fetch("/api/agent/threads").then((r) => readJson<ThreadDto[]>(r));

export const createThread = (title?: string) =>
  fetch("/api/agent/threads", { method: "POST", headers: json, body: JSON.stringify(title ? { title } : {}) }).then((r) =>
    readJson<ThreadDto>(r),
  );

export const renameThread = (id: string, title: string) =>
  fetch(`/api/agent/threads/${id}`, { method: "PATCH", headers: json, body: JSON.stringify({ title }) }).then((r) =>
    readJson<ThreadDto>(r),
  );

export const deleteThread = (id: string) =>
  fetch(`/api/agent/threads/${id}`, { method: "DELETE" }).then((r) => readJson<unknown>(r).then(() => undefined));

export const fetchMessages = (threadId: string) =>
  fetch(`/api/agent/threads/${threadId}/messages`).then((r) => readJson<AgentMessageDto[]>(r));

export const refinePromptRequest = (prompt: string, aspectRatio?: string, kind?: "image" | "video") =>
  fetch("/api/agent/refine-prompt", { method: "POST", headers: json, body: JSON.stringify({ prompt, aspectRatio, kind }) }).then((r) =>
    readJson<{ prompt: string }>(r),
  );

/**
 * Sends a message and calls `onEvent` for each event as the reply streams in.
 * Rejects when the request itself fails (bad thread, validation); a failure
 * during the reply arrives as an `error` event instead.
 */
export async function streamMessage(
  threadId: string,
  text: string,
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`/api/agent/threads/${threadId}/messages`, {
    method: "POST",
    headers: json,
    body: JSON.stringify({ text }),
    signal,
  });
  if (!res.ok || !res.body) {
    await readJson<unknown>(res); // throws with the server's message
    return;
  }
  const parser = createEventParser();
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const event of parser.push(value)) onEvent(event);
  }
}
