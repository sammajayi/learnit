import { z } from "zod";
import { requireUser, authFail } from "../auth";
import { notVerifiedResponse } from "../verifiedGate";
import { submitAttempt, SubmitError } from "../attempts";
import { findLesson } from "../lessons";

const Body = z.object({ token: z.string(), answers: z.record(z.any()) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    const blocked = await notVerifiedResponse(user);
    if (blocked) return blocked;
    const hit = findLesson(params.id);
    if (!hit) return Response.json({ error: "Not found" }, { status: 404 });
    const b = Body.parse(await req.json());
    const out = await submitAttempt({ user, kind: "lesson", targetId: hit.lesson.id, token: b.token, answers: b.answers, exercises: () => hit.lesson.exercises });
    return Response.json(out);
  } catch (e) {
    if (e instanceof SubmitError) return Response.json({ error: e.message }, { status: e.status });
    if (e instanceof z.ZodError) return Response.json({ error: "Bad request" }, { status: 400 });
    return authFail(e);
  }
}
