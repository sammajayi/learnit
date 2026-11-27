import type { User } from "@prisma/client";
import { db } from "./db";
import { nameFor, avatarUrlFor } from "./profile";
import { pointsFor } from "./points";
import { contestWindow, contestPoolG, missedADay, prizeAmounts, rankContest, utcDay, PRIZE_RANKS, type ContestWindow } from "./contestRules";

export const CONTEST_SHOWN = 25; // rows sent to the app: the top of the board, plus the person asking

export type ContestRow = { userId: string; name: string; avatarUrl: string | null; points: number; days: number; missed: boolean; rank: number | null; prize: number | null };

/**
 * Who has passed what in a contest, per person: points (the best score of each lesson or checkpoint, as on the other boards) and the days they showed up.
 * Everything uses the day on the learner's own clock, the same day their streak uses.
 */
async function standings(w: ContestWindow) {
  const attempts = await db.lessonAttempt.findMany({
    where: { passed: true, localDate: { gte: w.start, lte: w.end } },
    select: { userId: true, lessonId: true, kind: true, score: true, localDate: true },
  });
  const best = new Map<string, { userId: string; kind: string; score: number }>();
  const days = new Map<string, Set<string>>();
  for (const a of attempts) {
    const k = `${a.userId}:${a.kind}:${a.lessonId}`;
    const cur = best.get(k);
    if (!cur || a.score > cur.score) best.set(k, { userId: a.userId, kind: a.kind, score: a.score });
    (days.get(a.userId) ?? days.set(a.userId, new Set()).get(a.userId)!).add(a.localDate);
  }
  const points = new Map<string, number>();
  for (const b of best.values()) points.set(b.userId, (points.get(b.userId) ?? 0) + pointsFor(b.kind, b.score));
  return { points, days };
}

/** Verified for display: verification not run out, or a daily G$ claim already made (a claim needs verification). The prize is paid only after an on-chain check. */
async function verifiedSet(userIds: string[], now: Date) {
  const [users, claims] = await Promise.all([
    db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, verifiedUntil: true } }),
    db.ubiClaim.groupBy({ by: ["userId"], where: { userId: { in: userIds } } }),
  ]);
  const ok = new Set(claims.map((c) => c.userId));
  for (const u of users) if (u.verifiedUntil && u.verifiedUntil > now) ok.add(u.id);
  return ok;
}

/** The ranked entrants of one contest, as of `now`: verified people only, with their points, days and prize on course. Rows keep the user id, for paying winners. */
export async function rankedContest(w: ContestWindow, now: Date) {
  const todayUtc = utcDay(now);
  const { points, days } = await standings(w);
  const ids = [...points.keys()];
  const verified = await verifiedSet(ids, now);
  const entered = ids.filter((id) => verified.has(id));
  const users = await db.user.findMany({ where: { id: { in: entered } }, select: { id: true, wallet: true, username: true, displayName: true, hasAvatar: true, avatarVersion: true } });
  const byId = new Map(users.map((u) => [u.id, u]));
  const prizes = prizeAmounts(contestPoolG());
  const ranked = rankContest(entered.map((id) => {
    const attended = days.get(id) ?? new Set<string>();
    return { userId: id, points: points.get(id) ?? 0, days: attended.size, missed: missedADay(w.dates, attended, todayUtc) };
  }));
  const rows: ContestRow[] = ranked.map((r) => {
    const u = byId.get(r.userId)!;
    return { ...r, name: nameFor(u), avatarUrl: avatarUrlFor(u), prize: r.rank !== null && r.rank <= PRIZE_RANKS && prizes[r.rank - 1] > 0 ? prizes[r.rank - 1] : null };
  });
  return { rows, points, days, verified };
}

/** The board for the contest that is on now: verified people only, ranked, with the prize each of the top 10 is on course for. */
export async function contestBoard(user: User, now = new Date()) {
  const todayUtc = utcDay(now);
  const w = contestWindow(todayUtc);
  const { rows, points, days, verified } = await rankedContest(w, now);

  // The person asking: where they stand, and which of the days so far they showed up on. They may not be in the board (not verified, or no lesson yet).
  const myDays = days.get(user.id) ?? new Set<string>();
  const mine = rows.find((r) => r.userId === user.id) ?? null;
  const meVerified = verified.has(user.id) || (await verifiedSet([user.id], now)).has(user.id);
  const shown = rows.filter((r, i) => i < CONTEST_SHOWN || r.userId === user.id);
  return {
    contest: { index: w.index, start: w.start, end: w.end, endsAt: w.endsAt, status: w.status, today: todayUtc, dates: w.dates },
    poolG: contestPoolG(),
    prizeRanks: PRIZE_RANKS,
    entered: rows.length,
    inRace: rows.filter((r) => !r.missed).length,
    rows: shown.map((r) => ({ you: r.userId === user.id, name: r.name, avatarUrl: r.avatarUrl, points: r.points, days: r.days, missed: r.missed, rank: r.rank, prize: r.prize })),
    me: {
      verified: meVerified, points: points.get(user.id) ?? 0, days: myDays.size, missed: mine?.missed ?? false, rank: mine?.rank ?? null, prize: mine?.prize ?? null,
      attended: w.dates.map((d) => (d > todayUtc ? null : myDays.has(d))), // per day: true showed up, false did not, null not yet
    },
  };
}
