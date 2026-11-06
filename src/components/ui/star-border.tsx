import { cn } from "@/lib/utils";

/**
 * Wraps a button so two bright "stars" travel along its edge for as long as the button is active, after React Bits' Star Border.
 * A disabled button shows nothing, and the stars fade in when it is enabled. The wrapper's radius is the button's plus its 2px ring.
 */
export function StarBorder({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("star-border relative inline-flex overflow-hidden rounded-[0.875rem] p-[2px]", className)}>
      <span aria-hidden className="star-border-stars">
        <span className="star-border-bottom" />
        <span className="star-border-top" />
      </span>
      {children}
    </span>
  );
}
