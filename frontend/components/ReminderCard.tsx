"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronDown, Loader2 } from "@/components/icons";
import { useApi } from "@/lib/useApi";
import { needsInstallFirst, pushSupported, PermissionDenied, subscribeThisDevice, unsubscribeThisDevice } from "@/lib/push";
import { Sk } from "./Skeletons";
import { Card, Notice } from "./ui";
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

  const head = <h2 id="reminder" className="flex items-center gap-2 text-[15px] font-semibold text-ink"><Bell size={16} strokeWidth={2} aria-hidden /> Daily reminder</h2>;
  if (isError) return <Card className="p-4">{head}<p className="mt-1 text-sm text-muted">Reminders are not available right now.</p></Card>;
  if (!data) return <Sk className="h-[68px] w-full rounded-card" />;

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
    <Card className="p-4" aria-labelledby="reminder" role="region">
      {data.available && !installFirst && supported ? (
        <div className="flex items-center justify-between gap-3">
          {head}
          <div className="flex shrink-0 items-center gap-3">
            <div className="relative">
              <select id="remind-at" aria-label="Reminder time" value={hour} onChange={(e) => void changeHour(Number(e.target.value))} className="h-9 appearance-none rounded-input border border-line bg-surface pl-3 pr-8 text-sm text-ink">
                {HOURS.map(({ h, label }) => <option key={h} value={h}>{label}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            </div>
            <button role="switch" aria-checked={data.subscribed} aria-label="Daily reminder" disabled={busy} onClick={() => (data.subscribed ? turnOff() : turnOn())}
              className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60", data.subscribed ? "bg-sage-600" : "bg-line-strong")}>
              <span className={cn("absolute top-0.5 grid h-5 w-5 place-items-center rounded-full bg-white shadow-card transition-[left] duration-200 ease-soft", data.subscribed ? "left-[18px]" : "left-0.5")}>
                {busy && <Loader2 className="animate-spin text-muted" size={11} aria-hidden />}
              </span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {head}
          <p className="mt-1 text-pretty text-sm leading-relaxed text-muted">
            {!data.available ? "Reminders are not available right now." : installFirst ? "On iPhone, add LearnIt to your Home Screen first (Share, then Add to Home Screen). Then come back here to turn on reminders." : "This browser does not support notifications."}
          </p>
        </>
      )}
      {err && <Notice tone="danger" className="mt-3">{err}</Notice>}
    </Card>
  );
}
