"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "@/components/icons";
import { fmtGD } from "@learnit/backend/format";
import { Badge, Card, CardHeader } from "@/components/ui";
import { Sk } from "@/components/ui/Sk";
import { cohortStatus, useCohorts, usePool, usePublicStats, useVaultPaused } from "@/components/admin/data";
import { AdminHeader, ErrorNote, axisDuration, dayLabel, fillActivity, fillDays, fmtDuration, gdNum } from "@/components/admin/bits";
import { BarChart, Delta, HBars, Sparkline, delta } from "@/components/admin/charts";

const num = (n: number | null | undefined) => (n === null || n === undefined ? "n/a" : n.toLocaleString("en-GB"));
const gdText = (v: number) => `${v.toLocaleString("en", { maximumFractionDigits: v < 10 ? 2 : 0 })} G$`;

/** One headline number with its 14-day shape and week-on-week change. The chart is optional so a tile still works before trend data exists. */
function Kpi({ label, value, unit, series, summary, hint }: { label: string; value: string; unit?: string; series?: number[]; summary: string; hint?: string }) {
  const d = series ? delta(series) : null;
  return (
    <div className="min-w-0">
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="tabular mt-0.5 truncate text-2xl font-semibold tracking-[-0.02em] text-ink">{value}{unit && <span className="ml-1 text-sm font-medium text-muted">{unit}</span>}</p>
      {series && <div className="mt-2"><Sparkline values={series.slice(-14)} summary={summary} /></div>}
      <div className="mt-1 min-h-4">{d ? <Delta pct={d.pct} /> : hint && <span className="text-xs text-muted">{hint}</span>}</div>
    </div>
  );
}

