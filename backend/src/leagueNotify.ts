import { db } from "./db";
import { fmtGD } from "./format";
import { BONUS_RANKS, POINTS_PER_LESSON, pointsForWeek } from "./leagues";
import { configurePush, send } from "./push";
import { rewardConfig } from "./vouchers";

export const ordinal = (n: number) => {
  const r = n % 100;
  if (r >= 11 && r <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
};

export type LeagueNotice = { title: string; body: string; url: string; tag: string };

/**
 * What one person hears when a league week ends. Everyone gets something:
 * a podium finish says what they won, anyone else is told where they came and nudged to start a lesson.
 * `claimable` is whether their bonus voucher exists; without one they are asked to verify with GoodDollar.
 */
export function leagueNotice(o: { rank: number; points: number; bonus?: bigint; claimable?: boolean }): LeagueNotice {
  const tag = "league-result", url = "/earn";
  if (o.points === 0) return { title: "No lessons in the league last week", body: "Pass a lesson to join this week's board.", url: "/learn", tag };
  if (o.rank <= BONUS_RANKS) {
    const amount = o.bonus ? `${fmtGD(o.bonus).replace(/(\.\d*?)0+$/, "$1")} G$` : "bonus";
    return o.claimable
      ? { title: `You came ${ordinal(o.rank)} this week`, body: `Your ${amount} bonus is ready to claim.`, url, tag }
      : { title: `You came ${ordinal(o.rank)} this week`, body: `Verify with GoodDollar to claim your ${amount} bonus.`, url, tag };
  }
  return { title: `You finished ${ordinal(o.rank)} this week`, body: "Start a lesson to be on the podium this week.", url: "/learn", tag };
}

/** What someone hears midway through the week: where they are, and how far the podium is. */
export function midweekNotice(o: { rank: number; points: number; podiumPoints: number }): LeagueNotice {
  const tag = "league-midweek", url = "/learn";
  if (o.points === 0) return { title: "You have no league points yet", body: "Pass a lesson to join this week's board.", url, tag };
  if (o.rank <= BONUS_RANKS) return { title: `You are ${ordinal(o.rank)} this week`, body: "Pass a lesson to hold your place on the podium.", url, tag };
  const gap = Math.max(1, o.podiumPoints - o.points + 1);
  const body = gap <= POINTS_PER_LESSON
    ? "One lesson could put you on the podium."
    : `You are ${gap} points off the podium. A lesson is worth up to ${POINTS_PER_LESSON}.`;
  return { title: `You are ${ordinal(o.rank)} this week`, body, url, tag };
}

export type NotifyResult = { week: string; people: number; alreadyTold: number; sent: number; noDevice: number; failed: number };

/**
 * Tells everyone who was in a league group for a finished week how they did. Needs the week to be settled first,
 * so winners hear whether their voucher is ready. Safe to run again: a person who was told is not told twice,
 * and one whose push failed for a passing reason is tried again. Only people with a push subscription can be reached.
 */
export async function notifyWeek(key: string): Promise<NotifyResult> {
  const out: NotifyResult = { week: key, people: 0, alreadyTold: 0, sent: 0, noDevice: 0, failed: 0 };
  if (!configurePush()) return out;

  const told = new Set((await db.leagueNotice.findMany({ where: { weekKey: key, kind: "result" }, select: { userId: true } })).map((t) => t.userId));
  const bonuses = await db.leagueBonus.findMany({ where: { weekKey: key } });
  const vouchers = await db.voucher.findMany({ where: { sourceId: { in: bonuses.map((b) => b.id) } }, select: { sourceId: true } });
  const paid = new Set(vouchers.map((v) => v.sourceId));
  const bonusOf = new Map(bonuses.map((b) => [b.userId, b]));
  const amounts = rewardConfig().leagueBonus;

  const groups = await db.leagueMembership.groupBy({ by: ["groupIndex"], where: { weekKey: key } });
  for (const g of groups) {
    const members = await db.leagueMembership.findMany({ where: { weekKey: key, groupIndex: g.groupIndex }, select: { userId: true } });
    const points = await pointsForWeek(members.map((m) => m.userId), key);
    const ranked = members.map((m) => ({ userId: m.userId, points: points.get(m.userId) ?? 0 })).sort((a, b) => b.points - a.points);
    const subs = await db.pushSubscription.findMany({ where: { userId: { in: ranked.map((r) => r.userId) } } });

    for (let i = 0; i < ranked.length; i++) {
      const { userId, points: pts } = ranked[i];
      out.people++;
      if (told.has(userId)) { out.alreadyTold++; continue; }
      const mine = subs.filter((s) => s.userId === userId);
      if (!mine.length) { out.noDevice++; continue; }

      const b = bonusOf.get(userId);
      const notice = leagueNotice({ rank: i + 1, points: pts, bonus: b ? BigInt(b.amount) : i < BONUS_RANKS ? amounts[i] : undefined, claimable: !!b && paid.has(b.id) });
      let delivered = false;
      for (const s of mine) {
        try {
          await send({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(notice), { TTL: 24 * 3600, urgency: "normal" });
          delivered = true;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {}); // the device unsubscribed
          else console.error("league push failed", code);
        }
      }
      if (delivered) { out.sent++; await db.leagueNotice.create({ data: { userId, weekKey: key, kind: "result" } }).catch(() => {}); }
      else out.failed++;
    }
  }
  return out;
}

/**
 * Midweek nudge for the week in progress: everyone in a league group hears their rank and, if they are off the
 * podium, how many points away it is. Once per person per week. Only people with a push subscription can be reached.
 */
export async function nudgeWeek(key: string): Promise<NotifyResult> {
  const out: NotifyResult = { week: key, people: 0, alreadyTold: 0, sent: 0, noDevice: 0, failed: 0 };
  if (!configurePush()) return out;
  const told = new Set((await db.leagueNotice.findMany({ where: { weekKey: key, kind: "midweek" }, select: { userId: true } })).map((t) => t.userId));

  const groups = await db.leagueMembership.groupBy({ by: ["groupIndex"], where: { weekKey: key } });
  for (const g of groups) {
    const members = await db.leagueMembership.findMany({ where: { weekKey: key, groupIndex: g.groupIndex }, select: { userId: true } });
    const points = await pointsForWeek(members.map((m) => m.userId), key);
    const ranked = members.map((m) => ({ userId: m.userId, points: points.get(m.userId) ?? 0 })).sort((a, b) => b.points - a.points);
    const podiumPoints = ranked[Math.min(BONUS_RANKS, ranked.length) - 1]?.points ?? 0;
    const subs = await db.pushSubscription.findMany({ where: { userId: { in: ranked.map((r) => r.userId) } } });

    for (let i = 0; i < ranked.length; i++) {
      const { userId, points: pts } = ranked[i];
      out.people++;
      if (told.has(userId)) { out.alreadyTold++; continue; }
      const mine = subs.filter((s) => s.userId === userId);
      if (!mine.length) { out.noDevice++; continue; }
      const notice = midweekNotice({ rank: i + 1, points: pts, podiumPoints });
      let delivered = false;
      for (const s of mine) {
        try {
          await send({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(notice), { TTL: 12 * 3600, urgency: "normal" });
          delivered = true;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          else console.error("league nudge failed", code);
        }
      }
      if (delivered) { out.sent++; await db.leagueNotice.create({ data: { userId, weekKey: key, kind: "midweek" } }).catch(() => {}); }
      else out.failed++;
    }
  }
  return out;
}
