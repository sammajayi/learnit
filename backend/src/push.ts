import webpush from "web-push";
import { localDate } from "./streak";

let configured = false;
/** Returns false when the VAPID keys are not set, so callers can answer "not available" instead of crashing. */
export function configurePush(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://github.com/sammajayi/learnit", pub, priv);
  configured = true;
  return true;
}

export const send = webpush.sendNotification;

/** The hour (0-23) it is right now in a timezone. */
export function hourIn(timeZone: string, now = new Date()): number {
  try {
    const h = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(now);
    return Number(h);
  } catch { return now.getUTCHours(); }
}

/** A reminder is due when it is the chosen hour for that person and they were not already reminded today. */
export function isDue(sub: { reminderHour: number; lastSentDate: string | null }, timeZone: string, now = new Date()): { due: boolean; today: string } {
  const today = localDate(now, timeZone);
  return { due: hourIn(timeZone, now) === sub.reminderHour && sub.lastSentDate !== today, today };
}

export type Reminder = { title: string; body: string; url: string; tag: string };

/** Plain, short copy. A live streak gets the stronger nudge. */
export function reminderFor(streak: number, language: "fr" | "es"): Reminder {
  const lang = language === "es" ? "Spanish" : "French";
  if (streak > 0) return { title: `Keep your ${streak}-day streak`, body: `Today's ${lang} lesson takes about ten minutes.`, url: "/learn", tag: "daily-reminder" };
  return { title: "Time for today's lesson", body: `A short ${lang} lesson, and your daily G$ is waiting.`, url: "/home", tag: "daily-reminder" };
}
