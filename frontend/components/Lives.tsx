"use client";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { REGEN_MS } from "@learnit/backend/livesLogic";

/** Lives are shared by every lesson: a wrong answer costs one, and one comes back every 30 minutes. */
export type LivesInfo = { lives: number; max: number; /** When the next life arrives (ms since epoch), or null when the bar is full. */ nextAt: number | null };

/** The server's snapshot, moved forward to `now`, so a life that has come back shows up without a reload. */
export function projectLives(info: LivesInfo, now: number): LivesInfo {
  if (info.nextAt === null || info.lives >= info.max || now < info.nextAt) return info;
  const gained = 1 + Math.floor((now - info.nextAt) / REGEN_MS);
  const lives = Math.min(info.max, info.lives + gained);
  return { ...info, lives, nextAt: lives >= info.max ? null : info.nextAt + gained * REGEN_MS };
}

/** Ticks once a second while a life is on its way; otherwise stays still. */
export function useProjectedLives(info: LivesInfo | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!info || info.nextAt === null) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [info]);
  return info ? projectLives(info, now) : undefined;
}

/** Whole seconds until a moment, counting down. 0 once it has passed, or when there is no moment. */
export function useSecondsUntil(at: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (at === null) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [at]);
  return at === null ? 0 : Math.max(0, Math.ceil((at - now) / 1000));
}

export const fmtWait = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** The lives bar. Full hearts on a wide screen, one heart and a number on a narrow one. */
export function Hearts({ lives, max }: { lives: number; max: number }) {
  const reduce = useReducedMotion();
  return (
    <div role="img" aria-label={`${lives} of ${max} lives left`} className="flex shrink-0 items-center">
      <span aria-hidden className="flex items-center gap-1 max-sm:hidden">
        {Array.from({ length: max }, (_, i) => (
          <motion.span key={i} animate={reduce ? undefined : { scale: i === lives ? [1, 1.35, 1] : 1 }} transition={{ duration: 0.3 }} className="grid">
            <Heart size={18} strokeWidth={2} className={i < lives ? "fill-coral-500 text-coral-500" : "text-line-strong"} />
          </motion.span>
        ))}
      </span>
      <span aria-hidden className="tabular flex items-center gap-1 text-sm font-semibold text-ink-2 sm:hidden">
        <Heart size={18} strokeWidth={2} className={lives > 0 ? "fill-coral-500 text-coral-500" : "text-line-strong"} />{lives}
      </span>
    </div>
  );
}
