"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronDown, Loader2 } from "@/components/icons";
import { useApi } from "@/lib/useApi";
import { needsInstallFirst, pushSupported, PermissionDenied, subscribeThisDevice, unsubscribeThisDevice } from "@/lib/push";
import { cn } from "@/lib/cn";

type Settings = { available: boolean; subscribed: boolean; reminderHour: number };
const HOURS = Array.from({ length: 24 }, (_, h) => ({ h, label: new Date(2000, 0, 1, h).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" }) }));

/** The daily reminder as one settings row: a switch and a time. It is sent at that hour in the learner's own timezone. */
export function ReminderRow() {
  const api = useApi();
  const qc = useQueryClient();
  const { data, isError } = useQuery({ queryKey: ["push"], queryFn: () => api<Settings>("/api/push/settings"), retry: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const label = (
    <span className="flex min-w-0 items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-input bg-sunken text-ink-2"><Bell size={18} strokeWidth={1.85} aria-hidden /></span>
      <span className="min-w-0 text-sm font-medium text-ink">Daily reminder <span className="font-normal text-muted">(skipped if you&apos;ve learned)</span></span>
    </span>
  );
  const note = (text: string) => <div className="px-5 py-4">{label}<p className="mt-2 pl-12 text-sm text-muted">{text}</p></div>;

  if (isError || (data && !data.available)) return note("Reminders are off right now. Try again later.");
  if (!data) return <div className="h-[68px]" aria-hidden />;
  if (needsInstallFirst()) return note("Add LearnIt to your Home Screen first (Share, then Add to Home Screen).");
  if (!pushSupported()) return note("This browser can't send notifications. Try Chrome or Safari.");
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
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        {label}
        <div className="flex shrink-0 items-center gap-3">
          <div className="relative">
            <select aria-label="Reminder time" value={hour} onChange={(e) => void changeHour(Number(e.target.value))} className="h-9 appearance-none rounded-input border border-line bg-surface pl-3 pr-8 text-sm text-ink">
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
      {err && <p role="alert" className="mt-3 text-sm text-coral-700">{err}</p>}
    </div>
  );
}
