import { getAddress } from "viem";
import { db } from "./db";
import { listCohortIds, readCohort, stakersOf, requiredDates } from "./cohorts";
import { isDue } from "./push";

/** Same default hour as the push reminder, so a staker who gets both hears from them together. */
export const RISK_REMINDER_HOUR = Number(process.env.RISK_REMINDER_HOUR || 18);

export type AtRiskUser = { id: string; email: string; course: string; today: string; daysLeft: number };

/** Everyone with a live stake who has not logged today's lesson yet and is due their evening check-in now.
 *  Scans only cohorts that are currently running (started, not ended, not voided) — before or after that
 *  window nothing is at risk today. */
export async function findAtRisk(now = new Date()): Promise<AtRiskUser[]> {
  const ids = await listCohortIds();
  const nowSec = now.getTime() / 1000;
  const out: AtRiskUser[] = [];
  for (const id of ids) {
    const c = await readCohort(id);
    if (!c || c.voided || nowSec < c.start || nowSec >= c.end) continue;
    const stakers = await stakersOf(id);
    if (stakers.size === 0) continue;
    const users = await db.user.findMany({
      where: { wallet: { in: [...stakers].map(getAddress) }, email: { not: null } },
      select: { id: true, email: true, course: true, timezone: true, riskEmailSentDate: true },
    });
    for (const user of users) {
      const { due, today } = isDue({ reminderHour: RISK_REMINDER_HOUR, lastSentDate: user.riskEmailSentDate }, user.timezone, now);
      if (!due) continue;
      if (!requiredDates(c.start, c.end, user.timezone).includes(today)) continue; // the cohort's own day boundary hasn't reached this user yet
      const done = await db.streakDay.findUnique({ where: { userId_date: { userId: user.id, date: today } } });
      if (done) continue;
      out.push({ id: user.id, email: user.email!, course: user.course, today, daysLeft: Math.max(0, Math.round((c.end - nowSec) / 86400)) });
    }
  }
  return out;
}

/** Plain, short copy naming exactly what is at stake. */
export function riskEmail(daysLeft: number, language: "fr" | "es") {
  const lang = language === "es" ? "Spanish" : "French";
  const left = daysLeft > 0 ? ` with ${daysLeft} day${daysLeft === 1 ? "" : "s"} left on the clock` : "";
  const url = `${(process.env.APP_URL || "https://www.uselearnit.xyz").replace(/\/$/, "")}/learn`;
  return {
    subject: "Your stake is at risk tonight",
    html: `<p>You haven't done today's ${lang} lesson yet, and you have an active stake running${left}. Missing today could cost you that stake when the challenge settles.</p><p><a href="${url}">Do today's lesson</a></p>`,
  };
}
