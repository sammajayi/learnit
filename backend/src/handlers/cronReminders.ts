import { timingSafeEqual } from "node:crypto";
import { db } from "../db";
import { configurePush, isDue, reminderFor, send } from "../push";
import { streakCount } from "../streak";
import { configureEmail, sendEmail } from "../email";
import { findAtRisk, riskEmail } from "../stakeRisk";

const authorized = (req: Request) => {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  if (!secret) return false;
  const want = `Bearer ${secret}`;
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
};

/**
 * Run every hour by .github/workflows/reminders.yml (sends Authorization: Bearer CRON_SECRET).
 * Push: sends today's reminder to anyone whose chosen hour it is, who has not learned yet today.
 * Email: separately warns anyone with a live stake who has not learned today and is due their evening
 * check-in, whether or not they also have a push subscription. Each channel is independently optional.
 */
export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const push = configurePush() ? await sendPushReminders() : { note: "push not configured" };
  const email = configureEmail() ? await sendRiskEmails() : { note: "email not configured" };
  return Response.json({ push, email });
}

async function sendPushReminders() {
  const subs = await db.pushSubscription.findMany({ include: { user: { select: { id: true, timezone: true, course: true } } } });
  const due = subs.map((s) => ({ s, ...isDue(s, s.user.timezone) })).filter((x) => x.due);
  if (due.length === 0) return { checked: subs.length, due: 0, sent: 0, skipped: 0, removed: 0, failed: 0 };

  // Who already learned today, and what is their streak? One query for everyone due.
  const userIds = [...new Set(due.map((d) => d.s.userId))];
  const days = await db.streakDay.findMany({ where: { userId: { in: userIds } }, select: { userId: true, date: true } });
  const byUser = new Map<string, string[]>();
  for (const d of days) byUser.set(d.userId, [...(byUser.get(d.userId) ?? []), d.date]);

  let sent = 0, skipped = 0, removed = 0, failed = 0;
  for (const { s, today } of due) {
    const dates = byUser.get(s.userId) ?? [];
    if (dates.includes(today)) { skipped++; await db.pushSubscription.update({ where: { id: s.id }, data: { lastSentDate: today } }); continue; }
    const payload = reminderFor(streakCount(dates, today), s.user.course === "es" ? "es" : "fr");
    try {
      await send({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3 * 3600, urgency: "normal" });
      await db.pushSubscription.update({ where: { id: s.id }, data: { lastSentDate: today } });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) { await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {}); removed++; } // the device unsubscribed
      else { failed++; console.error("push failed", code); }
    }
  }
  return { checked: subs.length, due: due.length, sent, skipped, removed, failed };
}

async function sendRiskEmails() {
  const atRisk = await findAtRisk();
  let sent = 0, failed = 0;
  for (const u of atRisk) {
    const { subject, html } = riskEmail(u.daysLeft, u.course === "es" ? "es" : "fr");
    try {
      await sendEmail(u.email, subject, html);
      await db.user.update({ where: { id: u.id }, data: { riskEmailSentDate: u.today } });
      sent++;
    } catch (e) {
      failed++; // leave riskEmailSentDate untouched so the next hourly run retries
      console.error("risk email failed", e instanceof Error ? e.message : e);
    }
  }
  return { due: atRisk.length, sent, failed };
}
