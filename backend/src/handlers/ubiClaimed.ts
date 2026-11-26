import { z } from "zod";
import { requireUser, authFail } from "../auth";
import { verifyClaimTx } from "../ubi";
import { db } from "../db";

const Body = z.object({ txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/) });

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const { txHash } = Body.parse(await req.json());
    const existing = await db.ubiClaim.findUnique({ where: { txHash } });
    if (existing) return Response.json({ ok: true, amount: existing.amount });
    const { amount } = await verifyClaimTx(txHash as `0x${string}`, user.wallet as `0x${string}`);
    await db.ubiClaim.create({ data: { userId: user.id, txHash, amount } });
    return Response.json({ ok: true, amount });
  } catch (e) {
    if (e instanceof z.ZodError) return Response.json({ error: "Bad request" }, { status: 400 });
    // The claim is on the chain but this node has not seen it yet. The app retries, so say it is still confirming and keep the hash out of the message.
    if (e instanceof Error && /(could not be found|timed out|not found)/i.test(e.message)) return Response.json({ error: "Your claim is still confirming.", code: "confirming" }, { status: 503 });
    if (e instanceof Error && /Transaction/.test(e.message)) return Response.json({ error: e.message.replace(/0x[0-9a-fA-F]{16,}/g, "").trim() }, { status: 400 });
    return authFail(e);
  }
}
