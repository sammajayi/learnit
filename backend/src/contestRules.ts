/**
 * The biweekly contest rules, kept free of the database so they are easy to test.
 * A contest is 14 days. They repeat back to back from CONTEST_START. Only GoodDollar-verified people take part, and anyone can join on any day. You stay in the
 * prize race only while you have passed a lesson on every day since you joined. The top 10 who are still in share the prize pool.
 */
export const CONTEST_DAYS = 14;
export const PRIZE_RANKS = 10;
/** Each rank's share of the pool, in percent. Rank 1 first. Adds up to 100. CONTEST_SHARES overrides it, as comma-separated numbers. */
export const DEFAULT_SHARES = [25, 18, 14, 11, 9, 7, 6, 5, 3, 2];

/** The day the first contest starts, as YYYY-MM-DD (UTC). Every contest after it starts 14 days later. */
export const contestStart = () => process.env.CONTEST_START || "2026-11-30";
/** The total G$ to share, per contest. 0 until it is set. */
export const contestPoolG = () => { const n = Number(process.env.CONTEST_POOL_G); return Number.isFinite(n) && n > 0 ? n : 0; };
export const contestShares = () => {
  const raw = (process.env.CONTEST_SHARES ?? "").split(",").map((x) => Number(x.trim())).filter((x) => Number.isFinite(x) && x > 0);
  return raw.length === PRIZE_RANKS ? raw : DEFAULT_SHARES;
};

const DAY_MS = 86400_000;
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
export const addDays = (d: string, n: number) => new Date(ms(d) + n * DAY_MS).toISOString().slice(0, 10);
export const utcDay = (now: Date) => now.toISOString().slice(0, 10);

export type ContestWindow = {
  index: number;
  start: string;          // first day
  end: string;            // last day, inclusive
  dates: string[];        // all 14 days
  status: "upcoming" | "live";
  endsAt: string;         // the instant the last day is over, UTC
};

/** The contest that `today` (YYYY-MM-DD, UTC) falls in. Before the first one starts, the first one, as "upcoming". */
export function contestWindow(today: string, anchor = contestStart()): ContestWindow {
  const sinceStart = Math.floor((ms(today) - ms(anchor)) / DAY_MS);
  const index = sinceStart < 0 ? 0 : Math.floor(sinceStart / CONTEST_DAYS);
  const start = addDays(anchor, index * CONTEST_DAYS);
  const dates = Array.from({ length: CONTEST_DAYS }, (_, i) => addDays(start, i));
  return { index, start, end: dates[CONTEST_DAYS - 1], dates, status: sinceStart < 0 ? "upcoming" : "live", endsAt: new Date(ms(addDays(start, CONTEST_DAYS))).toISOString() };
}

/**
 * Days that are over everywhere. People are in different timezones and a "day" is the day where they are, so a date is only closed once it is two UTC
 * days behind: even someone 12 hours behind UTC has finished it by then. A missed day is only counted once its date is closed.
 */
export const closedDates = (dates: string[], todayUtc: string) => dates.filter((d) => d <= addDays(todayUtc, -2));

/**
 * True if the person missed a closed day since they joined. Anyone can join any day: your first passed lesson in the contest is the day you join, and
 * from then on every closed day needs a pass. Days before you joined were never yours, so they are not missed.
 */
export const missedADay = (dates: string[], attended: Set<string>, todayUtc: string) => {
  const joined = dates.find((d) => attended.has(d));
  if (!joined) return false; // not joined yet, so nothing to miss
  return closedDates(dates, todayUtc).some((d) => d >= joined && !attended.has(d));
};

/** The first day a person showed up in the contest (the day they joined), or null. */
export const joinedOn = (dates: string[], attended: Set<string>) => dates.find((d) => attended.has(d)) ?? null;

export type Entry = { userId: string; points: number; days: number; missed: boolean };

/**
 * Ranks everyone. People still in the prize race (no missed day) come first, ranked 1, 2, 3... by points, then by days shown up, then by id so the
 * order never flips between loads. Anyone who has missed a day comes after, in the same order, with no rank.
 */
export function rankContest<T extends Entry>(entries: T[]): (T & { rank: number | null })[] {
  const order = (a: T, b: T) => b.points - a.points || b.days - a.days || (a.userId < b.userId ? -1 : 1);
  const inRace = entries.filter((e) => !e.missed).sort(order).map((e, i) => ({ ...e, rank: i + 1 }));
  const out = entries.filter((e) => e.missed).sort(order).map((e) => ({ ...e, rank: null as number | null }));
  return [...inRace, ...out];
}

/** G$ for each of the top ranks, rank 1 first, from the pool and the shares. Rounded down to 2 decimals, so the total never goes over the pool. */
export function prizeAmounts(poolG: number, shares = contestShares()): number[] {
  const total = shares.reduce((s, x) => s + x, 0) || 1;
  return shares.map((s) => Math.floor((poolG * s * 100) / total) / 100);
}
