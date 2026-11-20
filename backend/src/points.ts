/** Leaderboard points. Every finished lesson earns some; the higher the accuracy, the more. No pass mark: nobody is left off the board. */
export const POINTS_PER_LESSON = 10;
export const POINTS_PER_CHECKPOINT = 30;

/** Points for one lesson or checkpoint at its best score (0 to 1). Scaled by accuracy and never below 1, so finishing always counts. */
export function pointsFor(kind: "lesson" | "checkpoint" | string, score: number): number {
  const top = kind === "checkpoint" ? POINTS_PER_CHECKPOINT : POINTS_PER_LESSON;
  const s = Math.min(1, Math.max(0, Number.isFinite(score) ? score : 0));
  return Math.max(1, Math.round(top * s));
}
