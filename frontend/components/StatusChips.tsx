"use client";
import { useId, useState } from "react";
import { Flame, Heart, Snowflake, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { fmtWait, useProjectedLives, useSecondsUntil, type LivesInfo } from "./Lives";

type Key = "streak" | "lives" | "freeze";

/**
 * The learner's three live numbers as icon chips: streak, lives, freezes. The icon says what it is, the number says how many,
 * and a tap explains it in a sentence (no hover needed). State never rests on colour alone: an empty heart is an outline,
 * and a missing life shows its timer.
 */
export function StatusChips({ streak, todayDone, freezes, lives: snapshot }: { streak: number; todayDone: boolean; freezes: number; lives: LivesInfo }) {
  const id = useId();
  const [open, setOpen] = useState<Key | null>(null);
  const lives = useProjectedLives(snapshot) ?? snapshot;
  const wait = useSecondsUntil(lives.nextAt);
  const empty = lives.lives === 0;

  const days = `${streak} ${streak === 1 ? "day" : "days"}`;
  const chips: { key: Key; Icon: LucideIcon; value: string; sub?: string; label: string; detail: string; tone: "sage" | "coral" | "plain"; filled: boolean }[] = [
    {
      key: "streak", Icon: Flame, value: String(streak), tone: "sage", filled: streak > 0,
      label: `Streak: ${days}`,
      detail: todayDone ? `${days} streak. You have learned today, so it is safe.` : streak > 0 ? `${days} streak. Finish a lesson today to keep it going.` : "No streak yet. Finish a lesson today to start one.",
    },
    {
      key: "lives", Icon: Heart, value: String(lives.lives), sub: lives.lives < lives.max ? (lives.nextAt ? fmtWait(wait) : `/${lives.max}`) : `/${lives.max}`, tone: empty ? "coral" : "plain", filled: lives.lives > 0,
      label: `Lives: ${lives.lives} of ${lives.max}`,
      detail: lives.lives >= lives.max ? `${lives.max} of ${lives.max} lives. A wrong answer in a lesson costs one, and one comes back every 30 minutes.`
        : `${lives.lives} of ${lives.max} lives. A wrong answer costs one. The next one is back in ${fmtWait(wait)}.${empty ? " Lessons are paused until then." : ""}`,
    },
    {
      key: "freeze", Icon: Snowflake, value: String(freezes), tone: "plain", filled: false,
      label: `Streak freezes: ${freezes}`,
      detail: freezes > 0 ? `${freezes} streak ${freezes === 1 ? "freeze" : "freezes"}. One covers a missed day so your streak holds.` : "No streak freezes. You earn one at each streak milestone, and it covers a missed day.",
    },
  ];
  const current = chips.find((c) => c.key === open);

  return (
    <div>
      <ul className="flex flex-wrap items-center gap-2" aria-label="Your status">
        {chips.map(({ key, Icon, value, sub, label, tone, filled }) => (
          <li key={key}>
            <button type="button" aria-label={label} aria-expanded={open === key} aria-controls={`${id}-detail`} onClick={() => setOpen(open === key ? null : key)}
              className={cn("inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[15px] font-semibold ring-1 ring-inset transition duration-150 ease-soft active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500",
                tone === "coral" ? "bg-coral-50 text-coral-700 ring-coral-100" : "bg-surface text-ink ring-line hover:ring-line-strong",
                open === key && "ring-ink/40")}>
              <Icon size={18} strokeWidth={2} aria-hidden
                className={cn(key === "streak" && (filled ? "fill-sage-200 text-sage-700" : "text-muted"), key === "lives" && (filled ? "fill-coral-500 text-coral-500" : "text-coral-600"), key === "freeze" && "text-ink-2")} />
              <span className="tabular">{value}</span>
              {sub && <span className="tabular text-xs font-medium text-muted" aria-hidden>{sub}</span>}
            </button>
          </li>
        ))}
      </ul>
      <p id={`${id}-detail`} role="status" className={cn("mt-2 max-w-[56ch] text-pretty text-sm leading-relaxed text-muted", !current && "sr-only")}>{current?.detail}</p>
    </div>
  );
}
