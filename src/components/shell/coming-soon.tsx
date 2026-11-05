import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function ComingSoon({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState icon={<Icon aria-hidden className="size-6" />} title={title} description={description} />
    </div>
  );
}
