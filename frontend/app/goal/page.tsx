"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/useApi";
import { useMe } from "@/lib/useMe";
import { useGoal } from "@/lib/useGoal";
import { langOf } from "@/lib/languages";
import { cn } from "@/lib/cn";
import { fmtGD } from "@learnit/backend/format";
import { REASON_MAX, REASON_MIN } from "@learnit/backend/goal";
import { AppShell } from "@/components/AppShell";
import { VerifyCard } from "@/components/VerifyCard";
import { GasCard } from "@/components/GasCard";
import { useAuthGate } from "@/components/useAuthGate";
import { Button, Card, Label, Notice, PageHeader, fieldClass } from "@/components/ui";

type OpenCohort = { id: number; start: number; end: number; min: string; bonusBps: number; settled: boolean; voided: boolean; joinable: boolean; mine: { stake: string } | null };

const STARTERS = ["For travel", "For family", "For work", "For an exam", "For fun"];
const LENGTHS = [7, 14, 30] as const;
const lenOf = (c: OpenCohort) => Math.round((c.end - c.start) / 86400);

/** Set a goal: how long, why, then put the minimum behind it. Written after a first lesson, so it is not part of sign up. */
export default function Goal() {
  const ok = useAuthGate();
  const router = useRouter();
  const api = useApi();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: goal, isLoading: goalLoading } = useGoal();
  const { data: open } = useQuery({ queryKey: ["cohorts"], queryFn: () => api<{ cohorts: OpenCohort[] }>("/api/cohorts/open"), enabled: ok && !!me?.verified, retry: 1 });
  const [days, setDays] = useState<number>(7);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"stake" | "save" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Start from what they wrote before, so editing never means starting again.
  useEffect(() => { if (goal) { setDays(goal.goalDays); setReason(goal.reason); } }, [goal]);

  const cohorts = open?.cohorts ?? [];
  const running = cohorts.find((c) => !!c.mine && BigInt(c.mine.stake) > 0n && !c.settled && !c.voided);
  const joinable = cohorts.filter((c) => c.joinable && !(c.mine && BigInt(c.mine.stake) > 0n));
  const chosen = joinable.find((c) => lenOf(c) === days);
  const lang = langOf(me?.course).english;
  const trimmed = reason.trim();
  const reasonOk = trimmed.length >= REASON_MIN;
  const minLabel = chosen ? fmtGD(chosen.min, 0) : null;
  // The minimum, rounded up to 2 decimals so it is always inside the allowed range (same as the result screen prompt).
  const minParam = chosen ? String(Number((BigInt(chosen.min) + 10n ** 16n - 1n) / 10n ** 16n) / 100) : null;

  async function save(stake: boolean) {
    setBusy(stake ? "stake" : "save"); setErr(null);
    try {
      await api("/api/goal", { method: "PUT", body: JSON.stringify({ reason: trimmed, goalDays: days }) });
      await qc.invalidateQueries({ queryKey: ["goal"] });
      router.push(stake && minParam ? `/stake?amount=${minParam}&days=${days}` : "/home");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "We could not save your goal. Try again in a moment.");
      setBusy(null);
    }
  }

  if (!ok || goalLoading) return <AppShell><PageHeader title="Set a goal" /></AppShell>;

  return (
    <AppShell>
      <PageHeader title="Set a goal" description="Pick how long, say why, then put a stake behind it." />
      <div className="mt-6 grid max-w-xl gap-4">
        {me && !me.verified && <VerifyCard />}
        {me?.verified && !me.gasTopupDone && <GasCard />}

        <Card className="p-4">
          <fieldset>
            <legend className="text-sm font-medium text-ink">How long</legend>
            <div role="radiogroup" aria-label="How many days" className="mt-2 grid grid-cols-3 gap-2">
              {LENGTHS.map((L) => {
                const c = joinable.find((j) => lenOf(j) === L);
                const on = days === L;
                return (
                  <button key={L} type="button" role="radio" aria-checked={on} onClick={() => setDays(L)}
                    className={cn("rounded-input border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/15", on ? "border-ink bg-surface shadow-card" : "border-line bg-sunken hover:border-line-strong")}>
                    <span className="block text-[15px] font-semibold text-ink">{L} days</span>
                    <span className="block text-xs text-muted">{c ? (c.bonusBps > 0 ? `${c.bonusBps / 100}% bonus` : "No bonus") : "Goal only"}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="why">Why are you learning {lang}?</Label>
              <span className="tabular text-xs text-muted">{reason.length}/{REASON_MAX}</span>
            </div>
            <textarea id="why" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={REASON_MAX} rows={2} aria-describedby="why-help"
              className={cn(fieldClass, "mt-1.5 resize-none")} placeholder="For example: to talk to my gran without a translator." />
            <p id="why-help" className="mt-1 text-xs text-muted">We show this to you again on hard days.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {STARTERS.map((s) => (
                <button key={s} type="button" onClick={() => setReason(s)} className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink-2 transition hover:border-line-strong focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/15">{s}</button>
              ))}
            </div>
          </div>

          {running ? (
            <Notice tone="info" className="mt-4">You are already in a challenge. You can change your reason here any time.</Notice>
          ) : chosen && minLabel ? (
            <p className="mt-4 text-pretty text-sm leading-relaxed text-ink-2">
              You are putting {minLabel} G$ behind a {days} day streak. Finish all {days} days and it comes back to you{chosen.bonusBps > 0 ? `, plus a ${chosen.bonusBps / 100}% bonus` : ""}. Miss a day and you lose it.
            </p>
          ) : (
            <Notice tone="info" className="mt-4">No {days} day challenge is open yet. Save your goal now and stake when one opens.</Notice>
          )}

          {err && <Notice tone="danger" className="mt-3">{err}</Notice>}

          <div className="mt-4 grid gap-2">
            {!running && chosen && minLabel && (
              <Button block loading={busy === "stake"} disabled={!reasonOk || !me?.verified || busy !== null} onClick={() => save(true)}>Save and stake {minLabel} G$</Button>
            )}
            <Button block variant={!running && chosen ? "ghost" : "primary"} loading={busy === "save"} disabled={!reasonOk || busy !== null} onClick={() => save(false)}>Save for now</Button>
          </div>
          {!me?.verified && <p className="mt-2 text-xs text-muted">Staking needs a GoodDollar face check. You can save your goal without it.</p>}
        </Card>
      </div>
    </AppShell>
  );
}
