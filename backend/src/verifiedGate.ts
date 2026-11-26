import type { User } from "@prisma/client";
import { readVerificationCached } from "./identity";

/** Verified with GoodDollar and the verification has not run out. */
export const isVerifiedNow = (v: { verified: boolean; verifiedUntil: Date | null }, now = new Date()) =>
  v.verified && (!v.verifiedUntil || v.verifiedUntil > now);

/** Lessons need a GoodDollar face check. Returns the 403 to send back when the learner has not got one, or null when they are fine. */
export async function notVerifiedResponse(user: User): Promise<Response | null> {
  const v = await readVerificationCached(user.wallet as `0x${string}`);
  if (isVerifiedNow(v)) return null;
  return Response.json({ error: "Verify with GoodDollar to take lessons. It is a quick face check.", code: "not-verified" }, { status: 403 });
}
