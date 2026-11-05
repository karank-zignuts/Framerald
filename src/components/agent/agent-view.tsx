"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { createThread, deleteThread, renameThread, setThreadProject, streamMessage } from "@/features/agent/api";
import { ProjectSelect } from "@/components/projects/project-select";
import { useCurrentProject } from "@/features/projects/queries";
import { agentKeys, useMessages, useThreads } from "@/features/agent/queries";
import { titleFromMessage, type AgentMessageDto, type Shot, type ThreadDto } from "@/features/agent/schemas";
import { MessageList, type LiveReply } from "./message-list";
import { ThreadList, ThreadSelect } from "./thread-list";

const EXAMPLES = [
  "Plan a six-frame storyboard for a night chase in the rain",
  "Tighten this prompt: a woman in a red coat on a bridge",
  "Give me four versions of a portrait, each with different light",
];

export function AgentView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const qc = useQueryClient();
  const threadId = params.get("thread");

  const threads = useThreads();
  const messages = useMessages(threadId);

  const [draft, setDraft] = useState(() => params.get("idea")?.slice(0, 4000) ?? ""); // set when the Image dock's Agent mode hands an idea over
  const [live, setLive] = useState<LiveReply | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null); // the draft title while renaming
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const [currentProject, setCurrentProject] = useCurrentProject();
  const thread = threads.data?.find((t) => t.id === threadId);
  const title = thread?.title ?? "New chat";
  // An open chat shows its own project; a new chat shows the one it will be created in.
  const activeProject = threadId ? (thread?.projectId ?? null) : currentProject;
  const sending = live !== null;

  function open(id: string | null) {
    setRenaming(null);
    setConfirmingDelete(false);
    router.replace(id ? `${pathname}?thread=${id}` : pathname);
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    let id = threadId;
    let received = false; // true once the reply has started coming back
    let stopped = false;
    setLive({ threadId: id, text: "", shotList: null, error: null });
    try {
      if (!id) {
        // Created under its real name, so the placeholder "New chat" never reaches the list.
        const created = await createThread(titleFromMessage(message), currentProject);
        id = created.id;
        qc.setQueryData<ThreadDto[]>(agentKeys.threads, (old = []) => [created, ...old.filter((t) => t.id !== created.id)]);
        // If the list was still loading, its late answer would erase this entry. Asking again cancels that answer.
        void qc.invalidateQueries({ queryKey: agentKeys.threads });
        qc.setQueryData<AgentMessageDto[]>(agentKeys.messages(id), []);
        setLive((l) => l && { ...l, threadId: created.id });
        router.replace(`${pathname}?thread=${id}`);
      }
      // Show the message at once; the refetch below swaps in the saved one.
      qc.setQueryData<AgentMessageDto[]>(agentKeys.messages(id), (old = []) => [
        ...old,
        { id: `pending-${Date.now()}`, role: "user", text: message, shotList: null, error: null, createdAt: new Date().toISOString(), costUsd: null },
      ]);
      setDraft("");
      abort.current = new AbortController();
      await streamMessage(
        id,
        message,
        (event) => {
          received = true;
          if (event.type === "text") setLive((l) => l && { ...l, text: l.text + event.delta });
          else if (event.type === "shots") setLive((l) => l && { ...l, shotList: event.shotList });
          else if (event.type === "error") setLive((l) => l && { ...l, error: event.message });
        },
        abort.current.signal,
      );
    } catch (error) {
      // Stopping on purpose is not an error; the server saves what was written.
      stopped = (error as { name?: string })?.name === "AbortError";
      if (!stopped) {
        toast.error(error instanceof Error ? error.message : "Something went wrong. Try again.");
        if (!received) setDraft(message); // the reply never started, so give the message back
      }
    } finally {
      abort.current = null;
      if (id) await qc.invalidateQueries({ queryKey: agentKeys.messages(id) });
      setLive(null); // the saved reply is in now; showing both would repeat it for a moment
      await qc.invalidateQueries({ queryKey: agentKeys.threads });
      // The server saves a stopped reply a moment after the connection closes; look again once it has.
      const savedId = id;
      if (stopped && savedId) setTimeout(() => void qc.invalidateQueries({ queryKey: agentKeys.messages(savedId) }), 1500);
    }
  }

  function refineShot(shot: Shot, index: number) {
    setDraft(`Refine shot ${index + 1}: "${shot.prompt}"\n\n`);
    input.current?.focus();
  }

  async function changeProject(id: string | null) {
    setCurrentProject(id);
    if (!threadId) return;
    try {
      await setThreadProject(threadId, id);
      await qc.invalidateQueries({ queryKey: agentKeys.threads });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't move the chat.");
    }
  }

  async function saveTitle() {
    const next = renaming?.trim();
    setRenaming(null);
    if (!threadId || !next || next === title) return;
    try {
      await renameThread(threadId, next);
      await qc.invalidateQueries({ queryKey: agentKeys.threads });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't rename the chat.");
    }
  }

  async function removeThread() {
    if (!threadId) return;
    try {
      await deleteThread(threadId);
      setConfirmingDelete(false);
      await qc.invalidateQueries({ queryKey: agentKeys.threads });
      open(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete the chat.");
    }
  }

  const shown = messages.data ?? [];
  const liveHere = live !== null && live.threadId === threadId;
  const isEmpty = shown.length === 0 && !liveHere;

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <ThreadList
        threads={threads.data}
        isPending={threads.isPending}
        error={threads.error}
        onRetry={() => void threads.refetch()}
        activeId={threadId}
        onSelect={open}
      />

      <section aria-label="Conversation" className="flex min-h-[28rem] min-w-0 flex-1 flex-col lg:min-h-0">
        <header className="flex flex-col gap-2 border-b border-border px-5 py-3">
          <ThreadSelect threads={threads.data} activeId={threadId} onSelect={open} />
          <div className="w-full max-w-xs">
            <ProjectSelect label="Project" value={activeProject} onChange={(id) => void changeProject(id)} />
          </div>
          <div className="flex min-h-9 items-center justify-between gap-3">
            {renaming !== null ? (
              <form
                className="flex flex-1 items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveTitle();
                }}
              >
                <Input
                  aria-label="Chat name"
                  value={renaming}
                  onChange={(e) => setRenaming(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setRenaming(null)}
                  maxLength={120}
                  autoFocus
                />
                <Button type="submit" size="icon" variant="secondary" aria-label="Save name">
                  <Check aria-hidden className="size-4" />
                </Button>
              </form>
            ) : (
              <h1 className="truncate text-lg font-medium text-foreground" data-testid="thread-title">
                {title}
              </h1>
            )}

            {threadId && renaming === null && (
              <div className="flex shrink-0 items-center gap-1">
                {confirmingDelete ? (
                  <div role="alert" className="flex items-center gap-2 text-sm">
                    <span>Delete this chat?</span>
                    <Button size="sm" variant="destructive" onClick={() => void removeThread()}>
                      Delete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button size="icon" variant="ghost" aria-label="Rename chat" onClick={() => setRenaming(title)}>
                      <Pencil aria-hidden className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Delete chat" onClick={() => setConfirmingDelete(true)}>
                      <Trash2 aria-hidden className="size-4" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
          {threadId && messages.isPending && (
            <div role="status" aria-label="Loading messages" className="flex flex-col gap-6">
              <Skeleton className="ml-auto h-12 w-2/3 rounded-lg" />
              <Skeleton className="h-24 w-full max-w-xl rounded-lg" />
            </div>
          )}

          {threadId && messages.isError && (
            <div role="alert" className="flex max-w-md flex-col items-start gap-3 rounded-lg border border-destructive/50 p-4">
              <p className="text-sm">Couldn&apos;t load this chat: {messages.error.message}</p>
              <Button variant="secondary" size="sm" onClick={() => void messages.refetch()}>
                Try again
              </Button>
            </div>
          )}

          {!messages.isError && !(threadId && messages.isPending) && isEmpty && (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                title="What are you making?"
                description="Describe an idea and the agent plans the shots. Send any shot to the Image studio, or paste a prompt to tighten it."
                action={
                  <div className="flex flex-col items-stretch gap-2">
                    {EXAMPLES.map((example) => (
                      <Button
                        key={example}
                        variant="secondary"
                        size="sm"
                        className="h-auto justify-start whitespace-normal py-2 text-left"
                        onClick={() => {
                          setDraft(example);
                          input.current?.focus();
                        }}
                      >
                        {example}
                      </Button>
                    ))}
                  </div>
                }
              />
            </div>
          )}

          {!isEmpty && !(threadId && messages.isPending) && <MessageList messages={shown} live={live && live.threadId === threadId ? live : null} onRefineShot={refineShot} />}
        </div>

        <form
          className="flex items-end gap-3 border-t border-border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
        >
          <Textarea
            ref={input}
            aria-label="Message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(draft);
              }
            }}
            placeholder="Describe an idea, or paste a prompt to refine"
            rows={2}
            maxLength={8000}
            className="max-h-40"
          />
          {sending ? (
            <Button type="button" variant="secondary" size="lg" onClick={() => abort.current?.abort()}>
              Stop
            </Button>
          ) : (
            <Button type="submit" size="lg" disabled={!draft.trim()} className="bg-brand text-brand-foreground hover:bg-brand-strong">
              Send
            </Button>
          )}
        </form>
      </section>
    </div>
  );
}
