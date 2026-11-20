import type { User } from "@prisma/client";
import type { Exercise } from "./content/schema";
import { db } from "./db";
import { readStart, type Start } from "./token";
import { gradeAll, outcomeFor, type Answer } from "./grading";
import { localDate, streakCount, freezeGapDate, FREEZE_MILESTONE_DAYS, FREEZE_CAP } from "./streak";
import { detectAnomaly } from "./abuse";
import { ensureMembership } from "./leagues";

export async function streakFor(user: User) {
  const today = localDate(new Date(), user.timezone);
  const days = await db.streakDay.findMany({ where: { userId: user.id }, select: { date: true } });
  let dates = days.map((d) => d.date);

  const gap = user.streakFreezes > 0 ? freezeGapDate(dates, today) : null;
  if (gap) {
    await db.$transaction([
      db.streakDay.create({ data: { userId: user.id, date: gap, frozen: true } }),
      db.user.update({ where: { id: user.id }, data: { streakFreezes: { decrement: 1 } } }),
    ]);
    dates = [...dates, gap];
  }
  return { streak: streakCount(dates, today), todayDone: dates.includes(today), today, freezesRemaining: user.streakFreezes - (gap ? 1 : 0) };
}

export class SubmitError extends Error { constructor(m: string, public status = 400) { super(m); } }

/** Grades on the server, records the attempt, ticks the streak when a lesson is completed (or a checkpoint passed). */
export async function submitAttempt(opts: {
  user: User; kind: "lesson" | "checkpoint"; targetId: string; token: string;
  answers: Record<string, Answer>; exercises: (start: Start) => Exercise[];
}) {
  const start = readStart(opts.token);
  if (!start || start.userId !== opts.user.id || start.kind !== opts.kind || start.targetId !== opts.targetId) throw new SubmitError("This lesson session has expired. Start the lesson again.");
  const now = Date.now();
  if (now - start.startedAt > 6 * 3600_000) throw new SubmitError("This attempt expired. Start again.");
  const durationS = Math.floor((now - start.startedAt) / 1000);
  const exercises = opts.exercises(start);
  // Finishing means every question was answered. Without this an empty request would count as a finished lesson.
  if (!exercises.every((e) => e.id in opts.answers)) throw new SubmitError("Answer every question to finish.");
  const { results, accuracy, missedWordIds } = gradeAll(exercises, opts.answers);
  const { passed, rewardEligible } = outcomeFor(opts.kind, accuracy);
  const key = `${opts.user.id}:${opts.targetId}:${start.startedAt}`;
  const date = localDate(new Date(), opts.user.timezone);

  // The unique startKey rejects a replayed token, so no separate lookup is needed.
  let attempt;
  try {
    attempt = await db.lessonAttempt.create({
      data: { userId: opts.user.id, lessonId: opts.targetId, kind: opts.kind, score: accuracy, durationS, passed, localDate: date, startKey: key },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") throw new SubmitError("Already submitted", 409);
    throw e;
  }

  let reviewPending = false;
  let newDay = false;
  if (passed) {
    // Independent writes and reads go out together: one round trip instead of four.
    const [created, recent] = await Promise.all([
      db.streakDay.createMany({ data: [{ userId: opts.user.id, date }], skipDuplicates: true }),
      db.lessonAttempt.findMany({ where: { userId: opts.user.id, passed: true }, orderBy: { createdAt: "desc" }, take: 3, select: { durationS: true, score: true, createdAt: true } }),
      ensureMembership(opts.user.id).catch((e) => console.error("league membership", e)),
    ]);
    newDay = created.count > 0;
    const flag = detectAnomaly(recent);
    if (flag) {
      await Promise.all([
        db.abuseFlag.create({ data: { userId: opts.user.id, attemptId: attempt.id, reason: flag } }),
        db.user.update({ where: { id: opts.user.id }, data: { flagged: true } }),
      ]);
      reviewPending = true;
    }
  }

  const st = await streakFor(opts.user);
  if (passed && newDay && st.streak > 0 && st.streak % FREEZE_MILESTONE_DAYS === 0) {
    await db.user.updateMany({ where: { id: opts.user.id, streakFreezes: { lt: FREEZE_CAP } }, data: { streakFreezes: { increment: 1 } } });
  }

  // Rewards are issued by POST /api/vouchers/issue so the result screen does not wait on chain reads and signing.
  return {
    attemptId: attempt.id, passed, accuracy, durationS, missedWordIds, rewardEligible,
    results: results.map((r) => ({ id: r.id, correct: r.correct })),
    streak: st.streak, reviewPending,
    voucherPending: rewardEligible && !reviewPending,
  };
}
