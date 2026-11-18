import { requireUser, authFail } from "../auth";
import { db } from "../db";
import { issueStart } from "../token";
import { findCheckpoint, seededDraw, toPublic } from "../lessons";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    const hit = findCheckpoint(params.id);
    if (!hit) return Response.json({ error: "Not found" }, { status: 404 });
    const passed = await db.lessonAttempt.findMany({ where: { userId: user.id, passed: true, kind: "lesson", lessonId: { in: hit.unit.lessons.map((l) => l.id) } }, select: { lessonId: true }, distinct: ["lessonId"] });
    if (passed.length < hit.unit.lessons.length) return Response.json({ error: "Pass every lesson in this unit to open the checkpoint." }, { status: 403 });
    const lastFail = await db.lessonAttempt.findFirst({ where: { userId: user.id, lessonId: hit.checkpoint.id, passed: false }, orderBy: { createdAt: "desc" } });
    if (lastFail && Date.now() - lastFail.createdAt.getTime() < 86400_000)
      return Response.json({ error: "You can retry this checkpoint 24 hours after a missed attempt.", cooldownUntil: new Date(lastFail.createdAt.getTime() + 86400_000).toISOString() }, { status: 429 });
    const startedAt = Date.now();
    const seed = (startedAt * 2654435761) % 4294967296;
    const token = issueStart({ userId: user.id, kind: "checkpoint", targetId: hit.checkpoint.id, startedAt, seed });
    const picked = seededDraw(hit.checkpoint.pool, seed, hit.checkpoint.draw);
    return Response.json({ id: hit.checkpoint.id, title: hit.checkpoint.title, speechLang: hit.unit.speechLang, token, exercises: picked.map((e) => toPublic(e, seed % 1000)) });
  } catch (e) { return authFail(e); }
}
