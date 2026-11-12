import { parseUnits, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { randomBytes } from "node:crypto";
import type { User } from "@prisma/client";
import { db } from "./db";
import { publicClient, readVerificationCached as readVerification } from "./identity";
import { ADDR, CHAIN_ID } from "./chain";
import { rewardsPoolAbi } from "./abis";

const g = (name: string, d: string) => parseUnits(process.env[name] || d, 18);
export const rewardConfig = () => {
  const dailyCap = g("DAILY_CAP_G", "2"); // keep equal to RewardsPool.dailyCap
  // A voucher can't be split across days, so none may exceed the daily cap or the pool would reject it every day.
  const fit = (n: bigint) => (n > dailyCap ? dailyCap : n);
  return {
    lesson: g("LESSON_REWARD_G", "0.25"),
    checkpoint: fit(g("CHECKPOINT_REWARD_G", "2")),
    dailyCap,
    maxLessonsPerDay: 6,
    expirySeconds: 7 * 86400,
    leagueBonus: [fit(g("LEAGUE_BONUS_1_G", "2")), fit(g("LEAGUE_BONUS_2_G", "1.5")), fit(g("LEAGUE_BONUS_3_G", "1"))] as const, // rank 1, 2, 3
  };
};

const voucherTypes = {
  Voucher: [
    { name: "root", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "expiry", type: "uint256" },
  ],
} as const;

const dayStartUtc = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; };

/** The database, or a transaction on it. */
type Client = Pick<typeof db, "voucher" | "lessonAttempt">;

export async function earnedTodayUtc(root: string, client: Client = db) {
  const rows = await client.voucher.findMany({ where: { root, createdAt: { gte: dayStartUtc() } }, select: { amount: true } });
  return rows.reduce((s, r) => s + BigInt(r.amount), 0n);
}

/** Issues a signed voucher for a passed attempt, if the user is verified and under today's limits. Returns null otherwise. */
export async function issueVoucher(user: User, attempt: { id: string; lessonId: string; kind: string; localDate: string }, firstCheckpointPass: boolean) {
  const key = process.env.SIGNER_PRIVATE_KEY as Hex | undefined;
  if (!key || !ADDR.rewardsPool) return null;
  const cfg = rewardConfig();

  if (attempt.kind === "checkpoint" && !firstCheckpointPass) return null;
  const amount = attempt.kind === "checkpoint" ? cfg.checkpoint : cfg.lesson;

  const v = await readVerification(user.wallet as `0x${string}`);
  if (!v.verified || !v.root) return null;
  if (v.verifiedUntil && v.verifiedUntil <= new Date()) return null;
  const root = v.root;

  // The limits below are "read what was issued so far, then issue one more". Two requests running at once
  // would each read the same total and both issue, going over the limit. So every issue for one GoodDollar
  // identity takes a lock first and the checks and the insert happen inside it, one request at a time. The
  // lock is released when the transaction ends. Different identities do not wait on each other.
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"voucher:" + root.toLowerCase()}, 0))`;

    if (attempt.kind !== "checkpoint") {
      const todays = await tx.voucher.findMany({ where: { reason: "lesson", createdAt: { gte: dayStartUtc() }, sourceId: { in: (await tx.lessonAttempt.findMany({ where: { userId: user.id, kind: "lesson", localDate: attempt.localDate, passed: true }, select: { id: true } })).map((a) => a.id) } } });
      if (todays.length >= cfg.maxLessonsPerDay) return null;
      const sameLesson = await tx.lessonAttempt.count({ where: { userId: user.id, lessonId: attempt.lessonId, passed: true, localDate: attempt.localDate, id: { in: todays.map((t) => t.sourceId) } } });
      if (sameLesson > 0) return null; // one reward per lesson per day
    }
    const earned = await earnedTodayUtc(root, tx);
    if (earned + amount > cfg.dailyCap) return null; // contract would reject it anyway

    const nonce = BigInt("0x" + randomBytes(16).toString("hex"));
    const expiry = BigInt(Math.floor(Date.now() / 1000) + cfg.expirySeconds);
    const account = privateKeyToAccount(key);
    const signature = await account.signTypedData({
      domain: { name: "LearnItRewards", version: "1", chainId: CHAIN_ID, verifyingContract: ADDR.rewardsPool },
      types: voucherTypes, primaryType: "Voucher",
      message: { root, amount, nonce, expiry },
    });
    return tx.voucher.create({
      data: { root, amount: amount.toString(), nonce: nonce.toString(), expiry: Number(expiry), reason: attempt.kind, sourceId: attempt.id, signature },
    });
  }, { maxWait: 15_000, timeout: 20_000 }); // the database can take seconds to wake up, and a burst of requests queues on the lock
}

/** Signs and records a weekly league bonus voucher for a verified root. `sourceId` is the LeagueBonus row id. */
export async function issueLeagueVoucher(root: `0x${string}`, amount: bigint, sourceId: string) {
  const key = process.env.SIGNER_PRIVATE_KEY as Hex | undefined;
  if (!key || !ADDR.rewardsPool) return null;
  const cfg = rewardConfig();
  const nonce = BigInt("0x" + randomBytes(16).toString("hex"));
  const expiry = BigInt(Math.floor(Date.now() / 1000) + cfg.expirySeconds);
  const account = privateKeyToAccount(key);
  const signature = await account.signTypedData({
    domain: { name: "LearnItRewards", version: "1", chainId: CHAIN_ID, verifyingContract: ADDR.rewardsPool },
    types: voucherTypes, primaryType: "Voucher",
    message: { root, amount, nonce, expiry },
  });
  return db.voucher.create({
    data: { root, amount: amount.toString(), nonce: nonce.toString(), expiry: Number(expiry), reason: "league", sourceId, signature },
  });
}

export const publicVoucher = (v: { id: string; root: string; amount: string; nonce: string; expiry: number; signature: string; reason: string }) =>
  ({ id: v.id, root: v.root, amount: v.amount, nonce: v.nonce, expiry: v.expiry, signature: v.signature, reason: v.reason });

/** Marks vouchers claimed by reading nonceUsed on-chain, then returns what is still claimable. */
export async function refreshVouchers(root: string) {
  const open = await db.voucher.findMany({ where: { root, status: "issued" }, orderBy: { createdAt: "asc" } });
  const now = Math.floor(Date.now() / 1000);
  const live = [];
  for (const v of open) {
    if (ADDR.rewardsPool) {
      const used = await publicClient.readContract({ address: ADDR.rewardsPool, abi: rewardsPoolAbi, functionName: "nonceUsed", args: [root as `0x${string}`, BigInt(v.nonce)] });
      if (used) { await db.voucher.update({ where: { id: v.id }, data: { status: "claimed" } }); continue; }
    }
    if (v.expiry < now) { await db.voucher.update({ where: { id: v.id }, data: { status: "expired" } }); continue; }
    live.push(v);
  }
  return live;
}
