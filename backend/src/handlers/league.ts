import { requireUser, authFail } from "../auth";
import { allTimeLeaderboard, leaderboardFor } from "../leagues";
import { short } from "../format";

/** `?scope=all` is the all-time board; without it, this week's group. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    if (new URL(req.url).searchParams.get("scope") === "all") {
      const board = await allTimeLeaderboard(user);
      return Response.json({
        scope: "all",
        rows: board.rows.map((r) => ({ you: r.userId === user.id, wallet: short(r.wallet), name: r.name, avatarUrl: r.avatarUrl, points: r.points, rank: r.rank })),
        you: board.you,
      });
    }
    const board = await leaderboardFor(user);
    if (!board) return Response.json({ joined: false });
    return Response.json({
      joined: true,
      weekKey: board.weekKey,
      endsAt: board.endsAt,
      rows: board.rows.map((r) => ({ you: r.userId === user.id, wallet: short(r.wallet), name: r.name, avatarUrl: r.avatarUrl, points: r.points, rank: r.rank })),
    });
  } catch (e) { return authFail(e); }
}
