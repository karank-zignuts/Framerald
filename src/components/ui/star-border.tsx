import { cn } from "@/lib/utils";

/**
 * A thin ring around a button, with a small gap between the two, and two bright "stars" that travel along that ring (after React
 * Bits' Star Border). The ring and the stars show for as long as the button is active and fade out when it is disabled. The gap is
 * dark, so the stars read against it instead of blending into the button.
 *
 * Geometry: 1px ring, 3px gap, so the wrapper pads the button by 4px and its radius is the button's plus 4px. Pass a negative margin
 * (`-m-1`) where the ring should hang outside the button's own footprint instead of making its row taller.
 */
export function StarBorder({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("star-border relative inline-flex rounded-[1rem] p-1", className)}>
      <span aria-hidden className="star-border-stars">
        <span className="star-border-bottom" />
        <span className="star-border-top" />
      </span>
      {children}
    </span>
  );
}
