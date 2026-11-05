"use client";

import { useEffect, useRef } from "react";
import { formatCost } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AgentMessageDto, Shot, ShotList } from "@/features/agent/schemas";
import { ShotCards } from "./shot-cards";

/** The reply being written right now, before it is saved. */
export type LiveReply = { threadId: string | null; text: string; shotList: ShotList | null; error: string | null };

type Props = {
  messages: AgentMessageDto[];
  live: LiveReply | null;
  onRefineShot: (shot: Shot, index: number) => void;
};

function UserMessage({ text }: { text: string }) {
  return (
    <div className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-lg bg-secondary px-4 py-3 text-sm leading-relaxed text-foreground" data-testid="user-message">
      {text}
    </div>
  );
}

function AssistantMessage({
  text,
  shotList,
  error,
  costUsd,
  pending,
  onRefineShot,
}: {
  text: string;
  shotList: ShotList | null;
  error: string | null;
  costUsd?: number | null;
  pending?: boolean;
  onRefineShot: Props["onRefineShot"];
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-4" data-testid="assistant-message">
      {text ? (
        <p className="select-text whitespace-pre-wrap text-sm leading-relaxed text-foreground">{text}</p>
      ) : pending && !shotList ? (
        <p role="status" className="text-sm text-muted-foreground motion-safe:animate-pulse">
          Thinking
        </p>
      ) : null}
      {shotList && <ShotCards list={shotList} onRefine={onRefineShot} />}
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/50 px-3 py-2 text-sm" data-testid="reply-error">
          {error}
        </p>
      )}
      {!pending && costUsd !== undefined && (
        <p className="text-xs tabular-nums text-muted-foreground" data-testid="reply-cost">
          {formatCost(costUsd)}
        </p>
      )}
    </div>
  );
}

export function MessageList({ messages, live, onRefineShot }: Props) {
  // Keep the newest text in view while a reply arrives.
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length, live?.text, live?.shotList]);

  return (
    <div role="log" aria-label="Conversation messages" className={cn("flex flex-col gap-8")} data-testid="messages">
      {messages.map((m) =>
        m.role === "user" ? (
          <UserMessage key={m.id} text={m.text} />
        ) : (
          <AssistantMessage key={m.id} text={m.text} shotList={m.shotList} error={m.error} costUsd={m.costUsd} onRefineShot={onRefineShot} />
        ),
      )}
      {live && <AssistantMessage text={live.text} shotList={live.shotList} error={live.error} pending onRefineShot={onRefineShot} />}
      <div ref={end} />
    </div>
  );
}
