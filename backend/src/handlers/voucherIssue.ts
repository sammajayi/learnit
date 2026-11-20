import { z } from "zod";
import { requireUser, authFail } from "../auth";
import { db } from "../db";
import { issueVoucher, publicVoucher } from "../vouchers";
import { PASS_ACCURACY } from "../grading";

const Body = z.object({ attemptId: z.string() });

/** Issues the reward voucher for a passed attempt that scored high enough to earn one. Safe to call twice: returns the voucher that already exists. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const { attemptId } = Body.parse(await req.json());
    const attempt = await db.lessonAttempt.findFirst({ where: { id: attemptId, userId: user.id, passed: true, score: { gte: PASS_ACCURACY } } });
    if (!attempt) return Response.json({ error: "Not found" }, { status: 404 });

    const [existing, flagged] = await Promise.all([
      db.voucher.findUnique({ where: { sourceId: attempt.id } }),
      db.abuseFlag.findFirst({ where: { attemptId: attempt.id } }),
    ]);
    if (existing) return Response.json({ voucher: publicVoucher(existing), reviewPending: false });
    if (flagged) return Response.json({ voucher: null, reviewPending: true });

    const firstCheckpointPass = attempt.kind === "checkpoint"
      ? !(await db.lessonAttempt.findFirst({ where: { userId: user.id, lessonId: attempt.lessonId, kind: "checkpoint", passed: true, createdAt: { lt: attempt.createdAt } } }))
      : false;
    try {
      const v = await issueVoucher(user, attempt, firstCheckpointPass);
      return Response.json({ voucher: v ? publicVoucher(v) : null, reviewPending: false });
    } catch (e) {
      // two tabs racing: the unique sourceId makes the second create fail, so return the winner
      const again = await db.voucher.findUnique({ where: { sourceId: attempt.id } });
      if (again) return Response.json({ voucher: publicVoucher(again), reviewPending: false });
      throw e;
    }
  } catch (e) {
    if (e instanceof z.ZodError) return Response.json({ error: "Bad request" }, { status: 400 });
    return authFail(e);
  }
}
