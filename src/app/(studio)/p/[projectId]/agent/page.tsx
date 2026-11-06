import type { Metadata } from "next";
import { Suspense } from "react";
import { AgentView } from "@/components/agent/agent-view";
import { PageLoader } from "@/components/loading/ripple";

// The project layout waits for the project list before showing a page, so there is no instant shell to validate here.
export const instant = false;

export const metadata: Metadata = { title: "Agent" };

export default function AgentPage() {
  return (
    <Suspense
      fallback={<PageLoader />}
    >
      <AgentView />
    </Suspense>
  );
}
