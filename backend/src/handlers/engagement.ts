import { requireUser, authFail } from "../auth";
import { engagementEnabled, prepareEngagement, submitEngagement } from "../engagement";

const off = () => Response.json({ ready: false, why: "off" }, { status: 404 });

/** Is the signed-in learner able to claim the GoodDollar engagement reward, and what do they sign? */
export async function GET(req: Request) {
  if (!engagementEnabled()) return off();
  try { return Response.json(await prepareEngagement(await requireUser(req))); }
  catch (e) { return authFail(e); }
}

/** Takes the learner's signature and sends the claim, paying the network fee from the app wallet. */
export async function POST(req: Request) {
  if (!engagementEnabled()) return off();
  try {
    const user = await requireUser(req);
    const b = (await req.json().catch(() => ({}))) as { validUntilBlock?: unknown; signature?: unknown };
    if (typeof b.validUntilBlock !== "string" || !/^\d{1,20}$/.test(b.validUntilBlock) || typeof b.signature !== "string" || !/^0x[0-9a-fA-F]{130,}$/.test(b.signature)) {
      return Response.json({ error: "Bad request" }, { status: 400 });
    }
    const r = await submitEngagement(user, b.validUntilBlock, b.signature as `0x${string}`);
    return Response.json(r, { status: r.ok ? 200 : 409 });
  } catch (e) { return authFail(e); }
}
