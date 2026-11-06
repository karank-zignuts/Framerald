"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { layoutMasonry } from "@/features/view/masonry";

export type MasonryItem = {
  id: string;
  /** Width divided by height. */
  ratio: number;
  node: React.ReactNode;
};

type Props = {
  items: MasonryItem[];
  /** The narrowest a column may be, in px. */
  columnWidth: number;
  gap?: number;
  "data-testid"?: string;
};

type Placed = { x: number; y: number; width: number; height: number };

/** One item. It fades and blurs in when it first appears (a little later the further down it is), then just glides to new places. */
function Cell({ placed, index, children }: { placed: Placed; index: number; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const [entryDelay] = useState(() => Math.min(index, 12) * 0.04);
  const [settled, setSettled] = useState(false);
  return (
    <motion.div
      className="absolute left-0 top-0"
      initial={reduce ? false : { opacity: 0, ...placed, y: placed.y + 40, scale: 0.96, filter: "blur(8px)" }}
      animate={{ opacity: 1, ...placed, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
      transition={reduce ? { duration: 0 } : { duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: settled ? 0 : entryDelay }}
      onAnimationComplete={() => setSettled(true)}
      whileHover={reduce ? undefined : { scale: 0.985 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A masonry grid in the style of React Bits': every item keeps its own shape and goes in the shortest column. New items fade
 * and blur in with a small stagger, items glide to their place when the width or the size changes, and a hovered one eases in a
 * little. Built with `motion`, which the app already uses.
 */
export function Masonry({ items, columnWidth, gap = 16, "data-testid": testId }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(() => layoutMasonry(items.map((i) => i.ratio), width, columnWidth, gap), [items, width, columnWidth, gap]);

  return (
    <div ref={box} data-testid={testId} className="relative w-full" style={{ height: layout.height }}>
      {width > 0 &&
        items.map((item, index) => (
          <Cell key={item.id} placed={layout.items[index]} index={index}>
            {item.node}
          </Cell>
        ))}
    </div>
  );
}
