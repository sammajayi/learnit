import { requireUser, authFail } from "../auth";
import { db } from "../db";
import { listCohortIds, readCohort, memberCount, myState, progressFor, mirrorCohort, cohortSpans, joinableByLength } from "../cohorts";
import { topUpStakeEvents } from "../stakeIndex";

/** Cohorts that ended longer ago than this drop off the list unless a payout is still waiting. */
const KEEP_AFTER_END_SEC = 14 * 86400;

/**
 * The open challenge. Cohorts start every day, so for each length (7, 14, 30 days) a learner can always join the one that
 * started today or is about to. The list is: the challenges this person is in (first), the one to join for each length,
 * and older ones only while they still have a payout waiting.
 */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const now = Date.now() / 1000;
    const ids = await listCohortIds();
    const spans = await cohortSpans(ids);

    // Where this person has staked, from the stake index (topped up briefly so a stake made a moment ago shows).
    let stakedIds: number[];
    try {
      await topUpStakeEvents(1500).catch(() => {});
      const rows = await db.stakeEvent.findMany({ where: { wallet: { equals: user.wallet, mode: "insensitive" } }, select: { cohortId: true }, distinct: ["cohortId"] });
      stakedIds = rows.map((r) => r.cohortId);
    } catch { stakedIds = ids.slice(-6); } // index unavailable: look at the latest few, as before

    const open = joinableByLength(spans, now);
    const wanted = new Set<number>([...stakedIds, ...open.values()]);
    const rows = await Promise.all([...wanted].map(async (id) => {
      const span = spans.get(id);
      if (!span) return null;
      const mine = await myState(id, user);
      const staked = !!mine && BigInt(mine.stake) > 0n;
      const owed = !!mine && BigInt(mine.payout) > 0n; // finished a settled challenge or staked in a cancelled one, not withdrawn yet
      const joinable = now < span.start + 86400;
      if (!staked && !joinable) return null;
      if (staked && !owed && now > span.end + KEEP_AFTER_END_SEC) return null;
      const c = await readCohort(id);
      if (!c) return null;
      await mirrorCohort(c);
      const [members, progress] = await Promise.all([memberCount(id), staked ? progressFor(user, c.start, c.end) : Promise.resolve(null)]);
      return { ...c, joinable, members, mine, progress };
    }));
    const list = rows.filter((r): r is NonNullable<typeof r> => r !== null);
    const isIn = (x: (typeof list)[number]) => !!x.mine && BigInt(x.mine.stake) > 0n;
    const len = (x: (typeof list)[number]) => Math.round((x.end - x.start) / 86400);
    const live = list.filter((x) => isIn(x) && !x.settled && !x.voided).sort((a, b) => b.start - a.start);
    const toJoin = list.filter((x) => x.joinable && !isIn(x)).sort((a, b) => len(a) - len(b));
    const rest = list.filter((x) => !live.includes(x) && !toJoin.includes(x)).sort((a, b) => b.id - a.id);
    return Response.json({ cohorts: [...live, ...toJoin, ...rest] });
  } catch (e) { return authFail(e); }
}
