"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Flame, Target, X } from "@/components/icons";
import { ADDR } from "@learnit/backend/chain";
import { fmtGD } from "@learnit/backend/format";
import { useApi } from "@/lib/useApi";
import { useGoal } from "@/lib/useGoal";
import type { Today } from "@/lib/useToday";
import { ButtonLink, Progress } from "./ui";

type Cohort = { id: number; start: number; end: number; min: string; bonusBps: number; joinable: boolean; settled: boolean; voided: boolean; mine: { stake: string } | null; progress: { completed: number; required: string[] } | null };

const SNOOZE_KEY = "learnit.goal-card-until";
const SNOOZE_MS = 2 * 86_400_000;

/**
 * One small card on Home that follows the learner's goal: set one after a first lesson, stake on it, then watch it run and see
 * their own reason on a day the lesson is still waiting. Only one thing is ever shown, and never when there is nothing to do.
 */
export function GoalCard({ t, verified }: { t: Today; verified: boolean }) {
  const api = useApi();
  const { data: goal, isLoading } = useGoal();
  const live = Boolean(ADDR.streakVault);
  const { data } = useQuery({ queryKey: ["cohorts"], queryFn: () => api<{ cohorts: Cohort[] }>("/api/cohorts/open"), enabled: live && verified, retry: 1 });
  const [snoozed, setSnoozed] = useState(true); // hidden until we have looked, so it never flashes
  useEffect(() => { try { setSnoozed(Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now()); } catch { setSnoozed(false); } }, []);
  if (isLoading) return null;

  const completedALesson = t.units.some((u) => u.done > 0);
  const cohorts = data?.cohorts ?? [];
  const lenOf = (c: Cohort) => Math.round((c.end - c.start) / 86400);
  const running = cohorts.find((c) => !!c.mine && BigInt(c.mine.stake) > 0n && !c.settled && !c.voided);
  const toJoin = cohorts.filter((c) => c.joinable && !(c.mine && BigInt(c.mine.stake) > 0n));
  const next = toJoin.find((c) => lenOf(c) === goal?.goalDays) ?? toJoin[0];
  const later = () => { setSnoozed(true); try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)); } catch { /* it shows again next visit */ } };

  let icon = Target, title = "", line: string | null = null, action: { href: string; label: string } | null = null, bar: number | null = null, dismissible = false;

  if (running && running.progress) {
    // In a challenge: progress, and the learner's own reason on a day the lesson is still to do.
    const days = lenOf(running), done = running.progress.completed;
    icon = Flame; bar = done / days;
    title = `${done} of ${days} days done`;
    line = !t.todayDone && goal ? `“${goal.reason}”` : `${fmtGD(running.mine!.stake, 0)} G$ staked. Keep going.`;
  } else if (!goal) {
    if (!completedALesson || snoozed) return null;
    title = "Set a learning goal";
    line = "Pick 7, 14 or 30 days and say why you are learning.";
    action = { href: "/goal", label: "Set goal" }; dismissible = true;
  } else if (verified && next && !snoozed) {
    const days = lenOf(next);
    // The minimum, rounded up to 2 decimals so it is always inside the allowed range.
    const amount = String(Number((BigInt(next.min) + 10n ** 16n - 1n) / 10n ** 16n) / 100);
    title = `Stake ${fmtGD(next.min, 0)} G$ on your ${days} day goal`;
    line = `Finish all ${days} days and it comes back to you${next.bonusBps > 0 ? `, plus ${next.bonusBps / 100}%` : ""}.`;
    action = { href: `/stake?amount=${amount}&days=${days}`, label: "Stake" }; dismissible = true;
  } else if (goal && !t.todayDone) {
    title = "Why you are learning"; line = `“${goal.reason}”`;
  } else return null;

  const Icon = icon;
  return (
    <section aria-label="Your learning goal" className="rounded-card border border-line bg-sunken p-3.5">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface text-ink-2"><Icon size={16} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
          {line && <p className="line-clamp-2 text-[13px] leading-snug text-muted">{line}</p>}
        </div>
        {action && <ButtonLink href={action.href} size="sm" variant="secondary" iconRight={ArrowRight}>{action.label}</ButtonLink>}
        {dismissible && <button type="button" onClick={later} aria-label="Not now" className="-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/15"><X size={14} aria-hidden /></button>}
      </div>
      {bar !== null && <Progress value={bar} className="mt-2.5" label="Goal progress" />}
    </section>
  );
}
