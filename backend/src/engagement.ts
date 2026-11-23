import type { User } from "@prisma/client";
import { createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { db } from "./db";
import { CHAIN, CHAIN_ID, RPC_URL } from "./chain";
import { publicClient, readVerification } from "./identity";
import { referralsEnabled } from "./referrals";

/** GoodDollar Engagement Rewards on Celo. Off until NEXT_PUBLIC_ENGAGEMENT_ENABLED=true. */
export const engagementEnabled = () => process.env.NEXT_PUBLIC_ENGAGEMENT_ENABLED === "true";

/** The development deployment, where anyone can approve an app. Set ENGAGEMENT_REWARDS_ADDRESS to the production proxy at launch. */
const DEV_CONTRACT = "0xb44fC3A592aDaA257AECe1Ae8956019EA53d0465";
export const engagementContract = () => (process.env.ENGAGEMENT_REWARDS_ADDRESS || DEV_CONTRACT) as `0x${string}`;

const ZERO = "0x0000000000000000000000000000000000000000" as const;
/** The signature is only valid for a few minutes: the contract caps it at 600 blocks. */
const VALID_BLOCKS = 300n;

const abi = [
  { type: "function", name: "appClaim", stateMutability: "nonpayable", inputs: [{ name: "user", type: "address" }, { name: "inviter", type: "address" }, { name: "validUntilBlock", type: "uint256" }, { name: "signature", type: "bytes" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "canClaim", stateMutability: "view", inputs: [{ name: "app", type: "address" }, { name: "user", type: "address" }], outputs: [{ type: "bool" }] },
  {
    type: "function", name: "registeredApps", stateMutability: "view", inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "owner", type: "address" }, { name: "rewardReceiver", type: "address" }, { name: "totalRewardsClaimed", type: "uint96" },
      { name: "registeredAt", type: "uint32" }, { name: "lastResetAt", type: "uint32" }, { name: "userAndInviterPercentage", type: "uint8" },
      { name: "userPercentage", type: "uint8" }, { name: "isRegistered", type: "bool" }, { name: "isApproved", type: "bool" },
      { name: "description", type: "string" }, { name: "url", type: "string" }, { name: "email", type: "string" }, { name: "app", type: "address" }, { name: "signer", type: "address" },
    ],
  },
] as const;

/** The wallet LearnIt is registered as. It pays the network fee, so it needs a little CELO. */
export const engagementAccount = () => {
  const key = process.env.ENGAGEMENT_APP_PRIVATE_KEY as Hex | undefined;
  return key ? privateKeyToAccount(key) : null;
};

/** What the learner signs: a claim naming the app, who invited them (or nobody) and how long it stays valid. */
export function claimTypedData(o: { app: `0x${string}`; inviter: `0x${string}`; validUntilBlock: bigint; description: string }) {
  return {
    domain: { name: "EngagementRewards", version: "1.0", chainId: CHAIN_ID, verifyingContract: engagementContract() },
    types: { Claim: [{ name: "app", type: "address" }, { name: "inviter", type: "address" }, { name: "validUntilBlock", type: "uint256" }, { name: "description", type: "string" }] },
    primaryType: "Claim" as const,
    message: { app: o.app, inviter: o.inviter, validUntilBlock: o.validUntilBlock, description: o.description },
  };
}

export type Why = "off" | "not_set_up" | "not_verified" | "no_lesson" | "already_claimed" | "app_not_live" | "not_eligible_now";

/** Same bar as a counted referral: GoodDollar verified and at least one lesson passed. The contract adds its own limits (once per 180 days, 3 apps). */
export function eligibility(o: { verified: boolean; passedLesson: boolean; alreadyClaimed: boolean }): Why | null {
  if (!o.verified) return "not_verified";
  if (!o.passedLesson) return "no_lesson";
  if (o.alreadyClaimed) return "already_claimed";
  return null;
}

/** A claim that was sent but not yet confirmed: look at the transaction. Mined and successful makes it final; reverted frees the learner to try again. */
async function settle(userId: string, claim: { txHash: string | null; confirmed: boolean }) {
  if (claim.confirmed || !claim.txHash) return claim.confirmed;
  try {
    const r = await publicClient.getTransactionReceipt({ hash: claim.txHash as Hex });
    if (r.status === "success") { await db.engagementClaim.update({ where: { userId }, data: { confirmed: true } }); return true; }
    await db.engagementClaim.delete({ where: { userId } }).catch(() => {});
  } catch { /* not mined yet: leave it pending */ }
  return false;
}

async function checks(user: User): Promise<{ why: Why } | { app: `0x${string}`; description: string }> {
  if (!engagementEnabled()) return { why: "off" };
  const account = engagementAccount();
  if (!account) return { why: "not_set_up" };
  const [v, passed, claim] = await Promise.all([
    readVerification(user.wallet as `0x${string}`),
    db.lessonAttempt.findFirst({ where: { userId: user.id, passed: true }, select: { id: true } }),
    db.engagementClaim.findUnique({ where: { userId: user.id } }),
  ]);
  const final = claim ? await settle(user.id, claim) : false;
  // A claim that is sent but not yet confirmed also blocks a second one.
  const stillThere = claim ? !!(await db.engagementClaim.findUnique({ where: { userId: user.id }, select: { id: true } })) : false;
  const why = eligibility({ verified: v.verified, passedLesson: !!passed, alreadyClaimed: final || stillThere });
  if (why) return { why };
  const info = await publicClient.readContract({ address: engagementContract(), abi, functionName: "registeredApps", args: [account.address] });
  if (!info[7] || !info[8]) return { why: "app_not_live" }; // registered and approved
  const can = await publicClient.readContract({ address: engagementContract(), abi, functionName: "canClaim", args: [account.address, user.wallet as `0x${string}`] }).catch(() => false);
  if (!can) return { why: "not_eligible_now" };
  return { app: account.address, description: info[9] };
}

/** Whoever invited this learner gets the inviter share. Only while referrals are on; otherwise that share goes to the app. */
async function inviterOf(user: User): Promise<`0x${string}`> {
  if (!referralsEnabled()) return ZERO;
  const r = await db.referral.findUnique({ where: { userId: user.id }, select: { referrerId: true } });
  if (!r?.referrerId) return ZERO;
  const who = await db.user.findUnique({ where: { id: r.referrerId }, select: { wallet: true } });
  return (who?.wallet as `0x${string}` | undefined) ?? ZERO;
}

/** Whether this learner can claim now, and if so the message for them to sign. */
export async function prepareEngagement(user: User) {
  const c = await checks(user);
  if ("why" in c) return { ready: false as const, why: c.why };
  const validUntilBlock = (await publicClient.getBlockNumber()) + VALID_BLOCKS;
  const t = claimTypedData({ app: c.app, inviter: await inviterOf(user), validUntilBlock, description: c.description });
  return { ready: true as const, typedData: { ...t, message: { ...t.message, validUntilBlock: validUntilBlock.toString() } } };
}

/** Sends the claim for the learner, paying the network fee from the app wallet. One claim per learner: the row is taken first, so a double tap cannot send twice. */
export async function submitEngagement(user: User, validUntilBlock: string, signature: `0x${string}`) {
  const c = await checks(user);
  if ("why" in c) return { ok: false as const, why: c.why };
  const account = engagementAccount()!;
  const inviter = await inviterOf(user);
  try { await db.engagementClaim.create({ data: { userId: user.id, inviter: inviter === ZERO ? null : inviter } }); }
  catch (e) { if ((e as { code?: string }).code === "P2002") return { ok: false as const, why: "already_claimed" as const }; throw e; }
  try {
    const args = [user.wallet as `0x${string}`, inviter, BigInt(validUntilBlock), signature] as const;
    const { request, result } = await publicClient.simulateContract({ account, address: engagementContract(), abi, functionName: "appClaim", args });
    if (!result) { await db.engagementClaim.delete({ where: { userId: user.id } }); return { ok: false as const, why: "not_eligible_now" as const }; }
    const wallet = createWalletClient({ account, chain: CHAIN, transport: http(RPC_URL) });
    const hash = await wallet.writeContract(request);
    await db.engagementClaim.update({ where: { userId: user.id }, data: { txHash: hash } });
    // Only a mined, successful transaction counts. If it reverts the learner can try again; if we stop waiting, it is settled on their next visit.
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 45_000 });
      if (receipt.status !== "success") { await db.engagementClaim.delete({ where: { userId: user.id } }); return { ok: false as const, why: "not_eligible_now" as const }; }
      await db.engagementClaim.update({ where: { userId: user.id }, data: { confirmed: true } });
      return { ok: true as const, txHash: hash, pending: false };
    } catch { return { ok: true as const, txHash: hash, pending: true }; }
  } catch (e) {
    // Nothing was sent (simulation or sending failed), so they can try again. A claim that already has a hash is kept.
    await db.engagementClaim.deleteMany({ where: { userId: user.id, txHash: null } });
    throw e;
  }
}
