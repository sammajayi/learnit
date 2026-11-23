"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Target } from "@/components/icons";
import { useGoal } from "@/lib/useGoal";
import { Button, ButtonLink } from "./ui";
import { cn } from "@/lib/cn";

const SNOOZE_KEY = "learnit.goal-prompt-until";
const WEEK_MS = 7 * 86_400_000;

/** An invitation to set a goal, shown on Home once the learner has finished a lesson. "Not now" hides it for a week. */
export function GoalPrompt({ enabled = true, className }: { enabled?: boolean; className?: string }) {
  const { data: goal, isLoading } = useGoal();
  const [snoozed, setSnoozed] = useState(true); // hidden until we have looked, so it never flashes
  useEffect(() => { try { setSnoozed(Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now()); } catch { setSnoozed(false); } }, []);
  if (!enabled || isLoading || goal || snoozed) return null;
  const later = () => { setSnoozed(true); try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + WEEK_MS)); } catch { /* it simply shows again next visit */ } };
  return (
    <section aria-labelledby="goal-prompt" className={cn("rounded-card border border-line bg-sunken p-4 text-left", className)}>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-ink-2"><Target size={18} aria-hidden /></span>
        <div className="min-w-0">
          <h2 id="goal-prompt" className="text-[15px] font-semibold text-ink">Set a learning goal</h2>
          <p className="mt-1 text-pretty text-sm leading-relaxed text-ink-2">Pick 7, 14 or 30 days and write why you are learning. We show it to you again on hard days.</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ButtonLink href="/goal" variant="secondary" size="md" iconRight={ArrowRight}>Set a goal</ButtonLink>
        <Button variant="ghost" size="md" onClick={later}>Not now</Button>
      </div>
    </section>
  );
}
