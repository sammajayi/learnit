import { z } from "zod";
import { requireUser, authFail } from "../auth";
import { notVerifiedResponse } from "../verifiedGate";
import { submitAttempt, SubmitError } from "../attempts";
import { findCheckpoint, seededDraw } from "../lessons";

const Body = z.object({ token: z.string(), answers: z.record(z.any()) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    const blocked = await notVerifiedResponse(user);
    if (blocked) return blocked;
    const hit = findCheckpoint(params.id);
    if (!hit) return Response.json({ error: "Not found" }, { status: 404 });
    const b = Body.parse(await req.json());
    const out = await submitAttempt({ user, kind: "checkpoint", targetId: hit.checkpoint.id, token: b.token, answers: b.answers, exercises: (s) => seededDraw(hit.checkpoint.pool, s.seed, hit.checkpoint.draw) });
    return Response.json(out);
  } catch (e) {
    if (e instanceof SubmitError) return Response.json({ error: e.message }, { status: e.status });
    if (e instanceof z.ZodError) return Response.json({ error: "We could not read that answer. Try again." }, { status: 400 });
    return authFail(e);
  }
}
