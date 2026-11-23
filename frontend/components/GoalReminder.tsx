"use client";
import { useGoal } from "@/lib/useGoal";
import { cn } from "@/lib/cn";

/** The reason the learner wrote, shown back to them when a lesson has not been done yet or just went badly. Nothing without a goal. */
export function GoalReminder({ className }: { className?: string }) {
  const { data: goal } = useGoal();
  if (!goal) return null;
  return (
    <section aria-label="Why you are learning" className={cn("rounded-card bg-sage-50 p-4 text-left ring-1 ring-inset ring-sage-100", className)}>
      <p className="text-xs font-medium text-sage-700">You wrote this when you set your {goal.goalDays} day goal</p>
      <p className="mt-1 text-pretty font-display text-lg leading-snug text-ink">{goal.reason}</p>
    </section>
  );
}
