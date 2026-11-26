import { requireUser, authFail } from "../auth";
import { readUbiStatus, withLocalClaim } from "../ubi";
import { db } from "../db";

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const [status, last] = await Promise.all([
      readUbiStatus(user.wallet as `0x${string}`),
      db.ubiClaim.findFirst({ where: { userId: user.id }, orderBy: { claimedAt: "desc" } }),
    ]);
    // The transaction hash stays on the server: the app never shows it.
    return Response.json(withLocalClaim(status, last ? Math.floor(last.claimedAt.getTime() / 1000) : null));
  } catch (e) {
    return authFail(e);
  }
}
