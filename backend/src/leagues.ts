import type { User } from "@prisma/client";
import { db } from "./db";
import { weekKey } from "./streak";
import { nameFor, avatarUrlFor } from "./profile";
import { POINTS_PER_CHECKPOINT, POINTS_PER_LESSON, pointsFor } from "./points";

export { POINTS_PER_CHECKPOINT, POINTS_PER_LESSON };

export const GROUP_SIZE = 30;
export const BONUS_RANKS = 3; // top 3 in a group split a bonus

export const currentWeekKey = () => weekKey(new Date());

function weekRange(key: string): { start: Date; end: Date } {
  const start = new Date(`${key}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 7 * 86400000);
  return { start, end };
}

/** Puts a user into this week's league group, first-fit into the lowest group under GROUP_SIZE.
 *  Called only when a learner actually does something this week, so groups reflect active learners. */
export async function ensureMembership(userId: string, key = currentWeekKey()) {
  const existing = await db.leagueMembership.findUnique({ where: { userId_weekKey: { userId, weekKey: key } } });
  if (existing) return existing;
  const counts = await db.leagueMembership.groupBy({ by: ["groupIndex"], where: { weekKey: key }, _count: { _all: true } });
  const open = counts.filter((c) => c._count._all < GROUP_SIZE).sort((a, b) => a.groupIndex - b.groupIndex)[0];
  const groupIndex = open ? open.groupIndex : counts.length ? Math.max(...counts.map((c) => c.groupIndex)) + 1 : 0;
  try {
    return await db.leagueMembership.create({ data: { userId, weekKey: key, groupIndex } });
  } catch {
    // Someone else filled the slot first (or already has a membership) — read back whatever is there now.
    const row = await db.leagueMembership.findUnique({ where: { userId_weekKey: { userId, weekKey: key } } });
    if (row) return row;
    throw new Error("Could not join a league group");
  }
}

/**
 * Points earned this week by each of the given users. Every finished lesson counts once, at its best score this week:
 * up to 10 points for a lesson and 30 for a checkpoint, scaled by accuracy (see points.ts).
 */
export async function pointsForWeek(userIds: string[], key: string): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const { start, end } = weekRange(key);
  const rows = await db.lessonAttempt.findMany({
    where: { userId: { in: userIds }, passed: true, createdAt: { gte: start, lt: end } },
    select: { userId: true, lessonId: true, kind: true, score: true },
  });
  const best = new Map<string, { userId: string; kind: string; score: number }>();
  for (const r of rows) {
    const k = `${r.userId}:${r.kind}:${r.lessonId}`;
    const cur = best.get(k);
    if (!cur || r.score > cur.score) best.set(k, { userId: r.userId, kind: r.kind, score: r.score });
  }
  const points = new Map<string, number>();
  for (const b of best.values()) points.set(b.userId, (points.get(b.userId) ?? 0) + pointsFor(b.kind, b.score));
  for (const id of userIds) if (!points.has(id)) points.set(id, 0);
  return points;
}

export type LeagueRow = { userId: string; wallet: string; name: string; avatarUrl: string | null; points: number; rank: number };

/** The learner's current-week group leaderboard, or null if they haven't joined one yet (no activity this week). */
export async function leaderboardFor(user: User): Promise<{ weekKey: string; groupIndex: number; rows: LeagueRow[]; endsAt: string } | null> {
  const key = currentWeekKey();
  const mine = await db.leagueMembership.findUnique({ where: { userId_weekKey: { userId: user.id, weekKey: key } } });
  if (!mine) return null;
  const members = await db.leagueMembership.findMany({ where: { weekKey: key, groupIndex: mine.groupIndex }, include: { user: { select: { id: true, wallet: true, username: true, displayName: true, hasAvatar: true, avatarVersion: true } } } });
  const points = await pointsForWeek(members.map((m) => m.userId), key);
  const rows = members
    .map((m) => ({ userId: m.userId, wallet: m.user.wallet, name: nameFor(m.user), avatarUrl: avatarUrlFor(m.user), points: points.get(m.userId) ?? 0 }))
    .sort((a, b) => b.points - a.points)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  return { weekKey: key, groupIndex: mine.groupIndex, rows, endsAt: weekRange(key).end.toISOString() };
}

export const ALL_TIME_LIMIT = 200;
export const ALL_TIME_PAGE = 20;
/** The weekly board shows the top of the group only; the learner's own row is added when they are lower. */
export const WEEK_SHOWN = 15;
const ALL_TIME_TTL_MS = 60_000;
let allTimeCache: { at: number; rows: { userId: string; wallet: string; name: string; avatarUrl: string | null; points: number }[] } | null = null;

/** Same points as a league week, summed over every lesson and checkpoint ever finished, each counted once at its best score. Mirrors pointsFor. */
const POINTS_SQL = `SELECT "userId", SUM(pts)::bigint AS points
  FROM (SELECT "userId", GREATEST(1, ROUND((CASE WHEN kind = 'checkpoint' THEN ${POINTS_PER_CHECKPOINT} ELSE ${POINTS_PER_LESSON} END) * LEAST(1, GREATEST(0, MAX(score)))::numeric)) AS pts
        FROM lesson_attempts WHERE passed GROUP BY "userId", "lessonId", kind) t GROUP BY "userId"`;

/** The all-time board, 20 to a page over the top 200, plus the learner's own rank and who is just ahead of them. No prizes: only the weekly top 3 earn a bonus. */
export async function allTimeLeaderboard(user: User, page = 1) {
  if (!allTimeCache || Date.now() - allTimeCache.at > ALL_TIME_TTL_MS) {
    const top = await db.$queryRawUnsafe<{ userId: string; points: bigint }[]>(`${POINTS_SQL} ORDER BY points DESC, "userId" LIMIT ${ALL_TIME_LIMIT}`);
    const users = await db.user.findMany({ where: { id: { in: top.map((t) => t.userId) } }, select: { id: true, wallet: true, username: true, displayName: true, hasAvatar: true, avatarVersion: true } });
    const byId = new Map(users.map((u) => [u.id, u]));
    allTimeCache = {
      at: Date.now(),
      rows: top.flatMap((t) => {
        const u = byId.get(t.userId);
        return u ? [{ userId: t.userId, wallet: u.wallet, name: nameFor(u), avatarUrl: avatarUrlFor(u), points: Number(t.points) }] : [];
      }),
    };
  }
  const all = allTimeCache.rows.map((r, i) => ({ ...r, rank: i + 1 }));
  const pages = Math.max(1, Math.ceil(all.length / ALL_TIME_PAGE));
  const at = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const rows = all.slice((at - 1) * ALL_TIME_PAGE, at * ALL_TIME_PAGE);
  const inList = all.find((r) => r.userId === user.id);
  let you: { rank: number; points: number } | null = inList ? { rank: inList.rank, points: inList.points } : null;
  if (!you) {
    const mine = await db.$queryRawUnsafe<{ points: bigint; rank: bigint }[]>(
      `WITH p AS (${POINTS_SQL}) SELECT points, (SELECT COUNT(*) FROM p p2 WHERE p2.points > p.points) + 1 AS rank FROM p WHERE "userId" = $1`, user.id);
    if (mine[0]) you = { rank: Number(mine[0].rank), points: Number(mine[0].points) };
  }
  const ahead = inList && inList.rank > 1 ? all[inList.rank - 2] : null;
  return { rows, you, inList: Boolean(inList), page: at, pages, total: all.length, ahead: ahead ? { name: ahead.name, points: ahead.points } : null };
}

export { weekRange };
