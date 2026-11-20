import { requireUser, authFail } from "../auth";
import { db } from "../db";
import { streakFor } from "../attempts";
import { getLives } from "../lives";
import { COURSES } from "../lessons";
import type { Lang } from "../content/schema";

type State = "passed" | "next" | "locked";

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const [passed, recentFails, st, lives] = await Promise.all([
      db.lessonAttempt.findMany({ where: { userId: user.id, passed: true }, select: { lessonId: true } }),
      db.lessonAttempt.findMany({ where: { userId: user.id, kind: "checkpoint", passed: false, createdAt: { gte: new Date(Date.now() - 86400_000) } }, orderBy: { createdAt: "desc" }, select: { lessonId: true, createdAt: true } }),
      streakFor(user),
      getLives(user.id),
    ]);
    const passedSet = new Set(passed.map((p) => p.lessonId));
    const course = (user.course === "es" ? "es" : "fr") as Lang;

    // The path is one straight line: each lesson opens when the one before it is passed, and a unit opens
    // when the previous unit's checkpoint is passed. Passed lessons stay open so they can be replayed.
    let open = true; // is everything before the current position passed?
    let nextLessonId: string | null = null;
    let currentUnit = COURSES[course].length;
    const units = COURSES[course].map((u) => {
      const unitOpen = open;
      const lessons = u.lessons.map((l) => {
        const isPassed = passedSet.has(l.id);
        const state: State = isPassed ? "passed" : open ? "next" : "locked";
        if (!isPassed) open = false;
        if (state === "next" && !nextLessonId) nextLessonId = l.id;
        return { id: l.id, title: l.title, state };
      });
      const lessonsDone = lessons.every((l) => l.state === "passed");
      const cpPassed = passedSet.has(u.checkpoint.id);
      const lastFail = recentFails.find((f) => f.lessonId === u.checkpoint.id);
      const cooldownUntil = lastFail ? new Date(lastFail.createdAt.getTime() + 86400_000).toISOString() : null;
      const cpState: State | "cooldown" = cpPassed ? "passed" : lessonsDone && unitOpen ? (cooldownUntil ? "cooldown" : "next") : "locked";
      if (!cpPassed) open = false;
      const done = lessons.filter((l) => l.state === "passed").length + (cpPassed ? 1 : 0);
      if (done < lessons.length + 1 && currentUnit === COURSES[course].length) currentUnit = u.unit;
      return {
        n: u.unit, title: u.title, blurb: u.blurb, level: u.level, done, total: lessons.length + 1, lessons,
        checkpoint: { id: u.checkpoint.id, state: cpState, cooldownUntil },
      };
    });
    return Response.json({
      course, level: units.find((u) => u.n === currentUnit)?.level ?? "A0", units, currentUnit, nextLessonId,
      streak: st.streak, todayDone: st.todayDone, freezesRemaining: st.freezesRemaining, lives,
    });
  } catch (e) { return authFail(e); }
}
