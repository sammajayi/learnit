import type { User } from "@prisma/client";
import { db } from "./db";
import { weekKey } from "./streak";
import { nameFor, avatarUrlFor } from "./profile";

export const GROUP_SIZE = 30;
export const POINTS_PER_LESSON = 10;
export const POINTS_PER_CHECKPOINT = 30;
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

/** Points earned this week by each of the given users: 10 per distinct lesson passed, 30 per distinct checkpoint passed. */
export async function pointsForWeek(userIds: string[], key: string): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const { start, end } = weekRange(key);
  const rows = await db.lessonAttempt.findMany({
    where: { userId: { in: userIds }, passed: true, createdAt: { gte: start, lt: end } },
    select: { userId: true, lessonId: true, kind: true },
  });
  const seen = new Map<string, Set<string>>();
  const points = new Map<string, number>();
  for (const r of rows) {
    const k = `${r.userId}:${r.kind}:${r.lessonId}`;
    const set = seen.get(r.userId) ?? new Set<string>();
    seen.set(r.userId, set);
    if (set.has(k)) continue;
    set.add(k);
    points.set(r.userId, (points.get(r.userId) ?? 0) + (r.kind === "checkpoint" ? POINTS_PER_CHECKPOINT : POINTS_PER_LESSON));
  }
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

const ALL_TIME_LIMIT = 50;
const ALL_TIME_TTL_MS = 60_000;
let allTimeCache: { at: number; rows: { userId: string; wallet: string; name: string; avatarUrl: string | null; points: number }[] } | null = null;

/** Same points as a league week, summed over every lesson and checkpoint ever passed (each counted once). */
const POINTS_SQL = `SELECT "userId", SUM(CASE WHEN kind = 'checkpoint' THEN ${POINTS_PER_CHECKPOINT} ELSE ${POINTS_PER_LESSON} END)::bigint AS points
  FROM (SELECT DISTINCT "userId", "lessonId", kind FROM lesson_attempts WHERE passed) t GROUP BY "userId"`;

/** The all-time top 50, plus the learner's own rank when they are outside it. No prizes: only the weekly top 3 earn a bonus. */
export async function allTimeLeaderboard(user: User) {
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
  const rows = allTimeCache.rows.map((r, i) => ({ ...r, rank: i + 1 }));
  if (rows.some((r) => r.userId === user.id)) return { rows, you: null as { rank: number; points: number } | null };
  const mine = await db.$queryRawUnsafe<{ points: bigint; rank: bigint }[]>(
    `WITH p AS (${POINTS_SQL}) SELECT points, (SELECT COUNT(*) FROM p p2 WHERE p2.points > p.points) + 1 AS rank FROM p WHERE "userId" = $1`, user.id);
  return { rows, you: mine[0] ? { rank: Number(mine[0].rank), points: Number(mine[0].points) } : null };
}

export { weekRange };
