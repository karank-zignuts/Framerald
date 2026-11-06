import { useQuery } from "@tanstack/react-query";
import { fetchMessages, fetchThreads } from "./api";

export const agentKeys = {
  threads: ["agent", "threads"] as const,
  threadsFor: (projectId: string) => ["agent", "threads", projectId] as const,
  messages: (threadId: string) => ["agent", "messages", threadId] as const,
};

export const useThreads = (projectId: string) => useQuery({ queryKey: agentKeys.threadsFor(projectId), queryFn: () => fetchThreads(projectId) });

export const useMessages = (threadId: string | null) =>
  useQuery({
    queryKey: agentKeys.messages(threadId ?? "none"),
    queryFn: () => fetchMessages(threadId!),
    enabled: Boolean(threadId),
  });
