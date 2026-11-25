import { MIN_SECONDS } from "./grading";

export type RecentAttempt = { durationS: number; score: number; createdAt: Date };

const BOUNDARY_WINDOW = 2; // seconds past MIN_SECONDS that still counts as "landed exactly on the floor"
// 3 passed lessons this close together is not a human pace. Real lessons take a median of about 96 seconds and a quarter take 65 or
// less, so a fast learner can pass 3 in under 4 minutes. 2.5 minutes is under 50 seconds a lesson, which only the quickest ~10% reach.
const VELOCITY_WINDOW_MS = 150_000;

/** Looks at a learner's most recent passed attempts for a pattern that smells automated.
 *  Returns a reason string to flag, or null if nothing stands out. Pure and testable: callers
 *  supply the attempts (most recent first), already filtered to passed: true. */
export function detectAnomaly(recent: RecentAttempt[]): string | null {
  if (recent.length < 3) return null;
  const last3 = recent.slice(0, 3);

  const allBoundary = last3.every((a) => a.durationS >= MIN_SECONDS && a.durationS <= MIN_SECONDS + BOUNDARY_WINDOW);
  const allPerfect = last3.every((a) => a.score >= 0.99);
  if (allBoundary && allPerfect) return "boundary-timed-perfect-streak";

  const spanMs = last3[0].createdAt.getTime() - last3[2].createdAt.getTime();
  if (spanMs >= 0 && spanMs < VELOCITY_WINDOW_MS) return "high-velocity";

  return null;
}
