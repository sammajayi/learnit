import { db } from "../db";
import { publicClient } from "../identity";
import { ADDR, identityAbi } from "../chain";
import { rewardsPoolAbi, streakVaultAbi } from "../abis";

type DayRow = { day: Date; claims: bigint; claimers: bigint; total: string | null };
type TotalRow = { claims: bigint; claimers: bigint; total: string | null };
type ActivityRow = { day: Date; signups: bigint; active: bigint; passed: bigint };
type LearnRow = { a1: bigint; a7: bigint; a30: bigint; attempts: bigint; passed: bigint; learners: bigint };

const DAYS = 30;
const TTL_MS = 5 * 60_000;
let cache: { at: number; body: unknown } | null = null;

const n = (r: TotalRow) => ({ claims: Number(r.claims), claimers: Number(r.claimers), total: (r.total ?? "0").split(".")[0] });

/** People with a whitelisted GoodDollar identity, one multicall for everyone. */
async function verifiedCount(wallets: string[]) {
  if (!wallets.length) return 0;
  const res = await publicClient.multicall({
    allowFailure: true,
    contracts: wallets.map((w) => ({ address: ADDR.identity, abi: identityAbi, functionName: "isWhitelisted" as const, args: [w as `0x${string}`] as const })),
  });
  return res.filter((r) => r.status === "success" && r.result === true).length;
}

/**
 * G$ moved through LearnIt's own contracts since they were deployed: paid out as rewards, and staked in challenges.
 * Read from the chain, because the database only learns a voucher was claimed when someone lists their vouchers.
 * Each part is null when it cannot be read, so one failing read never hides the others.
 */
async function onChainUsed(): Promise<{ rewards: bigint | null; staked: bigint | null }> {
  const rewards = async () => {
    if (!ADDR.rewardsPool) return null;
    const first = await db.voucher.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });
    if (!first) return 0n;
    const from = Math.floor(first.createdAt.getTime() / 86_400_000), to = Math.floor(Date.now() / 86_400_000);
    const res = await publicClient.multicall({
      allowFailure: true,
      contracts: Array.from({ length: to - from + 1 }, (_, i) => ({ address: ADDR.rewardsPool, abi: rewardsPoolAbi, functionName: "spentOnDay" as const, args: [BigInt(from + i)] as const })),
    });
    return res.every((r) => r.status === "success") ? res.reduce((t, r) => t + (r.result as bigint), 0n) : null;
  };
  const staked = async () => {
    if (!ADDR.streakVault) return null;
    const next = await publicClient.readContract({ address: ADDR.streakVault, abi: streakVaultAbi, functionName: "nextCohortId" });
    const ids = Array.from({ length: Math.max(0, Number(next) - 1) }, (_, i) => BigInt(i + 1));
    if (!ids.length) return 0n;
    const res = await publicClient.multicall({
      allowFailure: true,
      contracts: ids.map((id) => ({ address: ADDR.streakVault, abi: streakVaultAbi, functionName: "cohorts" as const, args: [id] as const })),
    });
    return res.every((r) => r.status === "success") ? res.reduce((t, r) => t + ((r.result as readonly unknown[])[4] as bigint), 0n) : null;
  };
  const [r, s] = await Promise.all([rewards().catch(() => null), staked().catch(() => null)]);
  return { rewards: r, staked: s };
}

/**
 * Public, aggregate-only numbers for the dashboard (the GoodDollar team reads this). No names, wallets or per-person rows.
 * Cached for five minutes so a busy dashboard cannot hammer the database or the RPC.
 */
