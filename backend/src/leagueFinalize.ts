import { db } from "./db";
import { readVerification } from "./identity";
import { BONUS_RANKS, pointsForWeek } from "./leagues";
import { issueLeagueVoucher, rewardConfig } from "./vouchers";

export type FinalizeResult = {
  week: string; groups: number;
  /** Winners with points, in rank order within each group. */
  winners: number;
  /** Vouchers created by this run. */
  issued: number;
  /** Winners who already had their voucher from an earlier run. */
  alreadyPaid: number;
  /** Winners passed over, and why: not verified, or flagged for review. They are tried again if the week is finalised again. */
  skipped: string[];
  /** Winners whose voucher could not be signed. A later run retries them. */
  failed: number;
};

/**
 * Pays the top 3 of every group for a finished league week. Safe to run again: a winner who already has a voucher is left
 * alone, one whose voucher failed is retried, and nobody is paid twice (a bonus row is unique per person and week, and a
 * voucher is unique per bonus row). With `send` false it only reports what it would do.
 */
export async function finalizeWeek(key: string, send: boolean, log: (line: string) => void = () => {}): Promise<FinalizeResult> {
  const start = new Date(`${key}T00:00:00.000Z`).getTime() / 1000;
  if (!Number.isFinite(start)) throw new Error(`Not a week: ${key}`);
  if (Date.now() / 1000 < start + 7 * 86400) throw new Error(`Week ${key} has not ended yet`);

  const groups = await db.leagueMembership.groupBy({ by: ["groupIndex"], where: { weekKey: key } });
  const amounts = rewardConfig().leagueBonus;
  const out: FinalizeResult = { week: key, groups: groups.length, winners: 0, issued: 0, alreadyPaid: 0, skipped: [], failed: 0 };
  log(`Week ${key}: ${groups.length} group(s)`);

  for (const g of groups) {
    const members = await db.leagueMembership.findMany({ where: { weekKey: key, groupIndex: g.groupIndex }, include: { user: true } });
    const points = await pointsForWeek(members.map((m) => m.userId), key);
    const ranked = members.map((m) => ({ user: m.user, points: points.get(m.userId) ?? 0 })).sort((a, b) => b.points - a.points).slice(0, BONUS_RANKS);
    log(`\nGroup ${g.groupIndex} (${members.length} members):`);

    for (let i = 0; i < ranked.length; i++) {
      const { user, points: pts } = ranked[i];
      const who = user.username ?? user.wallet;
      if (pts === 0) { log(`  #${i + 1} ${who}: 0 pts, skipped`); continue; }
      out.winners++;
      log(`  #${i + 1} ${who}: ${pts} pts`);

      const existing = await db.leagueBonus.findUnique({ where: { userId_weekKey: { userId: user.id, weekKey: key } } });
      if (existing && await db.voucher.findUnique({ where: { sourceId: existing.id }, select: { id: true } })) { out.alreadyPaid++; log("    already paid"); continue; }
      if (user.flagged) { out.skipped.push(`${who}: flagged for review`); log("    flagged for review, skipped"); continue; }
      if (!send) continue;

      const v = await readVerification(user.wallet as `0x${string}`);
      if (!v.verified || !v.root) { out.skipped.push(`${who}: not verified`); log("    not verified, skipped"); continue; }
      const row = existing ?? await db.leagueBonus.create({ data: { userId: user.id, weekKey: key, groupIndex: g.groupIndex, rank: i + 1, amount: amounts[i].toString() } });
      try {
        const voucher = await issueLeagueVoucher(v.root, BigInt(row.amount), row.id);
        if (voucher) { out.issued++; log(`    voucher ${voucher.id}`); }
        else { out.failed++; log("    could not sign voucher (SIGNER_PRIVATE_KEY or rewards pool address missing)"); }
      } catch (e) {
        if ((e as { code?: string }).code === "P2002") { out.alreadyPaid++; continue; }
        out.failed++; log(`    failed: ${String((e as Error).message).split("\n")[0]}`);
      }
    }
  }
  return out;
}
