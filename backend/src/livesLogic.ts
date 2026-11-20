/** The rules for lives, with no database, so they can be tested on their own. */
/** Lives are shared by every lesson. A wrong answer costs one; one comes back every REGEN_MS until the bar is full. */
export const MAX_LIVES = 5;
export const REGEN_MS = 30 * 60_000;

export type LivesInfo = { lives: number; max: number; /** When the next life arrives (ms since epoch), or null when the bar is full. */ nextAt: number | null };

/**
 * What the person has right now. The database holds the count and the moment the current wait began; lives that have
 * come back since are worked out here, so nothing needs a timer or a background job.
 */
export function livesNow(stored: number, anchor: Date | null, now: number): LivesInfo {
  const s = Math.max(0, Math.min(MAX_LIVES, stored));
  if (s >= MAX_LIVES) return { lives: MAX_LIVES, max: MAX_LIVES, nextAt: null };
  const from = anchor ? anchor.getTime() : now;
  const gained = Math.max(0, Math.floor((now - from) / REGEN_MS));
  const lives = Math.min(MAX_LIVES, s + gained);
  return { lives, max: MAX_LIVES, nextAt: lives >= MAX_LIVES ? null : from + (gained + 1) * REGEN_MS };
}

/**
 * The stored state after one wrong answer. Progress towards the next life is kept: losing a second life while the first is
 * still coming back does not restart the wait. With none left, nothing changes and `spent` is false.
 */
export function afterLoss(stored: number, anchor: Date | null, now: number): { lives: number; anchor: Date | null; spent: boolean } {
  const cur = livesNow(stored, anchor, now);
  if (cur.lives <= 0) return { lives: 0, anchor, spent: false };
  const s = Math.min(MAX_LIVES, Math.max(0, stored));
  const nextAnchor = cur.lives >= MAX_LIVES || !anchor
    ? new Date(now)
    : new Date(anchor.getTime() + (cur.lives - s) * REGEN_MS);
  return { lives: cur.lives - 1, anchor: nextAnchor, spent: true };
}
