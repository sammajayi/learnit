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

/** Branded HTML, inline-styled and table-based so it renders consistently across email clients
 *  (including Outlook, which ignores most modern CSS). Plain and short: what's at risk, how long is
 *  left, one clear action. */
export function riskEmail(daysLeft: number, language: "fr" | "es") {
  const lang = language === "es" ? "Spanish" : "French";
  const left = daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in the challenge` : "last day of the challenge";
  const url = `${(process.env.APP_URL || "https://www.uselearnit.xyz").replace(/\/$/, "")}/learn`;
  const subject = "Your stake is at risk tonight";
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f2;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#16a34a;padding:20px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.2px;">LearnIt</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#b45309;text-transform:uppercase;letter-spacing:0.4px;">Stake at risk</p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827;">You haven't done today's ${lang} lesson yet</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">You have an active stake riding on this challenge, with ${left}. Missing today could cost you that stake when the challenge settles.</p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px;background:#16a34a;">
                      <a href="${url}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Do today's lesson</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#9ca3af;">It only takes a minute. This is a one-time evening check-in sent only on days a staked challenge is still open and today isn't done yet.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  return { subject, html };
}
