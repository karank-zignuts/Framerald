import { MessageSquareText } from "lucide-react";
import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Agent" };

export default function AgentPage() {
  return (
    <ComingSoon
      icon={MessageSquareText}
      title="The agent isn't built yet"
      description="It will tighten your prompts and plan shot lists, then send them to the studios."
    />
  );
}
