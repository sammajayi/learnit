import { timingSafeEqual } from "node:crypto";
import { currentWeekKey } from "../leagues";
import { nudgeWeek } from "../leagueNotify";

const authorized = (req: Request) => {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  if (!secret) return false;
  const want = `Bearer ${secret}`;
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
};

/**
 * Run midweek by .github/workflows/league-nudge.yml (sends Authorization: Bearer CRON_SECRET).
 * Tells everyone in this week's league where they stand and how far the podium is. Running it again is harmless.
 */
export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(await nudgeWeek(currentWeekKey()));
  } catch (e) {
    console.error("league nudge", e);
    return Response.json({ error: e instanceof Error ? e.message : "Something went wrong" }, { status: 500 });
  }
}
