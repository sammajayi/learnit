import { requireUser, authFail } from "../auth";
import { db } from "../db";
import { validateGoal } from "../goal";

const shape = (g: { reason: string; goalDays: number; createdAt: Date }) => ({ reason: g.reason, goalDays: g.goalDays, createdAt: g.createdAt.toISOString() });

/** The signed-in learner's goal note, or null if they have not written one. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const g = await db.goalNote.findUnique({ where: { userId: user.id } });
    return Response.json({ goal: g ? shape(g) : null });
  } catch (e) { return authFail(e); }
}

/** Saves the goal: a streak length and why they are learning. Writing it again replaces it. */
export async function PUT(req: Request) {
  try {
    const user = await requireUser(req);
    const v = validateGoal((await req.json().catch(() => ({}))) as { reason?: unknown; goalDays?: unknown });
    if (!v.ok) return Response.json({ error: v.error }, { status: 400 });
    const g = await db.goalNote.upsert({
      where: { userId: user.id },
      create: { userId: user.id, reason: v.reason, goalDays: v.goalDays },
      update: { reason: v.reason, goalDays: v.goalDays },
    });
    return Response.json({ goal: shape(g) });
  } catch (e) { return authFail(e); }
}
