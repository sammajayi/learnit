/**
 * Time spent learning is the length of each finished lesson or checkpoint: from opening it to submitting it.
 * A tab left open would otherwise add hours, so one attempt counts for at most this long.
 * Time in lessons that were never finished is not recorded.
 */
export const LEARNING_CAP_SECONDS = 30 * 60;

/** What one attempt adds to the total. Mirrors the SQL (LEAST(durationS, cap)). */
export const countedSeconds = (durationS: number) => Math.max(0, Math.min(Math.floor(Number.isFinite(durationS) ? durationS : 0), LEARNING_CAP_SECONDS));
