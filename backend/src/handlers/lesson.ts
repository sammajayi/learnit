import { requireUser, authFail } from "../auth";
import { issueStart } from "../token";
import { findLesson, toPublic } from "../lessons";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    const hit = findLesson(params.id);
    if (!hit) return Response.json({ error: "Not found" }, { status: 404 });
    const startedAt = Date.now();
    const token = issueStart({ userId: user.id, kind: "lesson", targetId: hit.lesson.id, startedAt, seed: startedAt % 100000 });
    return Response.json({
      id: hit.lesson.id, title: hit.lesson.title, intro: hit.lesson.intro ?? [], speechLang: hit.unit.speechLang, token,
      exercises: hit.lesson.exercises.map((e) => toPublic(e, startedAt % 1000)),
    });
  } catch (e) { return authFail(e); }
}
