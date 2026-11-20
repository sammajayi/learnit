"use client";
import { useEffect, useId, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "@/components/icons";
import { useApi } from "@/lib/useApi";
import { needsInstallFirst, pushSupported, PermissionDenied, subscribeThisDevice } from "@/lib/push";
import { Button, Notice, fieldClass } from "./ui";
import { cn } from "@/lib/cn";

type Settings = { available: boolean; subscribed: boolean; reminderHour: number };
const SNOOZE_KEY = "learnit.reminder-prompt-until";
const WEEK_MS = 7 * 86_400_000;
const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
const HOURS = Array.from({ length: 24 }, (_, h) => h);

/**
 * An invitation to turn on the daily reminder, shown where it makes sense: after a finished lesson, and on Home for people who
 * have already learned. Calm and optional: one button, a quiet "Not now" that hides it for a week, and nothing at all when
 * reminders are already on or the browser cannot do them. The full switch stays on the Profile page.
 */
export function ReminderPrompt({ enabled = true, className }: { enabled?: boolean; className?: string }) {
  const id = useId();
  const api = useApi();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["push"], queryFn: () => api<Settings>("/api/push/settings"), retry: false, enabled });
  const [snoozed, setSnoozed] = useState(true); // hidden until we have looked, so it never flashes
  const [hour, setHour] = useState<number | null>(null);
  const [changing, setChanging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [doneAt, setDoneAt] = useState<number | null>(null);
  useEffect(() => { try { setSnoozed(Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now()); } catch { setSnoozed(false); } }, []);

  const shell = cn("rounded-card border border-line bg-sunken p-4 text-left", className);

  if (doneAt !== null) {
    return (
      <section aria-label="Daily reminder" className={shell}>
        <p role="status" className="flex items-center gap-2 text-[15px] font-semibold text-ink"><Check size={20} aria-hidden className="text-sage-700" /> Reminder on for {hourLabel(doneAt)}</p>
        <p className="mt-1 text-sm text-muted">You can change the time or turn it off on your profile.</p>
      </section>
    );
  }
  if (!enabled || !data || !data.available || data.subscribed || snoozed) return null;
  const install = needsInstallFirst();
  if (!install && !pushSupported()) return null;
  const at = hour ?? data.reminderHour;

  async function turnOn() {
    setBusy(true); setErr(null);
    try {
      const subscription = await subscribeThisDevice();
      await api("/api/push/subscribe", { method: "POST", body: JSON.stringify({ subscription, reminderHour: at }) });
      setDoneAt(at);
      await qc.invalidateQueries({ queryKey: ["push"] });
    } catch (e) {
      setErr(e instanceof PermissionDenied ? "Notifications are blocked for this site. Allow them in your browser settings, then try again." : e instanceof Error ? e.message : "We could not turn on reminders. Try again in a moment.");
    } finally { setBusy(false); }
  }
  const notNow = () => { try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + WEEK_MS)); } catch { /* ignore */ } setSnoozed(true); };

  return (
    <section aria-labelledby={`${id}-t`} className={shell}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-sage-700"><Bell size={20} aria-hidden /></span>
        <div className="min-w-0">
          <h2 id={`${id}-t`} className="text-[15px] font-semibold text-ink">Get a daily reminder</h2>
          <p className="mt-1 text-pretty text-sm leading-relaxed text-ink-2">
            {install ? "On iPhone, add LearnIt to your Home Screen first (Share, then Add to Home Screen). Then come back to turn on reminders."
              : "One short nudge a day, at a time you choose. Skipped if you have already learned."}
          </p>
        </div>
      </div>

      {!install && changing && (
        <div className="mt-3">
          <label htmlFor={`${id}-h`} className="sr-only">Reminder time</label>
          <select id={`${id}-h`} value={at} onChange={(e) => setHour(Number(e.target.value))} className={cn(fieldClass, "h-11 w-auto py-0 pr-8")}>
            {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
          </select>
          <p className="mt-1.5 text-xs text-muted">In your own time zone.</p>
        </div>
      )}
      {err && <Notice tone="danger" className="mt-3">{err}</Notice>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!install && <Button variant="secondary" size="md" loading={busy} onClick={() => void turnOn()}>Remind me at {hourLabel(at)}</Button>}
        {!install && !changing && <Button variant="ghost" size="md" onClick={() => setChanging(true)}>Change time</Button>}
        <Button variant="ghost" size="md" onClick={notNow} disabled={busy}>Not now</Button>
      </div>
    </section>
  );
}
