import type { User } from "@prisma/client";
import { db } from "./db";
import { publicClient } from "./identity";
import { ADDR } from "./chain";
import { streakVaultAbi } from "./abis";
import { localDate } from "./streak";
import { syncStakeEvents, indexedStakers } from "./stakeIndex";

const vault = () => (ADDR.streakVault || null) as `0x${string}` | null;
/** Seconds after a challenge ends before anyone may cancel it for lack of results. Same as the vault's RESULTS_DEADLINE. */
export const RESULTS_DEADLINE = 7 * 86400;

export async function readCohort(id: number) {
  const v = vault(); if (!v) return null;
  const [start, end, min, max, totalStaked, finishedStake, , settled] = await publicClient.readContract({ address: v, abi: streakVaultAbi, functionName: "cohorts", args: [BigInt(id)] });
  if (start === 0n || !end) return null;
  // voided: results were never confirmed, so the challenge was cancelled and every staker can take their stake back.
  // resultsFinal: the signer has confirmed who finished, so the challenge can be settled.
  // terms: the bonus rate locked for this challenge when it was created.
  // A vault from before that upgrade has none of these: it can never be voided and pays no locked bonus.
  const i = BigInt(id);
  const [voided, resultsFinal, terms] = await Promise.all([
    publicClient.readContract({ address: v, abi: streakVaultAbi, functionName: "voided", args: [i] }).catch(() => false),
    publicClient.readContract({ address: v, abi: streakVaultAbi, functionName: "resultsFinal", args: [i] }).catch(() => null),
    publicClient.readContract({ address: v, abi: streakVaultAbi, functionName: "termsOf", args: [i] }).catch(() => null),
  ]);
  return {
    id, start: Number(start), end: Number(end), min: min.toString(), max: max.toString(), pot: totalStaked.toString(), finishedStake: finishedStake.toString(), settled, voided,
    resultsFinal: resultsFinal === true,
    bonusBps: terms?.[0] ? terms[3] : 0,
    // From this time anyone may cancel the challenge if the results are still not confirmed. null: this vault cannot void.
    voidableAt: resultsFinal === null ? null : Number(end) + RESULTS_DEADLINE,
  };
}

export async function listCohortIds() {
  const v = vault(); if (!v) return [];
  const next = await publicClient.readContract({ address: v, abi: streakVaultAbi, functionName: "nextCohortId" });
  return Array.from({ length: Number(next) - 1 }, (_, i) => i + 1);
}

const CHUNK = 5_000n; // public Celo RPCs reject eth_getLogs over wide block ranges
const seen = new Map<number, { upTo: bigint; users: Set<string> }>(); // per cohort: how far we scanned, so later calls only read the new blocks

/** Distinct stakers in a cohort. Scans Staked logs in chunks from VAULT_DEPLOY_BLOCK. A failed scan returns what was found so far instead of breaking the page.
 *  With a deadline it stops when time is up and says so (`complete: false`); the next call carries on from where it stopped. */
async function scanStakers(id: number, deadline = Infinity) {
  const v = vault(); if (!v) return { users: new Set<string>(), complete: true };
  const entry = seen.get(id) ?? { upTo: BigInt(process.env.VAULT_DEPLOY_BLOCK || 0) - 1n, users: new Set<string>() };
  seen.set(id, entry);
  let complete = false;
  try {
    const latest = await publicClient.getBlockNumber();
    const ranges: [bigint, bigint][] = [];
    for (let from = entry.upTo + 1n; from <= latest; from += CHUNK) ranges.push([from, from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n]);
    complete = true;
    for (let i = 0; i < ranges.length; i += 6) { // a few chunks at a time
      if (Date.now() > deadline) { complete = false; break; }
      const batch = ranges.slice(i, i + 6);
      const res = await Promise.all(batch.map(([fromBlock, toBlock]) => publicClient.getContractEvents({ address: v, abi: streakVaultAbi, eventName: "Staked", args: { id: BigInt(id) }, fromBlock, toBlock })));
      for (const logs of res) for (const l of logs) entry.users.add(l.args.user as string);
      entry.upTo = batch[batch.length - 1][1];
    }
  } catch (e) {
    complete = false;
    console.error("memberCount scan failed", id, e instanceof Error ? e.message.split("\n")[0] : e);
  }
  return { users: entry.users, complete };
}

/** How many people are in a cohort, or null while the count is still being worked out. It reads the stake_events table,
 *  topped up from the chain within a time budget, so a cold server never rescans the whole chain. If that table is not
 *  there yet it falls back to scanning the chain, with the same budget. */
export async function memberCount(id: number, budgetMs = 2500) {
  const deadline = Date.now() + budgetMs;
  try {
    if (!(await syncStakeEvents(deadline))) return null;
    return (await indexedStakers(id)).size;
  } catch (e) {
    console.error("stake index unavailable, scanning the chain instead", e instanceof Error ? e.message.split("\n")[0] : e);
    const { users, complete } = await scanStakers(id, deadline);
    return complete ? users.size : null;
  }
}

/** The wallet addresses that have ever staked in a cohort. Nobody can withdraw before it ends, so while
 *  it is still live this is exactly who currently has a stake riding on it. */
export async function stakersOf(id: number) {
  try {
    await syncStakeEvents();
    return await indexedStakers(id);
  } catch (e) {
    console.error("stake index unavailable, scanning the chain instead", e instanceof Error ? e.message.split("\n")[0] : e);
    return (await scanStakers(id)).users;
  }
}

export async function myState(id: number, user: User) {
  const v = vault(); if (!v) return null;
  const a = user.wallet as `0x${string}`, i = BigInt(id);
  const [stake, fin, wd, payout] = await Promise.all([
    publicClient.readContract({ address: v, abi: streakVaultAbi, functionName: "stakeOf", args: [i, a] }),
    publicClient.readContract({ address: v, abi: streakVaultAbi, functionName: "finished", args: [i, a] }),
    publicClient.readContract({ address: v, abi: streakVaultAbi, functionName: "withdrawn", args: [i, a] }),
    publicClient.readContract({ address: v, abi: streakVaultAbi, functionName: "payoutOf", args: [i, a] }),
  ]);
  return { stake: stake.toString(), finished: fin, withdrawn: wd, payout: payout.toString() };
}

/** The local dates a user must have a passed lesson on, one per day of the cohort's actual length
 *  (7, 14 or 30), starting with the local date of the cohort start. */
export function requiredDates(startSec: number, endSec: number, timeZone: string) {
  const days = Math.round((endSec - startSec) / 86400);
  return Array.from({ length: days }, (_, i) => localDate(new Date((startSec + i * 86400) * 1000), timeZone));
}

export async function progressFor(user: User, startSec: number, endSec: number) {
  const required = requiredDates(startSec, endSec, user.timezone);
  const days = await db.streakDay.findMany({ where: { userId: user.id, date: { in: required } }, select: { date: true } });
  const have = new Set(days.map((d) => d.date));
  const done = required.map((d) => have.has(d));
  return { required, done, completed: done.filter(Boolean).length };
}

export async function mirrorCohort(c: { id: number; start: number; end: number; min: string; max: string; settled: boolean; voided?: boolean }) {
  const status = c.voided ? "voided" : c.settled ? "settled" : Date.now() / 1000 >= c.end ? "ended" : Date.now() / 1000 >= c.start ? "running" : "open";
  await db.cohort.upsert({
    where: { id: c.id },
    create: { id: c.id, startAt: new Date(c.start * 1000), endAt: new Date(c.end * 1000), minStake: c.min, maxStake: c.max, status },
    update: { status },
  });
}
