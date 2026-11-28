import { verifyMessage } from "viem";
import { requireUser, authFail } from "../auth";
import { FLOW_CHAIN, FLOW_COUNCIL, checkClaimBody, flowClaimMessage } from "../flowClaim";

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Claims voting rights in the Flow Council for the signed-in learner's own wallet. The learner signs a free message in the app;
 * this forwards that proof to Flow State's eligibility service, which checks GoodDollar verification and adds the wallet as a
 * voter. It holds no key and only ever forwards a proof the wallet itself signed, for the wallet that is signed in.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const text = await req.text();
    if (text.length > 2048) return reply({ error: "Request is too large." }, 413);
    let raw: unknown;
    try { raw = JSON.parse(text); } catch { return reply({ error: "Invalid request." }, 400); }
    const c = checkClaimBody(raw, user.wallet);
    if (!c.ok) return reply({ error: c.error }, 400);
    const { address, issuedAt, signature } = c.body;
    if (!(await verifyMessage({ address, message: flowClaimMessage(address, issuedAt), signature }))) return reply({ error: "The signature does not match this wallet." }, 400);

    const res = await fetch("https://flowstate.network/api/flow-council/eligibility", {
      method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(15_000), redirect: "manual", // Workers has no "error"; a redirect is refused below
      body: JSON.stringify({ address, issuedAt, signature, chainId: FLOW_CHAIN, councilId: FLOW_COUNCIL }),
    });
    if (res.status >= 300 && res.status < 400) return reply({ error: "Flow State could not grant voting rights right now. Try again in a moment." }, 503);
    const data = (await res.json().catch(() => null)) as { success?: boolean; alreadyClaimed?: boolean; notWhitelisted?: boolean } | null;
    if (res.ok && data?.success === true) return reply({ ok: true });
    if (data?.alreadyClaimed) return reply({ error: "This GoodDollar identity already has voting rights on another wallet. Vote from that wallet on Flow State.", code: "ALREADY_CLAIMED" }, 409);
    if (data?.notWhitelisted) return reply({ error: "GoodDollar verification is not valid for this wallet. Verify, then try again.", code: "NOT_VERIFIED" }, 403);
    return reply({ error: "Flow State could not grant voting rights right now. Try again in a moment." }, res.status === 429 ? 429 : 503);
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") return reply({ error: "Flow State took too long to answer. Try again in a moment." }, 503);
    return authFail(e);
  }
}
