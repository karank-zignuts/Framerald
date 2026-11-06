"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";

/**
 * Each page fades in from a soft blur when you arrive on it, and a different project or section starts the fade again. The blur is
 * removed at the end (`filter: none`), because even `blur(0)` would trap fixed-position children and cost a compositing layer.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={pathname}
      className="flex min-h-0 min-w-0 flex-1 flex-col lg:overflow-hidden"
      initial={reduce ? false : { opacity: 0, filter: "blur(10px)", y: 8 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0, transitionEnd: { filter: "none" } }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
