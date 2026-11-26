"use client";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * The LearnIt "i" symbol, same artwork as /brand/learnit-symbol-light.svg, in three modes:
 *  - "draw": the tile settles, the stem grows up, the accent drops in with a small bounce (the splash).
 *  - "loop": rests as the finished symbol and the accent gently lifts and settles again and again (a loading state).
 *  - "still": just the symbol.
 * With reduced motion every mode is the still symbol. Decorative: callers announce loading themselves.
 */
export function LogoMark({ mode = "still", size = 112, className }: { mode?: "draw" | "loop" | "still"; size?: number; className?: string }) {
  const reduce = useReducedMotion();
  const draw = mode === "draw" && !reduce;
  const loop = mode === "loop" && !reduce;
  return (
    <motion.svg
      viewBox="0 0 512 512" width={size} height={size} aria-hidden className={cn("overflow-visible", className)}
      initial={draw ? { scale: 0.7, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <rect width="512" height="512" rx="116" fill="#46624f" />
      <g transform="translate(0 9)" strokeLinecap="round" fill="none">
        <motion.line
          x1="256" y1="384" x2="256" y2="280" stroke="#f8f6f1" strokeWidth="92"
          initial={draw ? { pathLength: 0 } : false} animate={{ pathLength: 1 }}
          transition={{ delay: 0.25, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.line
          x1="230" y1="170" x2="296" y2="96" stroke="#eaa48f" strokeWidth="64"
          initial={draw ? { y: -70, opacity: 0 } : false}
          animate={loop ? { y: [0, -16, 0], opacity: 1 } : { y: 0, opacity: 1 }}
          transition={loop
            ? { duration: 1.1, times: [0, 0.4, 1], ease: ["easeOut", "easeIn"], repeat: Infinity, repeatDelay: 0.5 }
            : { delay: 0.5, type: "spring", stiffness: 420, damping: 14 }}
        />
      </g>
    </motion.svg>
  );
}
