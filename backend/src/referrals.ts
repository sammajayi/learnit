import type { User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { topUpStakeEvents } from "./stakeIndex";
import { validateUsername } from "./profile";

/** Referrals stay off until NEXT_PUBLIC_REFERRALS_ENABLED=true. Nothing is written or shown while it is off. */
export const referralsEnabled = () => process.env.NEXT_PUBLIC_REFERRALS_ENABLED === "true";

const SOURCE_RE = /^[a-z0-9_-]{1,32}$/;
export const cleanSource = (v: unknown) => (typeof v === "string" && SOURCE_RE.test(v.trim().toLowerCase()) ? v.trim().toLowerCase() : null);

/** A link only counts for an account made in the last day, so it cannot be added to an old account later. */
const NEW_ACCOUNT_MS = 24 * 3600_000;

/**
 * Records who invited this user and where they came from. Only once, only for a new account, and never to themselves.
 * The invite code is the referrer's username.
 */
export async function attachReferral(user: User, ref: unknown, source: unknown) {
  const tag = cleanSource(source);
  let referrerId: string | null = null;
  if (typeof ref === "string" && ref.trim()) {
    const v = validateUsername(ref);
    if (v.ok) {
      const r = await db.user.findUnique({ where: { username: v.value }, select: { id: true } });
      if (r && r.id !== user.id) referrerId = r.id;
    }
  }
  if (!referrerId && !tag) return { attached: false, reason: "nothing to record" };
  if (Date.now() - user.createdAt.getTime() > NEW_ACCOUNT_MS) return { attached: false, reason: "account is not new" };
  try {
    await db.referral.create({ data: { userId: user.id, referrerId, source: tag } });
    return { attached: true };
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { attached: false, reason: "already recorded" };
    throw e;
  }
}

/** The least a referred person must stake for the referral to count: 800 G$ (18 decimals), the minimum for the open challenge. */
export const MIN_REFERRAL_STAKE = 800n * 10n ** 18n;

export type ReferredPerson = { username: string | null; joined: string; verified: boolean; learned: boolean; staked: boolean; counted: boolean };

/** A referred person counts once they are GoodDollar verified, have passed at least one lesson and have staked at least 800 G$. */
export const referralCounts = (o: { verified: boolean; learned: boolean; staked: boolean }) => o.verified && o.learned && o.staked;

/** A G$ claim needs verification, so a claim also shows they are verified (covers an expired or unsynced verifiedUntil). */
async function progressOf(userIds: string[]) {
  if (!userIds.length) return { users: new Map<string, { username: string | null; verifiedUntil: Date | null }>(), claimed: new Set<string>(), learned: new Set<string>(), staked: new Set<string>() };
  const [users, claims, passes] = await Promise.all([
    db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true, verifiedUntil: true } }),
    db.ubiClaim.groupBy({ by: ["userId"], where: { userId: { in: userIds } } }),
    db.lessonAttempt.groupBy({ by: ["userId"], where: { userId: { in: userIds }, passed: true } }),
  ]);
  // One stake of 800 G$ or more, read from the stake index (topped up briefly first, so a stake made a moment ago shows).
  await topUpStakeEvents(1500).catch(() => {});
  const wallets = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, wallet: true } });
  const big = await db.$queryRaw<{ w: string }[]>(Prisma.sql`SELECT DISTINCT lower(wallet) AS w FROM stake_events WHERE lower(wallet) IN (${Prisma.join(wallets.map((x) => x.wallet.toLowerCase()))}) AND amount::numeric >= ${MIN_REFERRAL_STAKE.toString()}::numeric`).catch(() => []);
  const bigSet = new Set(big.map((b) => b.w));
  const staked = new Set(wallets.filter((x) => bigSet.has(x.wallet.toLowerCase())).map((x) => x.id));
  return { users: new Map(users.map((u) => [u.id, u])), claimed: new Set(claims.map((c) => c.userId)), learned: new Set(passes.map((p) => p.userId)), staked };
}

type Progress = Awaited<ReturnType<typeof progressOf>>;
const isVerified = (p: Progress, id: string) => {
  const u = p.users.get(id);
  return p.claimed.has(id) || (!!u?.verifiedUntil && u.verifiedUntil > new Date());
};

/** The people one user has invited, and how far each has got. */
export async function referralSummary(user: User) {
  const rows = await db.referral.findMany({ where: { referrerId: user.id }, orderBy: { createdAt: "desc" } });
  const p = await progressOf(rows.map((r) => r.userId));
  const people: ReferredPerson[] = rows.map((r) => {
    const u = p.users.get(r.userId);
    const verified = isVerified(p, r.userId), learned = p.learned.has(r.userId), staked = p.staked.has(r.userId);
    return { username: u?.username ?? null, joined: r.createdAt.toISOString(), verified, learned, staked, counted: referralCounts({ verified, learned, staked }) };
  });
  return { people, invited: people.length, counted: people.filter((x) => x.counted).length };
}

/** Aggregate numbers for the public dashboard: no names, only counts, in total and by community tag. */
export async function referralTotals() {
  const rows = await db.referral.findMany({ select: { userId: true, referrerId: true, source: true } });
  const p = await progressOf(rows.map((r) => r.userId));
  const isCounted = (id: string) => referralCounts({ verified: isVerified(p, id), learned: p.learned.has(id), staked: p.staked.has(id) });
  const bySource: Record<string, { joined: number; counted: number }> = {};
  for (const r of rows) {
    if (!r.source) continue;
    const s = (bySource[r.source] ??= { joined: 0, counted: 0 });
    s.joined++;
    if (isCounted(r.userId)) s.counted++;
  }
  const invited = rows.filter((r) => r.referrerId);
  return { invited: invited.length, counted: invited.filter((r) => isCounted(r.userId)).length, bySource };
}
