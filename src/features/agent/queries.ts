import { useQuery } from "@tanstack/react-query";
import { fetchMessages, fetchThreads } from "./api";

export const agentKeys = {
  threads: ["agent", "threads"] as const,
  messages: (threadId: string) => ["agent", "messages", threadId] as const,
};

export const useThreads = () => useQuery({ queryKey: agentKeys.threads, queryFn: fetchThreads });

export const useMessages = (threadId: string | null) =>
  useQuery({
    queryKey: agentKeys.messages(threadId ?? "none"),
    queryFn: () => fetchMessages(threadId!),
    enabled: Boolean(threadId),
  });
