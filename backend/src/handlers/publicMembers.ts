import { db } from "../db";
import { toPublicMember, type PublicMember } from "../publicMembers";

export type PublicMembers = { total: number; truncated: boolean; generatedAt: string; rows: PublicMember[] };

const LIMIT = 1000;
const TTL_MS = 5 * 60_000;
let cache: { at: number; body: PublicMembers } | null = null;

/** Public, no sign-in: people who have a username, with only the fields in PublicMember. Cached for a few minutes. */
export async function GET() {
  try {
    if (cache && Date.now() - cache.at < TTL_MS) return Response.json(cache.body, { headers: { "cache-control": "public, max-age=60" } });
    const where = { username: { not: null } };
    const [total, users, passed] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where, orderBy: { createdAt: "desc" }, take: LIMIT,
        select: { id: true, username: true, displayName: true, hasAvatar: true, avatarVersion: true, course: true, verifiedUntil: true, createdAt: true },
      }),
      db.lessonAttempt.groupBy({ by: ["userId"], where: { passed: true }, _count: { _all: true } }),
    ]);
    const passedBy = new Map(passed.map((r) => [r.userId, r._count._all]));
    const rows = users.map((u) => toPublicMember(u, passedBy.get(u.id) ?? 0)).filter((m): m is PublicMember => !!m);
    const body: PublicMembers = { total, truncated: total > rows.length, generatedAt: new Date().toISOString(), rows };
    cache = { at: Date.now(), body };
    return Response.json(body, { headers: { "cache-control": "public, max-age=60" } });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Something went wrong on our side. Try again in a moment." }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
