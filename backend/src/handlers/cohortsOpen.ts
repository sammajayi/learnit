import { requireUser, authFail } from "../auth";
import { listCohortIds, readCohort, memberCount, myState, progressFor, mirrorCohort } from "../cohorts";

/** Cohorts a user can join (first day not over) plus ones they are already in. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const now = Date.now() / 1000;
    const ids = await listCohortIds();
    const recent = new Set(ids.slice(-6));
    // Every challenge is read at the same time. One at a time, each extra challenge added its own round trips to the wait.
    const rows = await Promise.all(ids.map(async (id) => {
      const mine = await myState(id, user);
      const owed = !!mine && BigInt(mine.payout) > 0n; // not withdrawn yet: finished a settled challenge, or staked in a cancelled one
      // Older challenges only matter while the person still has a payout to collect, so they never drop off the list.
      if (!recent.has(id) && !owed) return null;
      const c = await readCohort(id);
      if (!c) return null;
      await mirrorCohort(c);
      const joinable = now < c.start + 86400;
      const staked = !!mine && BigInt(mine.stake) > 0n;
      if (!joinable && !staked) return null;
      const [members, progress] = await Promise.all([recent.has(id) ? memberCount(id) : Promise.resolve(0), staked ? progressFor(user, c.start, c.end) : Promise.resolve(null)]);
      return { ...c, joinable, members, mine, progress };
    }));
    const out = rows.filter((r) => r !== null);
    return Response.json({ cohorts: out.reverse() });
  } catch (e) { return authFail(e); }
}