export async function GET() {
  try {
    if (cache && Date.now() - cache.at < TTL_MS) return json(cache.body);

    const [wallets, signups7, days, all, learn, activity, used] = await Promise.all([
      db.user.findMany({ select: { wallet: true } }),
      db.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } } }),
      db.$queryRaw<DayRow[]>`
        SELECT date_trunc('day', "claimedAt" AT TIME ZONE 'UTC') AS day,
               COUNT(*) AS claims, COUNT(DISTINCT "userId") AS claimers, SUM(amount::numeric)::text AS total
        FROM ubi_claims WHERE "claimedAt" >= NOW() - ${DAYS} * INTERVAL '1 day' GROUP BY 1 ORDER BY 1 DESC`,
      db.$queryRaw<TotalRow[]>`
        SELECT COUNT(*) AS claims, COUNT(DISTINCT "userId") AS claimers, SUM(amount::numeric)::text AS total FROM ubi_claims`,
      db.$queryRaw<LearnRow[]>`
        SELECT COUNT(DISTINCT "userId") FILTER (WHERE "createdAt" >= NOW() - INTERVAL '1 day')  AS a1,
               COUNT(DISTINCT "userId") FILTER (WHERE "createdAt" >= NOW() - INTERVAL '7 days') AS a7,
               COUNT(DISTINCT "userId") FILTER (WHERE "createdAt" >= NOW() - INTERVAL '30 days') AS a30,
               COUNT(*) AS attempts, COUNT(*) FILTER (WHERE passed) AS passed,
               COUNT(DISTINCT "userId") FILTER (WHERE passed) AS learners
        FROM lesson_attempts`,
      // One row per UTC day for the trend charts: new people, people who attempted a lesson, lessons passed.
      db.$queryRaw<ActivityRow[]>`
        SELECT d.day AS day,
               COALESCE((SELECT COUNT(*) FROM users u WHERE date_trunc('day', u."createdAt" AT TIME ZONE 'UTC') = d.day), 0) AS signups,
               COALESCE((SELECT COUNT(DISTINCT a."userId") FROM lesson_attempts a WHERE date_trunc('day', a."createdAt" AT TIME ZONE 'UTC') = d.day), 0) AS active,
               COALESCE((SELECT COUNT(*) FROM lesson_attempts a WHERE a.passed AND date_trunc('day', a."createdAt" AT TIME ZONE 'UTC') = d.day), 0) AS passed
        FROM generate_series(date_trunc('day', NOW() AT TIME ZONE 'UTC') - ${DAYS - 1} * INTERVAL '1 day', date_trunc('day', NOW() AT TIME ZONE 'UTC'), INTERVAL '1 day') AS d(day)
        ORDER BY 1 DESC`,
      onChainUsed(),
    ]);
    const verified = await verifiedCount(wallets.map((u) => u.wallet)).catch(() => null);
    const rows = days.map((d) => ({ day: d.day.toISOString().slice(0, 10), ...n(d) }));
    const todayKey = new Date().toISOString().slice(0, 10);
    const l = learn[0];
    const body = {
      generatedAt: new Date().toISOString(),
      users: { total: wallets.length, newLast7d: signups7, active1d: Number(l.a1), active7d: Number(l.a7), active30d: Number(l.a30), verified },
      learning: { attempts: Number(l.attempts), passed: Number(l.passed), learnersWithPass: Number(l.learners) },
      activity: activity.map((a) => ({ day: a.day.toISOString().slice(0, 10), signups: Number(a.signups), active: Number(a.active), passed: Number(a.passed) })),
      // Everything that has moved through LearnIt, all time: UBI claimed, rewards paid out and G$ staked (wei, as strings).
      gUsed: (() => {
        const ubi = BigInt(n(all[0]).total);
        return { ubi: ubi.toString(), rewards: used.rewards?.toString() ?? null, staked: used.staked?.toString() ?? null,
          total: used.rewards !== null && used.staked !== null ? (ubi + used.rewards + used.staked).toString() : null };
      })(),
      ubi: { allTime: n(all[0]), today: rows.find((d) => d.day === todayKey) ?? { claims: 0, claimers: 0, total: "0" }, days: rows },
    };
    cache = { at: Date.now(), body };
    return json(body);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Stats are unavailable right now" }, { status: 503 });
  }
}

const json = (body: unknown) => Response.json(body, { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" } });
