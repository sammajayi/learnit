/**
 * One-off: create the reward vouchers that were never issued.
 * Dry run by default. Add --send to sign and store them. Safe to run twice: a voucher is keyed to its attempt.
 *
 * It follows the rules issueVoucher uses: the person is verified now, the attempt scored at least the pass mark,
 * one reward per lesson per day, no more than 6 lessons and the daily cap per day, and a checkpoint pays only on its
 * first pass. Only the last DAYS days (default 7) are covered, because a new voucher lasts 7 days, and nobody gets more
 * than the pool's weekly cap. People flagged for review are skipped. Each voucher is dated to its attempt, so it does
 * not use up today's issue limit for new lessons.
 *
 * npx tsx --env-file=../.env scripts/backfill-vouchers.mts [--send]
 */
import { erc20Abi, formatUnits } from "viem";
import { db } from "../src/db";
import { ADDR } from "../src/chain";
import { rewardsPoolAbi } from "../src/abis";
import { publicClient, readVerification } from "../src/identity";
import { PASS_ACCURACY } from "../src/grading";
import { issueVoucherFor, rewardConfig } from "../src/vouchers";

const SEND = process.argv.includes("--send");
const DAYS = Number(process.env.DAYS ?? 7);
const G = (n: bigint) => `${formatUnits(n, 18)} G$`;

const cfg = rewardConfig();
const read = (functionName: "weeklyCap" | "dailyBudget") => publicClient.readContract({ address: ADDR.rewardsPool, abi: rewardsPoolAbi, functionName }) as Promise<bigint>;
const [weeklyCap, dailyBudget, balance] = await Promise.all([
  read("weeklyCap"), read("dailyBudget"),
  publicClient.readContract({ address: ADDR.gd, abi: erc20Abi, functionName: "balanceOf", args: [ADDR.rewardsPool] }),
]);

const since = new Date(Date.now() - DAYS * 86_400_000);
const [attempts, issued] = await Promise.all([
  db.lessonAttempt.findMany({ where: { passed: true, score: { gte: PASS_ACCURACY }, createdAt: { gte: since } }, orderBy: { createdAt: "asc" }, select: { id: true, userId: true, lessonId: true, kind: true, localDate: true, createdAt: true } }),
  db.voucher.findMany({ select: { sourceId: true } }),
]);
const have = new Set(issued.map((v) => v.sourceId));
const users = await db.user.findMany({ where: { id: { in: [...new Set(attempts.map((a) => a.userId))] } }, select: { id: true, username: true, wallet: true, flagged: true } });

type Item = { attemptId: string; amount: bigint; reason: "lesson" | "checkpoint"; lessonId: string; date: string; at: Date };
const plan: { name: string; root: `0x${string}`; items: Item[] }[] = [];
const skipped: string[] = [];

for (const u of users) {
  const name = u.username ?? u.id.slice(0, 6);
  if (u.flagged) { skipped.push(`${name}: flagged for review`); continue; }
  const v = await readVerification(u.wallet as `0x${string}`);
  if (!v.verified || !v.root || (v.verifiedUntil && v.verifiedUntil <= new Date())) { skipped.push(`${name}: not verified now`); continue; }

  const days = new Map<string, { total: bigint; lessons: Set<string>; count: number }>();
  const items: Item[] = [];
  let sum = 0n;
  for (const a of attempts.filter((x) => x.userId === u.id)) {
    const day = days.get(a.localDate) ?? { total: 0n, lessons: new Set<string>(), count: 0 };
    days.set(a.localDate, day);
    const amount = a.kind === "checkpoint" ? cfg.checkpoint : cfg.lesson;
    if (a.kind === "checkpoint") {
      const earlier = await db.lessonAttempt.findFirst({ where: { userId: u.id, lessonId: a.lessonId, kind: "checkpoint", passed: true, createdAt: { lt: a.createdAt } }, select: { id: true } });
      if (earlier) continue;
    } else if (day.lessons.has(a.lessonId) || day.count >= cfg.maxLessonsPerDay) continue;
    if (day.total + amount > cfg.dailyCap) continue;
    day.total += amount; day.lessons.add(a.lessonId); if (a.kind !== "checkpoint") day.count++;
    if (have.has(a.id)) continue; // already has its voucher; it still counts towards the day
    if (sum + amount > weeklyCap) continue;
    sum += amount;
    items.push({ attemptId: a.id, amount, reason: a.kind === "checkpoint" ? "checkpoint" : "lesson", lessonId: a.lessonId, date: a.localDate, at: a.createdAt });
  }
  if (items.length) plan.push({ name, root: v.root, items });
}

const total = plan.reduce((s, p) => s + p.items.reduce((t, i) => t + i.amount, 0n), 0n);
console.log(`Window: last ${DAYS} days. Reward-eligible attempts: ${attempts.length}. Already have a voucher: ${attempts.filter((a) => have.has(a.id)).length}.`);
console.log(`Pool: ${G(balance)} | weekly cap per person: ${G(weeklyCap)} | daily budget (everyone): ${G(dailyBudget)}\n`);
for (const p of plan) console.log(`${p.name.padEnd(22)} ${String(p.items.length).padStart(2)} rewards  ${G(p.items.reduce((t, i) => t + i.amount, 0n))}`);
console.log(`\nPeople to pay: ${plan.length} | vouchers: ${plan.reduce((n, p) => n + p.items.length, 0)} | total: ${G(total)} (${total <= balance ? "within" : "MORE THAN"} the pool balance)`);
if (skipped.length) console.log(`Skipped ${skipped.length}: ${skipped.join("; ")}`);

if (!SEND) { console.log("\nDry run. Nothing was written. Add --send to issue these."); await db.$disconnect(); process.exit(0); }
let made = 0, dup = 0, failed = 0;
for (const p of plan) for (const i of p.items) {
  try { const r = await issueVoucherFor(p.root, i.amount, i.reason, i.attemptId, i.at); if (r) made++; else failed++; }
  catch (e) { if ((e as { code?: string }).code === "P2002") dup++; else { failed++; console.error("failed", p.name, i.attemptId, String((e as Error).message).split("\n")[0]); } }
}
console.log(`\nIssued ${made}, already existed ${dup}, failed ${failed}.`);
await db.$disconnect();
