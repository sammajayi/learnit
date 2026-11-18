"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronDown, Loader2 } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { needsInstallFirst, pushSupported, PermissionDenied, subscribeThisDevice, unsubscribeThisDevice } from "@/lib/push";
import { Sk } from "./Skeletons";
import { Card, Label, Notice, fieldClass } from "./ui";
import { cn } from "@/lib/cn";

type Settings = { available: boolean; subscribed: boolean; reminderHour: number };
const HOURS = Array.from({ length: 24 }, (_, h) => ({ h, label: new Date(2000, 0, 1, h).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" }) }));

/** Daily reminder: a switch and a time. The reminder is sent at that hour in the learner's own timezone. */
export function ReminderCard() {
  const api = useApi();
  const qc = useQueryClient();
  const { data, isError } = useQuery({ queryKey: ["push"], queryFn: () => api<Settings>("/api/push/settings"), retry: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const head = <h2 id="reminder" className="flex items-center gap-2 text-[15px] font-semibold text-ink"><Bell size={17} strokeWidth={2} aria-hidden /> Daily reminder</h2>;
  if (isError) return <Card className="p-6">{head}<p className="mt-3 text-sm text-muted">Reminders aren&apos;t available right now.</p></Card>;
  if (!data) return <Sk className="h-[200px] w-full rounded-card" />;

  const supported = pushSupported();
  const installFirst = needsInstallFirst();
  const hour = data.reminderHour;

  async function turnOn() {
    setBusy(true); setErr(null);
    try {
      const subscription = await subscribeThisDevice();
      await api("/api/push/subscribe", { method: "POST", body: JSON.stringify({ subscription, reminderHour: hour }) });
      await qc.invalidateQueries({ queryKey: ["push"] });
    } catch (e) {
      setErr(e instanceof PermissionDenied ? "Notifications are blocked for this site. Allow them in your browser settings, then try again." : e instanceof Error ? e.message : "We could not turn on reminders. Try again in a moment.");
    } finally { setBusy(false); }
  }
  async function turnOff() {
    setBusy(true); setErr(null);
    try { await api("/api/push/subscribe", { method: "DELETE", body: JSON.stringify({}) }); await unsubscribeThisDevice(); await qc.invalidateQueries({ queryKey: ["push"] }); }
    catch (e) { setErr(e instanceof Error ? e.message : "We could not turn off reminders. Try again in a moment."); }
    finally { setBusy(false); }
  }
  async function changeHour(h: number) {
    qc.setQueryData<Settings>(["push"], { ...data!, reminderHour: h });
    if (data!.subscribed) await api("/api/push/subscribe", { method: "PATCH", body: JSON.stringify({ reminderHour: h }) }).catch(() => qc.invalidateQueries({ queryKey: ["push"] }));
  }

  return (
    <Card className="p-6" aria-labelledby="reminder" role="region">
      {head}
      {!data.available ? (
        <p className="mt-3 text-sm text-muted">Reminders aren&apos;t available right now.</p>
      ) : installFirst ? (
        <p className="mt-3 text-pretty text-sm leading-relaxed text-muted">On iPhone, add LearnIt to your Home Screen first (Share, then Add to Home Screen). Then come back here to turn on reminders.</p>
      ) : !supported ? (
        <p className="mt-3 text-sm text-muted">This browser doesn&apos;t support notifications.</p>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink">Remind me to learn</p>
              <p className="mt-0.5 text-pretty text-sm text-muted">One short nudge a day. Skipped if you&apos;ve already learned.</p>
            </div>
            <button role="switch" aria-checked={data.subscribed} aria-label="Daily reminder" disabled={busy} onClick={() => (data.subscribed ? turnOff() : turnOn())}
              className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60", data.subscribed ? "bg-sage-600" : "bg-line-strong")}>
              <span className={cn("absolute top-0.5 grid h-6 w-6 place-items-center rounded-full bg-white shadow-card transition-[left] duration-200 ease-soft", data.subscribed ? "left-[22px]" : "left-0.5")}>
                {busy && <Loader2 className="animate-spin text-muted" size={13} aria-hidden />}
              </span>
            </button>
          </div>
          <div className="mt-5">
            <Label htmlFor="remind-at">Time</Label>
            <div className="relative mt-2">
              <select id="remind-at" value={hour} onChange={(e) => void changeHour(Number(e.target.value))} className={cn(fieldClass, "appearance-none pr-10")}>
                {HOURS.map(({ h, label }) => <option key={h} value={h}>{label}</option>)}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            </div>
            <p className="mt-1.5 text-xs text-muted">In your own timezone.</p>
          </div>
        </>
      )}
      {err && <Notice tone="danger" className="mt-4">{err}</Notice>}
    </Card>
  );
}
