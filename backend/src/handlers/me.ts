import { db } from "../db";
import { requireUser, authFail } from "../auth";
import { readVerificationCached as readVerification } from "../identity";
import { avatarUrlFor } from "../profile";

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const v = await readVerification(user.wallet as `0x${string}`);
    const changed = user.whitelistedRoot !== v.root || (user.verifiedUntil?.getTime() ?? null) !== (v.verifiedUntil?.getTime() ?? null);
    const updated = changed
      ? await db.user.update({ where: { id: user.id }, data: { whitelistedRoot: v.root, verifiedUntil: v.verifiedUntil } })
      : user;
    return Response.json({
      id: updated.id,
      wallet: updated.wallet,
      username: updated.username,
      displayName: updated.displayName,
      bio: updated.bio,
      avatarUrl: avatarUrlFor(updated),
      verified: v.verified && (!v.verifiedUntil || v.verifiedUntil > new Date()),
      root: v.root,
      verifiedUntil: v.verifiedUntil,
      timezone: updated.timezone,
      course: updated.course,
      gasTopupDone: Boolean(updated.gasTopupTx),
      // Setup counts as done only with a username, so anyone who finished it without one before it was required is asked for one.
      onboarded: Boolean(updated.onboardedAt) && Boolean(updated.username),
    });
  } catch (e) {
    return authFail(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser(req);
    const body = (await req.json()) as { timezone?: string; course?: string; onboarded?: boolean };
    const data: { timezone?: string; course?: string; onboardedAt?: Date } = {};
    if (body.timezone) {
      try { new Intl.DateTimeFormat("en", { timeZone: body.timezone }); data.timezone = body.timezone; } catch {}
    }
    if (body.course === "fr" || body.course === "es") data.course = body.course;
    if (body.onboarded === true && body.course) {
      // Setup cannot be finished without a username, whatever the app sends.
      if (!user.username) return Response.json({ error: "Choose a username to finish setting up." }, { status: 400 });
      data.onboardedAt = new Date();
    }
    await db.user.update({ where: { id: user.id }, data });
    return Response.json({ ok: true });
  } catch (e) {
    return authFail(e);
  }
}
