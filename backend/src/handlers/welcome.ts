import { requireUser, authFail } from "../auth";
import { welcomeEnabled, welcomeStatus, claimWelcome } from "../welcome";

const off = () => Response.json({ eligible: false, why: "off" }, { status: 404 });

/** Can this learner claim the one-time welcome G$? */
export async function GET(req: Request) {
  if (!welcomeEnabled()) return off();
  try { return Response.json(await welcomeStatus(await requireUser(req))); } catch (e) { return authFail(e); }
}

/** Signs the welcome voucher. It then shows up on the Rewards page to claim. */
export async function POST(req: Request) {
  if (!welcomeEnabled()) return off();
  try {
    const r = await claimWelcome(await requireUser(req));
    return Response.json(r, { status: r.ok ? 200 : 409 });
  } catch (e) { return authFail(e); }
}
