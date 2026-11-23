import { requireUser, authFail } from "../auth";
import { loseLife } from "../lives";

/** A wrong match exercise is judged on the device, so the app reports it here. A wrong multiple-choice or translate answer is counted by /check. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const r = await loseLife(user.id);
    return Response.json({ lives: { lives: r.lives, max: r.max, nextAt: r.nextAt } });
  } catch (e) { return authFail(e); }
}
