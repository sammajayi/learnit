import { timingSafeEqual } from "node:crypto";
import { weekKey } from "../streak";
import { finalizeWeek } from "../leagueFinalize";

const authorized = (req: Request) => {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  if (!secret) return false;
  const want = `Bearer ${secret}`;
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
};

/**
 * Run weekly by .github/workflows/league.yml (sends Authorization: Bearer CRON_SECRET) shortly after a league week ends.
 * Pays the top 3 of every group for last week. Running it again is harmless: nobody is paid twice, and a winner whose
 * voucher failed is retried. `?week=YYYY-MM-DD` (a Monday) settles an older week by hand.
 */
export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const asked = new URL(req.url).searchParams.get("week");
    const key = asked ?? weekKey(new Date(Date.now() - 7 * 86_400_000));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || weekKey(new Date(`${key}T00:00:00Z`)) !== key) return Response.json({ error: "week must be a Monday, as YYYY-MM-DD" }, { status: 400 });
    return Response.json(await finalizeWeek(key, true));
  } catch (e) {
    console.error("league finalize", e);
    return Response.json({ error: e instanceof Error ? e.message : "Something went wrong" }, { status: 500 });
  }
}
