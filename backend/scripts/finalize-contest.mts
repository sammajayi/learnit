// Pays the biweekly contest: the top 10 who never missed a day, verified, share the pool. Run it from the backend folder.
//   npx tsx --env-file=../.env scripts/finalize-contest.mts                       (dry run for the contest that ended last)
//   npx tsx --env-file=../.env scripts/finalize-contest.mts --start 2026-11-30    (dry run for the contest that began on that day)
//   npx tsx --env-file=../.env scripts/finalize-contest.mts --start 2026-11-30 --send   (issue the vouchers)
// Winners are checked on the chain at this moment. Nobody is paid twice (a prize row is unique per person and contest, and a voucher per row).
// A voucher cannot be bigger than the pool's per-person daily cap, so a prize above it is capped and the rest is listed to pay by hand.
// Needs CONTEST_POOL_G. Rules live in src/contestRules.ts.
import { db } from "../src/db";
import { rankedContest } from "../src/contest";
import { contestPoolG, contestWindow, addDays, prizeAmounts, utcDay, PRIZE_RANKS } from "../src/contestRules";
import { readVerification } from "../src/identity";
import { isVerifiedNow } from "../src/verifiedGate";
import { issueLeagueVoucher, rewardConfig } from "../src/vouchers";
import { parseUnits } from "viem";

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : undefined; };
const send = process.argv.includes("--send");
const pool = contestPoolG();
if (!pool) throw new Error("Set CONTEST_POOL_G (the total G$ to share) first.");

const now = new Date();
const start = arg("start") ?? contestWindow(addDays(utcDay(now), -14)).start; // by default the contest that has just ended
const w = contestWindow(start);
if (utcDay(now) <= addDays(w.end, 1)) throw new Error(`The contest ${w.start} to ${w.end} is not over yet. A day only closes two UTC days after its date.`);
const key = `contest-${w.start}`;
const asOf = new Date(`${addDays(w.end, 2)}T12:00:00Z`); // every day of the contest is closed by then
const cfg = rewardConfig();
const amounts = prizeAmounts(pool);

// The ranking as it stood once the contest was over (every day closed).
const { rows } = await rankedContest(w, asOf);
const candidates = rows.filter((r) => !r.missed && r.rank !== null).sort((a, b) => a.rank! - b.rank!);
console.log(`Contest ${w.start} to ${w.end}: ${rows.length} verified entrants, ${candidates.length} never missed a day. Pool ${pool} G$.\n`);

let paid = 0, rank = 0;
const byHand: string[] = [];
for (const r of candidates) {
  if (rank >= PRIZE_RANKS) break;
  const user = await db.user.findUniqueOrThrow({ where: { id: r.userId } });
  const v = await readVerification(user.wallet as `0x${string}`);
  if (!isVerifiedNow(v) || !v.root) { console.log(`  ${r.name}: no longer verified on the chain, skipped (the next person moves up)`); continue; }
  if (user.flagged) { console.log(`  ${r.name}: flagged for review, skipped`); continue; }
  rank++;
  const prize = amounts[rank - 1];
  const capG = Number(cfg.dailyCap / 10n ** 16n) / 100;
  const payG = Math.min(prize, capG);
  console.log(`  #${rank} ${r.name}: ${r.points} pts, ${r.days} days -> ${prize} G$${prize > payG ? ` (voucher capped at ${payG} G$; ${(prize - payG).toFixed(2)} G$ to pay by hand)` : ""}`);
  if (prize > payG) byHand.push(`${r.name} (${user.wallet}): ${(prize - payG).toFixed(2)} G$`);
  if (!send) continue;
  const existing = await db.leagueBonus.findUnique({ where: { userId_weekKey: { userId: user.id, weekKey: key } } });
  if (existing && await db.voucher.findUnique({ where: { sourceId: existing.id }, select: { id: true } })) { console.log("    already paid"); continue; }
  const row = existing ?? await db.leagueBonus.create({ data: { userId: user.id, weekKey: key, groupIndex: 0, rank, amount: parseUnits(String(payG), 18).toString() } });
  const voucher = await issueLeagueVoucher(v.root, BigInt(row.amount), row.id);
  if (voucher) { paid++; console.log(`    voucher ${voucher.id}`); } else console.log("    could not sign the voucher (SIGNER_PRIVATE_KEY or rewards pool address missing)");
}
console.log(send ? `\nIssued ${paid} voucher(s).` : "\nDry run. Add --send to issue the vouchers.");
if (byHand.length) console.log("\nPay by hand (above the voucher cap):\n  " + byHand.join("\n  "));
await db.$disconnect();
