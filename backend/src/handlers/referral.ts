import { requireUser, authFail } from "../auth";
import { referralsEnabled, attachReferral, referralSummary } from "../referrals";

const off = () => Response.json({ enabled: false }, { status: 404 });

/** The signed-in user's invite code and the people they have invited. */
export async function GET(req: Request) {
  if (!referralsEnabled()) return off();
  try {
    const user = await requireUser(req);
    return Response.json({ enabled: true, code: user.username, ...(await referralSummary(user)) });
  } catch (e) { return authFail(e); }
}

/** Called once after a new account's first sign-in, with the code and community tag the visitor arrived with. */
export async function POST(req: Request) {
  if (!referralsEnabled()) return off();
  try {
    const user = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) as { ref?: unknown; source?: unknown };
    return Response.json(await attachReferral(user, body.ref, body.source));
  } catch (e) { return authFail(e); }
}
