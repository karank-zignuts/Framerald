import type { Metadata } from "next";
import { Suspense } from "react";
import { AgentView } from "@/components/agent/agent-view";
import { Skeleton } from "@/components/ui/skeleton";

// The project layout waits for the project list before showing a page, so there is no instant shell to validate here.
export const instant = false;

export const metadata: Metadata = { title: "Agent" };

export default function AgentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col gap-4 p-5" role="status" aria-label="Loading">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-24 w-full max-w-xl rounded-lg" />
        </div>
      }
    >
      <AgentView />
    </Suspense>
  );
}
