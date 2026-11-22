import { requireUser, authFail } from "../auth";
import { allTimeLeaderboard, leaderboardFor, WEEK_SHOWN } from "../leagues";
import { short } from "../format";

/** `?scope=all` is the all-time board; without it, this week's group. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    if (new URL(req.url).searchParams.get("scope") === "all") {
      const board = await allTimeLeaderboard(user, Number(new URL(req.url).searchParams.get("page")) || 1);
      return Response.json({
        scope: "all",
        rows: board.rows.map((r) => ({ you: r.userId === user.id, wallet: short(r.wallet), name: r.name, avatarUrl: r.avatarUrl, points: r.points, rank: r.rank })),
        you: board.you, ahead: board.ahead, page: board.page, pages: board.pages, total: board.total,
      });
    }
    const board = await leaderboardFor(user);
    if (!board) return Response.json({ joined: false });
    // Top 15 only. A learner lower down also gets the row just ahead of them (for the "points to pass" line) and their own row.
    const meIdx = board.rows.findIndex((r) => r.userId === user.id);
    const shown = board.rows.filter((r, i) => i < WEEK_SHOWN || i === meIdx || (meIdx >= WEEK_SHOWN && i === meIdx - 1));
    return Response.json({
      joined: true,
      weekKey: board.weekKey,
      endsAt: board.endsAt,
      size: board.rows.length,
      rows: shown.map((r) => ({ you: r.userId === user.id, wallet: short(r.wallet), name: r.name, avatarUrl: r.avatarUrl, points: r.points, rank: r.rank })),
    });
  } catch (e) { return authFail(e); }
}
