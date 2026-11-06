"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ThreadDto } from "@/features/agent/schemas";
import { cn } from "@/lib/utils";

type Props = {
  threads: ThreadDto[] | undefined;
  isPending: boolean;
  error: Error | null;
  onRetry: () => void;
  activeId: string | null;
  onSelect: (id: string | null) => void;
};

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** The chat list, shown beside the conversation from 64rem up. */
export function ThreadList({ threads, isPending, error, onRetry, activeId, onSelect }: Props) {
  return (
    <aside aria-label="Chats" className="hidden w-64 shrink-0 flex-col gap-3 border-r border-[var(--glass-border)] bg-card/50 p-3 backdrop-blur-xl lg:flex">
      <Button variant="secondary" size="sm" onClick={() => onSelect(null)} className="justify-start">
        <Plus aria-hidden className="size-3.5" />
        New chat
      </Button>

      <nav aria-label="Your chats" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {isPending && (
          <div role="status" aria-label="Loading chats" className="flex flex-col gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        )}
        {error && (
          <div role="alert" className="flex flex-col items-start gap-2 text-sm">
            <p>Couldn&apos;t load your chats.</p>
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Try again
            </Button>
          </div>
        )}
        {threads && threads.length === 0 && <p className="px-2 py-1 text-sm text-muted-foreground">No chats yet.</p>}
        {threads?.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            aria-current={t.id === activeId ? "true" : undefined}
            title={t.title}
            className={cn(
              "truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-fast",
              t.id === activeId ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              focusRing,
            )}
          >
            {t.title}
          </button>
        ))}
      </nav>
    </aside>
  );
}

/** The same list as a menu, for narrow screens. */
export function ThreadSelect({ threads, activeId, onSelect }: Pick<Props, "threads" | "activeId" | "onSelect">) {
  return (
    <div className="lg:hidden">
      <Select value={activeId ?? "new"} onValueChange={(v) => onSelect(v === "new" ? null : v)}>
        <SelectTrigger aria-label="Chat">
          <SelectValue placeholder="New chat" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="new">New chat</SelectItem>
          {threads?.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