export default function Overview() {
  const [metric, setMetric] = useState<"learners" | "time">("learners");
  const stats = usePublicStats();
  const cohorts = useCohorts();
  const pool = usePool();
  const vaultPaused = useVaultPaused();
  const now = Math.floor(Date.now() / 1000);
  const s = stats.data;

  const live = (cohorts.data ?? []).filter((c) => ["open", "running"].includes(cohortStatus(c, now)));
  const toFinalize = (cohorts.data ?? []).filter((c) => ["finalize", "settle"].includes(cohortStatus(c, now)));
  const upcoming = (cohorts.data ?? []).filter((c) => cohortStatus(c, now) === "upcoming");
  const staked = live.reduce((t, c) => t + c.pot, 0n);

  // Things that need a person, most urgent first.
  const attention: { key: string; text: string; href: string }[] = [];
  if (toFinalize.length) attention.push({ key: "fin", text: `${toFinalize.length === 1 ? `Challenge ${toFinalize[0].id} has` : `${toFinalize.length} challenges have`} ended and need finalising.`, href: "/admin/challenges" });
  if (vaultPaused.data) attention.push({ key: "vp", text: "Staking is paused.", href: "/admin/challenges" });
  if (pool.data?.paused) attention.push({ key: "pp", text: "Reward payouts are paused.", href: "/admin/pool" });
  if (pool.data && pool.data.balance < pool.data.dailyBudget) attention.push({ key: "low", text: "The rewards pool holds less than one day's budget.", href: "/admin/pool" });
  if (cohorts.data && !live.length && !upcoming.length) attention.push({ key: "none", text: "No challenge is open or scheduled.", href: "/admin/challenges" });

  const ubiDays = s ? fillDays(s.ubi.days, 30) : [];
  const ubiSeries = ubiDays.map((d) => gdNum(d.total));
  const act = s?.activity ? fillActivity(s.activity, 30) : null;

  const funnel = s ? [
    { label: "Signed up", value: s.users.total, note: `${num(s.users.newLast7d)} new this week` },
    ...(s.users.verified !== null ? [{ label: "GoodDollar-verified", value: s.users.verified }] : []),
    { label: "Active in 30 days", value: s.users.active30d },
    { label: "Passed a lesson", value: s.learning.learnersWithPass, note: `${num(s.learning.passed)} lessons passed from ${num(s.learning.attempts)} attempts` },
  ].map((r) => ({ ...r, note: r.note ?? (s.users.total && r.label !== "Signed up" ? `${Math.round((r.value / s.users.total) * 100)}% of people who signed up` : undefined) })) : [];

  return (
    <div className="grid gap-4">
      <AdminHeader title="Overview" hint="Totals only, no personal data." />

      <section aria-labelledby="attention">
        <h2 id="attention" className="sr-only">Needs attention</h2>
        {cohorts.isLoading || pool.isLoading ? <Sk className="h-10 rounded-input" /> : attention.length ? (
          <ul className="grid gap-2">
            {attention.map((a) => (
              <li key={a.key}>
                <Link href={a.href} className="group flex items-center justify-between gap-3 rounded-input border border-coral-100 bg-coral-50 px-3 py-2 text-sm text-coral-700 transition hover:border-coral-300">
                  <span className="font-medium">{a.text}</span>
                  <ArrowRight size={16} aria-hidden className="shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted"><CheckCircle2 size={16} className="text-sage-600" aria-hidden />Nothing needs attention. Challenges are running and the pool is paying out.</p>
        )}
      </section>

      <ErrorNote error={stats.error} />

      <Card className="grid gap-x-6 gap-y-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.isLoading ? [0, 1, 2, 3].map((i) => <Sk key={i} className="h-24 rounded-input" />) : s ? (
          <>
            <Kpi label="People" value={num(s.users.total)} series={act?.map((a) => a.signups)} summary="New people per day, last 14 days" hint={`${num(s.users.newLast7d)} new this week`} />
            <Kpi label="Active learners" value={num(s.users.active7d)} unit="this week" series={act?.map((a) => a.active)} summary="Learners per day, last 14 days" hint={`${num(s.users.active1d)} today, ${num(s.users.active30d)} in 30 days`} />
            <Kpi label="Lessons passed" value={num(s.learning.passed)} series={act?.map((a) => a.passed)} summary="Lessons passed per day, last 14 days" hint={`${num(s.learning.learnersWithPass)} learners`} />
            <Kpi label="UBI claimed" value={fmtGD(s.ubi.allTime.total)} unit="G$" series={ubiSeries} summary="G$ claimed per day, last 14 days" />
          </>
        ) : <p className="text-sm text-muted sm:col-span-2 lg:col-span-4">Numbers are unavailable right now.</p>}
      </Card>

      {s?.gUsed && (
        <Card className="p-4">
          <CardHeader title="G$ used" description="All time." />
          <dl className="mt-3 grid gap-4 sm:grid-cols-[1.3fr_1fr_1fr_1fr] sm:items-end">
            <div className="min-w-0">
              <dt className="text-[13px] font-medium text-muted">Total</dt>
              <dd className="font-mono tabular mt-1 truncate text-3xl font-semibold tracking-[-0.02em] text-ink">{s.gUsed.total !== null ? fmtGD(s.gUsed.total) : "n/a"}{s.gUsed.total !== null && <span className="ml-1 text-sm font-medium text-muted">G$</span>}</dd>
            </div>
            {([["UBI claimed", s.gUsed.ubi], ["Rewards paid out", s.gUsed.rewards], ["Staked", s.gUsed.staked]] as const).map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-[13px] font-medium text-muted">{k}</dt>
                <dd className="font-mono tabular mt-1 truncate text-xl font-semibold tracking-[-0.02em] text-ink">{v !== null ? fmtGD(v) : "n/a"}{v !== null && <span className="ml-1 text-sm font-medium text-muted">G$</span>}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-4">
          <CardHeader title="UBI claimed per day" description="Last 14 days, UTC."
            action={s && <Link href="/admin/ubi" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-ink underline-offset-4 hover:underline">Details <ArrowRight size={14} aria-hidden /></Link>} />
          <div className="mt-3">
            {s ? <BarChart values={ubiSeries.slice(-14)} labels={ubiDays.slice(-14).map((d) => dayLabel(d.day))} format={gdText} caption="claimed" /> : stats.isLoading ? <Sk className="h-40" /> : <p className="text-sm text-muted">Numbers are unavailable right now.</p>}
          </div>
        </Card>

        <Card className="p-4">
          <CardHeader title="From sign-up to learning" />
          <div className="mt-3">{s ? <HBars rows={funnel} max={Math.max(s.users.total, 1)} /> : stats.isLoading ? <Sk className="h-40" /> : null}</div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-4">
          <CardHeader title={metric === "learners" ? "Learners per day" : "Time spent learning per day"} description="Last 14 days, UTC."
            action={
              <div role="tablist" aria-label="Chart metric" className="inline-flex shrink-0 rounded-input border border-line p-0.5 text-xs font-medium">
                {([["learners", "Learners"], ["time", "Time"]] as const).map(([k, l]) => (
                  <button key={k} role="tab" type="button" aria-selected={metric === k} onClick={() => setMetric(k)}
                    className={`rounded-md px-2.5 py-1 transition-colors ${metric === k ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>{l}</button>
                ))}
              </div>
            } />
          <div className="mt-3">
            {metric === "learners"
              ? act ? <BarChart values={act.slice(-14).map((a) => a.active)} labels={act.slice(-14).map((a) => dayLabel(a.day))} format={(v) => `${v.toLocaleString("en-GB")} ${v === 1 ? "learner" : "learners"}`} caption="active" />
                : stats.isLoading ? <Sk className="h-40" /> : <p className="text-sm text-muted">Daily learner counts appear once the stats service is updated.</p>
              : act && s?.learning.totalSeconds !== undefined ? <BarChart values={act.slice(-14).map((a) => a.seconds ?? 0)} labels={act.slice(-14).map((a) => dayLabel(a.day))} format={fmtDuration} axis={axisDuration} caption="learning" />
                : stats.isLoading ? <Sk className="h-40" /> : <p className="text-sm text-muted">Learning time appears once the stats service is updated.</p>}
          </div>
        </Card>

        <Card className="p-4">
          <CardHeader title="On-chain now" />
          {stats.isLoading || pool.isLoading || cohorts.isLoading ? <div className="mt-3 grid gap-3">{[0, 1, 2].map((i) => <Sk key={i} className="h-12 rounded-input" />)}</div> : (
            <dl className="tabular mt-3 grid gap-4">
              <div>
                <dt className="text-[13px] font-medium text-muted">Rewards pool</dt>
                <dd className="mt-1 text-xl font-semibold tracking-[-0.02em] text-ink">{pool.data ? fmtGD(pool.data.balance) : "n/a"}{pool.data && <span className="ml-1 text-sm font-medium text-muted">G$</span>}</dd>
                <dd className="mt-0.5 text-xs text-muted">{pool.data ? `${fmtGD(pool.data.spentToday)} G$ paid out today` : "Not set up"}</dd>
              </div>
              <div>
                <dt className="text-[13px] font-medium text-muted">Staked now</dt>
                <dd className="mt-1 text-xl font-semibold tracking-[-0.02em] text-ink">{fmtGD(staked)}<span className="ml-1 text-sm font-medium text-muted">G$</span></dd>
                <dd className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                  {vaultPaused.isLoading ? <Sk className="h-5 w-16 rounded-full" /> : <Badge tone={vaultPaused.data ? "coral" : "sage"} icon={vaultPaused.data ? undefined : CheckCircle2}>{vaultPaused.data ? "Staking paused" : "Staking running"}</Badge>}
                  {live.length} live {live.length === 1 ? "challenge" : "challenges"}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] font-medium text-muted">UBI claimed today</dt>
                <dd className="mt-1 text-xl font-semibold tracking-[-0.02em] text-ink">{s ? fmtGD(s.ubi.today.total) : "n/a"}{s && <span className="ml-1 text-sm font-medium text-muted">G$</span>}</dd>
                {s && <dd className="mt-0.5 text-xs text-muted">{num(s.ubi.today.claimers)} people</dd>}
              </div>
            </dl>
          )}
        </Card>
      </div>

      <div className="grid gap-4">
        <Card className="p-4">
          <CardHeader title="Learning time" description="Finished lessons and checkpoints. A lesson left open counts for 30 minutes at most." />
          {stats.isLoading ? <div className="mt-3 grid gap-3">{[0, 1, 2].map((i) => <Sk key={i} className="h-12 rounded-input" />)}</div> : s?.learning.totalSeconds !== undefined ? (
            <dl className="tabular mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-[13px] font-medium text-muted">Total</dt>
                <dd className="mt-1 text-xl font-semibold tracking-[-0.02em] text-ink">{fmtDuration(s.learning.totalSeconds)}</dd>
              </div>
              <div>
                <dt className="text-[13px] font-medium text-muted">Per learner</dt>
                <dd className="mt-1 text-xl font-semibold tracking-[-0.02em] text-ink">{s.learning.attemptingLearners ? fmtDuration(s.learning.totalSeconds / s.learning.attemptingLearners) : "n/a"}</dd>
                <dd className="mt-0.5 text-xs text-muted">{num(s.learning.attemptingLearners)} people have tried a lesson</dd>
              </div>
              <div>
                <dt className="text-[13px] font-medium text-muted">Per lesson</dt>
                <dd className="mt-1 text-xl font-semibold tracking-[-0.02em] text-ink">{s.learning.attempts ? fmtDuration(s.learning.totalSeconds / s.learning.attempts) : "n/a"}</dd>
                <dd className="mt-0.5 text-xs text-muted">{num(s.learning.attempts)} attempts</dd>
              </div>
            </dl>
          ) : <p className="mt-5 text-sm text-muted">Numbers are unavailable right now.</p>}
        </Card>
      </div>
    </div>
  );
}
