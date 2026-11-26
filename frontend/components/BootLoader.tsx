"use client";
import { motion, useReducedMotion } from "motion/react";
import { LogoMark } from "./LogoMark";

/**
 * The full-screen wait while sign-in and the account load. The symbol is the same size and place as in the splash, so when the splash
 * fades the two read as one continuous thing. It stays until the app is ready, and it stays invisible for the first 300 ms so a fast
 * load never flashes it. For a page whose content is loading, use a skeleton shaped like the content instead.
 */
export function BootLoader() {
  const reduce = useReducedMotion();
  return (
    <main role="status" aria-busy="true" className="grid min-h-[100dvh] place-items-center bg-canvas">
      <span className="sr-only">Loading LearnIt</span>
      <motion.div aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 0.3, duration: 0.2 }}>
        <LogoMark mode="loop" />
      </motion.div>
    </main>
  );
}
