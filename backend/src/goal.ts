import { cleanText } from "./profile";

export const GOAL_DAYS = [7, 14, 30] as const;
export const REASON_MIN = 3;
export const REASON_MAX = 200;

export type GoalCheck = { ok: true; reason: string; goalDays: 7 | 14 | 30 } | { ok: false; error: string };

/** A goal is a streak length and a short reason in the learner's own words. */
export function validateGoal(body: { reason?: unknown; goalDays?: unknown }): GoalCheck {
  const goalDays = GOAL_DAYS.find((d) => d === body.goalDays);
  if (!goalDays) return { ok: false, error: "Pick 7, 14 or 30 days." };
  const reason = cleanText(body.reason, REASON_MAX);
  if (!reason || reason.length < REASON_MIN) return { ok: false, error: "Write a few words about why you are learning." };
  return { ok: true, reason, goalDays };
}
