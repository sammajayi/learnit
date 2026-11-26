import { db } from "./db";
import { MAX_LIVES, afterLoss, livesNow, type LivesInfo } from "./livesLogic";

export { MAX_LIVES, REGEN_MS, afterLoss, livesNow, type LivesInfo } from "./livesLogic";

export async function getLives(userId: string, now = Date.now()): Promise<LivesInfo> {
  const u = await db.user.findUnique({ where: { id: userId }, select: { lives: true, livesAt: true } });
  return livesNow(u?.lives ?? MAX_LIVES, u?.livesAt ?? null, now);
}

/** Takes one life, safely when two wrong answers arrive together (the row is locked while it is read and written). */
export async function loseLife(userId: string, now = Date.now()): Promise<LivesInfo & { spent: boolean }> {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ lives: number; livesAt: Date | null }[]>`SELECT lives, "livesAt" FROM users WHERE id = ${userId} FOR UPDATE`;
    const row = rows[0];
    if (!row) return { ...livesNow(MAX_LIVES, null, now), spent: false };
    const next = afterLoss(row.lives, row.livesAt, now);
    if (next.spent) await tx.user.update({ where: { id: userId }, data: { lives: next.lives, livesAt: next.anchor } });
    return { ...livesNow(next.lives, next.anchor, now), spent: next.spent };
  });
}
