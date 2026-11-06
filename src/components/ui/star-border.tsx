import { cn } from "@/lib/utils";

/**
 * Wraps a button so two bright "stars" travel along its edge while it is hovered or focused, after React Bits' Star Border.
 * Nothing shows at rest, and nothing shows on a disabled button. The wrapper's radius is the button's plus its 1.5px ring.
 */
export function StarBorder({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("star-border relative inline-flex overflow-hidden rounded-[1.0625rem] p-[1.5px]", className)}>
      <span aria-hidden className="star-border-stars">
        <span className="star-border-bottom" />
        <span className="star-border-top" />
      </span>
      {children}
    </span>
  );
}
