import { requireUser, authFail } from "../auth";
import { notVerifiedResponse } from "../verifiedGate";
import { issueStart } from "../token";
import { findLesson, toPublic } from "../lessons";
import { getLives } from "../lives";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    const blocked = await notVerifiedResponse(user);
    if (blocked) return blocked;
    const hit = findLesson(params.id);
    if (!hit) return Response.json({ error: "Not found" }, { status: 404 });
    // Lessons pause while there are no lives. The next one is on its way, so say when.
    const lives = await getLives(user.id);
    if (lives.lives <= 0) return Response.json({ error: "You are out of lives. The next one is on its way.", code: "no-lives", lives }, { status: 409 });
    const startedAt = Date.now();
    const token = issueStart({ userId: user.id, kind: "lesson", targetId: hit.lesson.id, startedAt, seed: startedAt % 100000 });
    return Response.json({
      id: hit.lesson.id, title: hit.lesson.title, intro: hit.lesson.intro ?? [], speechLang: hit.unit.speechLang, token, lives,
      exercises: hit.lesson.exercises.map((e) => toPublic(e, startedAt % 1000)),
    });
  } catch (e) { return authFail(e); }
}
