import { requireUser, authFail } from "../auth";
import { db } from "../db";
import { validateUsername, cleanText, avatarUrlFor, BIO_MAX, NAME_MAX } from "../profile";

const shape = (u: { id: string; username: string | null; displayName: string | null; bio: string | null; hasAvatar: boolean; avatarVersion: number }) =>
  ({ username: u.username, displayName: u.displayName, bio: u.bio, avatarUrl: avatarUrlFor(u) });

export async function GET(req: Request) {
  try { return Response.json(shape(await requireUser(req))); } catch (e) { return authFail(e); }
}

/** Saves username, display name and bio. Send only the fields you want to change; an empty string clears the display name or bio, but a username is required. */
export async function PUT(req: Request) {
  try {
    const user = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) as { username?: unknown; displayName?: unknown; bio?: unknown };
    const data: { username?: string | null; displayName?: string | null; bio?: string | null } = {};

    if (typeof body.username === "string") {
      if (body.username.trim() === "") return Response.json({ error: "Choose a username" }, { status: 400 });
      else {
        const v = validateUsername(body.username);
        if (!v.ok) return Response.json({ error: v.reason }, { status: 400 });
        data.username = v.value;
      }
    }
    if ("displayName" in body) data.displayName = cleanText(body.displayName, NAME_MAX);
    if ("bio" in body) data.bio = cleanText(body.bio, BIO_MAX);

    try {
      const updated = await db.user.update({ where: { id: user.id }, data });
      return Response.json(shape(updated));
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") return Response.json({ error: "That username is taken" }, { status: 409 });
      throw e;
    }
  } catch (e) { return authFail(e); }
}
