"use client";
import { useState } from "react";
import { fmtGD } from "@learnit/backend/format";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { DAY, cohortStatus, type Cohort, type CohortStatus } from "./data";
import { CopyCommand, when } from "./bits";

const STATUS: Record<CohortStatus, { label: string; tone: "sage" | "coral" | "neutral" | "navy" }> = {
  upcoming: { label: "Upcoming", tone: "navy" }, open: { label: "Open to join", tone: "sage" }, running: { label: "Running", tone: "sage" },
  finalize: { label: "Needs finalizing", tone: "coral" }, settled: { label: "Settled", tone: "neutral" },
};
const SHOWN = 6;
const axisDate = (s: number) => new Date(s * 1000).toLocaleDateString("en", { month: "short", day: "numeric" });

/**
 * One bar per challenge on a shared calendar, so overlaps, gaps and the length of each run are visible at a glance.
 * Light sage is the join window (first day), solid sage the rest of the run. Coral marks a challenge waiting to be finalized.
 */
export function CohortTimeline({ cohorts, now, canAct = false }: { cohorts: Cohort[]; now: number; canAct?: boolean }) {
  const [all, setAll] = useState(false);
  const rows = all ? cohorts : cohorts.slice(0, SHOWN);

  const lo = Math.min(...rows.map((c) => c.start), now);
  const hi = Math.max(...rows.map((c) => c.end), now);
  const pad = Math.max((hi - lo) * 0.03, DAY / 4);
  const from = lo - pad, span = hi + pad - from;
  const x = (t: number) => `${((t - from) / span) * 100}%`;
  const w = (a: number, b: number) => `${((b - a) / span) * 100}%`;
  const ticks = [0, 1, 2, 3].map((i) => from + (span * i) / 3);

  return (
    <div>
      <div>
        <ul className="grid gap-5">
          {rows.map((c) => {
            const status = cohortStatus(c, now);
            const st = STATUS[status];
            const joinEnd = Math.min(c.start + DAY, c.end);
            const length = Math.round((c.end - c.start) / DAY);
            return (
              <li key={c.id} className="grid gap-2">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <div className="flex items-center gap-2.5">
                    <p className="font-semibold text-ink">Challenge {c.id}</p>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <p className="tabular text-sm text-ink-2">Pot <span className="font-medium text-ink">{fmtGD(c.pot)} G$</span></p>
                </div>
                <div className="relative h-3.5 rounded-full bg-sunken" role="img"
                  aria-label={`Challenge ${c.id}, ${length} days, ${when(c.start)} to ${when(c.end)}. ${st.label}.`}>
                  {status === "upcoming" ? (
                    <div className="absolute inset-y-0 rounded-full border border-dashed border-sage-500 bg-sage-50" style={{ left: x(c.start), width: w(c.start, c.end) }} />
                  ) : (
                    <>
                      <div className={cn("absolute inset-y-0 rounded-l-full", status === "settled" ? "bg-line-strong" : "bg-sage-300")} style={{ left: x(c.start), width: w(c.start, joinEnd) }} />
                      <div className={cn("absolute inset-y-0 rounded-r-full", status === "settled" ? "bg-muted" : status === "finalize" ? "bg-coral-500" : "bg-sage-600")} style={{ left: x(joinEnd), width: w(joinEnd, c.end) }} />
                    </>
                  )}
                  <div className="pointer-events-none absolute -inset-y-1 w-0.5 rounded-full bg-ink" style={{ left: x(now) }} aria-hidden />
                </div>
                <p className="tabular text-xs text-muted">
                  {when(c.start)} to {when(c.end)} ({length} days). Stake {fmtGD(c.min)} to {fmtGD(c.max)} G$.
                </p>
                {canAct && status === "finalize" && <CopyCommand command={`npx tsx --env-file=.env scripts/finalize-cohort.mts ${c.id} --send`} />}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="relative mt-4 h-4 border-t border-line pt-1.5 text-[11px] text-muted tabular" aria-hidden>
        {ticks.map((t, i) => <span key={i} className={cn("absolute whitespace-nowrap", i === 0 ? "left-0" : i === 3 ? "right-0" : "-translate-x-1/2")} style={i === 0 || i === 3 ? undefined : { left: x(t) }}>{axisDate(t)}</span>)}
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-muted"><span className="inline-block h-3 w-0.5 rounded-full bg-ink" aria-hidden />Now. Light bar: people can still join.</p>

      {cohorts.length > SHOWN && (
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => setAll((v) => !v)}>{all ? "Show recent only" : `Show all ${cohorts.length} challenges`}</Button>
      )}
    </div>
  );
}
