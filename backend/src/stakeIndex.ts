import { db } from "./db";
import { publicClient } from "./identity";
import { ADDR } from "./chain";
import { streakVaultAbi } from "./abis";

const KEY = "vault:staked";
const CHUNK = 5_000n; // public Celo RPCs reject eth_getLogs over wide block ranges
const PARALLEL = 6; // chunks read at the same time

/**
 * Copies new Staked events from the chain into stake_events, for every challenge in one pass, and remembers where it
 * stopped. The first run reads everything since VAULT_DEPLOY_BLOCK; later runs read only the new blocks.
 * Stops at the deadline and returns false if it has not caught up, so a request never waits on it for long.
 */
export async function syncStakeEvents(deadline = Infinity): Promise<boolean> {
  const vault = ADDR.streakVault as `0x${string}` | "";
  if (!vault) return true;
  const cursor = await db.chainCursor.findUnique({ where: { key: KEY } });
  let from = cursor ? cursor.block + 1n : BigInt(process.env.VAULT_DEPLOY_BLOCK || 0);
  // A few blocks behind the head: the public RPC is several servers, and one that is slightly behind rejects a range ending at the newest block ("block is out of range").
  const latest = (await publicClient.getBlockNumber()) - 3n;
  while (from <= latest) {
    if (Date.now() > deadline) return false;
    const ranges: [bigint, bigint][] = [];
    for (let i = 0; i < PARALLEL && from <= latest; i++) {
      const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n;
      ranges.push([from, to]);
      from = to + 1n;
    }
    const logs = (await Promise.all(ranges.map(([fromBlock, toBlock]) => publicClient.getContractEvents({ address: vault, abi: streakVaultAbi, eventName: "Staked", fromBlock, toBlock })))).flat();
    if (logs.length) {
      await db.stakeEvent.createMany({
        data: logs.map((l) => ({ cohortId: Number(l.args.id), wallet: l.args.user as string, amount: String(l.args.received ?? 0n), block: l.blockNumber, txHash: l.transactionHash, logIndex: l.logIndex })),
        skipDuplicates: true, // two runs can overlap, and a re-read must not double count
      });
    }
    const last = ranges[ranges.length - 1][1];
    await db.chainCursor.upsert({ where: { key: KEY }, create: { key: KEY, block: last }, update: {} });
    await db.chainCursor.updateMany({ where: { key: KEY, block: { lt: last } }, data: { block: last } }); // never moves backwards if another run got further
  }
  return true;
}

let inflight: Promise<boolean> | null = null;
/** One top-up at a time. Several challenges asking for their count in the same request share it instead of each reading the same blocks. */
export function topUpStakeEvents(budgetMs: number) {
  inflight ??= syncStakeEvents(Date.now() + budgetMs).finally(() => { inflight = null; });
  return inflight;
}

/** The wallets that have staked in a challenge, from what has been copied so far. */
export async function indexedStakers(cohortId: number) {
  const rows = await db.stakeEvent.findMany({ where: { cohortId }, select: { wallet: true }, distinct: ["wallet"] });
  return new Set(rows.map((r) => r.wallet));
}
