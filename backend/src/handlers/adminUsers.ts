import { db } from "../db";
import { adminFail, requireAdmin } from "../adminAuth";

/** One person, as the admin table shows them. No email, no bio, no internal ids. */
export type AdminUserRow = {
  username: string | null;
  displayName: string | null;
  wallet: string;
  course: string;
  verified: boolean;
  flagged: boolean;
  joined: string;
  lastActive: string | null;
  lessonsPassed: number;
  ubiClaims: number;
};
export type AdminUsers = { total: number; truncated: boolean; generatedAt: string; rows: AdminUserRow[] };

const LIMIT = 5000;

/** Admin only: every person with their username and a few activity counts. Personal data, so it needs a signed-in admin wallet. */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const [total, users, passed, last, claims] = await Promise.all([
      db.user.count(),
      db.user.findMany({
        orderBy: { createdAt: "desc" }, take: LIMIT,
        select: { id: true, username: true, displayName: true, wallet: true, course: true, verifiedUntil: true, flagged: true, createdAt: true },
      }),
      db.lessonAttempt.groupBy({ by: ["userId"], where: { passed: true }, _count: { _all: true } }),
      db.lessonAttempt.groupBy({ by: ["userId"], _max: { createdAt: true } }),
      db.ubiClaim.groupBy({ by: ["userId"], _count: { _all: true } }),
    ]);
    const passedBy = new Map(passed.map((r) => [r.userId, r._count._all]));
    const lastBy = new Map(last.map((r) => [r.userId, r._max.createdAt]));
    const claimsBy = new Map(claims.map((r) => [r.userId, r._count._all]));
    const now = Date.now();
    const rows: AdminUserRow[] = users.map((u) => ({
      username: u.username, displayName: u.displayName, wallet: u.wallet, course: u.course,
      verified: !!u.verifiedUntil && u.verifiedUntil.getTime() > now,
      flagged: u.flagged,
      joined: u.createdAt.toISOString(),
      lastActive: lastBy.get(u.id)?.toISOString() ?? null,
      lessonsPassed: passedBy.get(u.id) ?? 0,
      ubiClaims: claimsBy.get(u.id) ?? 0,
    }));
    const body: AdminUsers = { total, truncated: total > rows.length, generatedAt: new Date().toISOString(), rows };
    return Response.json(body, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return adminFail(e);
  }
}
