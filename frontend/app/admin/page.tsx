"use client";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { fmtGD } from "@learnit/backend/format";
import { Badge, Card, CardHeader, Notice, PageHeader } from "@/components/ui";
import { Sk } from "@/components/ui/Sk";
import { useAdmin } from "@/components/admin/AdminProvider";
import { cohortStatus, useCohorts, usePool, usePublicStats, useVaultPaused } from "@/components/admin/data";
import { ErrorNote, dayLabel, fillActivity, fillDays, gdNum } from "@/components/admin/bits";
import { BarChart, Delta, HBars, Sparkline, delta } from "@/components/admin/charts";

const num = (n: number | null | undefined) => (n === null || n === undefined ? "n/a" : n.toLocaleString("en"));
const gdText = (v: number) => `${v.toLocaleString("en", { maximumFractionDigits: v < 10 ? 2 : 0 })} G$`;

/** One headline number with its 14-day shape and week-on-week change. The chart is optional so a tile still works before trend data exists. */
function Kpi({ label, value, unit, series, summary, hint }: { label: string; value: string; unit?: string; series?: number[]; summary: string; hint?: string }) {
  const d = series ? delta(series) : null;
  return (
    <div className="min-w-0">
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="tabular mt-1 truncate text-2xl font-semibold tracking-[-0.02em] text-ink">{value}{unit && <span className="ml-1 text-sm font-medium text-muted">{unit}</span>}</p>
      {series && <div className="mt-3"><Sparkline values={series.slice(-14)} summary={summary} /></div>}
      <div className="mt-2 min-h-4">{d ? <Delta pct={d.pct} /> : hint && <span className="text-xs text-muted">{hint}</span>}</div>
    </div>
  );
}

export default function Overview() {
  const { address } = useAdmin();
  const stats = usePublicStats();
  const cohorts = useCohorts();
  const pool = usePool();
  const vaultPaused = useVaultPaused();
  const now = Math.floor(Date.now() / 1000);
  const s = stats.data;

  const live = (cohorts.data ?? []).filter((c) => ["open", "running"].includes(cohortStatus(c, now)));
  const toFinalize = (cohorts.data ?? []).filter((c) => cohortStatus(c, now) === "finalize");
  const upcoming = (cohorts.data ?? []).filter((c) => cohortStatus(c, now) === "upcoming");
  const staked = live.reduce((t, c) => t + c.pot, 0n);

  // Things that need a person, most urgent first.
  const attention: { key: string; text: string; href: string }[] = [];
  if (toFinalize.length) attention.push({ key: "fin", text: `${toFinalize.length === 1 ? `Challenge ${toFinalize[0].id} has` : `${toFinalize.length} challenges have`} ended and need finalizing.`, href: "/admin/challenges" });
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
    <div className="grid gap-8">
      <PageHeader title="Overview" description="LearnIt's public performance dashboard: people, G$ claimed and on-chain activity. Totals only, no personal data." />

      {/* Operator to-do list. Visitors see the numbers, not the warnings, so it only shows once a wallet is connected. */}
      {address && <section aria-labelledby="attention">
        <h2 id="attention" className="sr-only">Needs attention</h2>
        {cohorts.isLoading || pool.isLoading ? <Sk className="h-14 rounded-input" /> : attention.length ? (
          <ul className="grid gap-2">
            {attention.map((a) => (
              <li key={a.key}>
                <Link href={a.href} className="group flex items-center justify-between gap-3 rounded-input border border-coral-100 bg-coral-50 px-4 py-3 text-sm text-coral-700 transition hover:border-coral-300">
                  <span className="font-medium">{a.text}</span>
                  <ArrowRight size={16} aria-hidden className="shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Notice tone="success" title="Nothing needs attention">Challenges are running, and the pool is funded and paying out.</Notice>
        )}
      </section>}

      <ErrorNote error={stats.error} />

      <Card className="grid gap-x-8 gap-y-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.isLoading ? [0, 1, 2, 3].map((i) => <Sk key={i} className="h-24 rounded-input" />) : s ? (
          <>
            <Kpi label="People" value={num(s.users.total)} series={act?.map((a) => a.signups)} summary="New people per day, last 14 days" hint={`${num(s.users.newLast7d)} new this week`} />
            <Kpi label="Active learners" value={num(s.users.active7d)} unit="this week" series={act?.map((a) => a.active)} summary="Learners per day, last 14 days" hint={`${num(s.users.active1d)} today, ${num(s.users.active30d)} in 30 days`} />
            <Kpi label="Lessons passed" value={num(s.learning.passed)} series={act?.map((a) => a.passed)} summary="Lessons passed per day, last 14 days" hint={`${num(s.learning.learnersWithPass)} learners`} />
            <Kpi label="UBI claimed" value={fmtGD(s.ubi.allTime.total)} unit="G$" series={ubiSeries} summary="G$ claimed per day, last 14 days" />
          </>
        ) : <p className="text-sm text-muted sm:col-span-2 lg:col-span-4">Numbers are unavailable right now.</p>}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <CardHeader title="UBI claimed per day" description="G$ claimed through LearnIt, last 14 days (UTC)."
            action={s && <Link href="/admin/ubi" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-ink underline-offset-4 hover:underline">Details <ArrowRight size={14} aria-hidden /></Link>} />
          <div className="mt-5">
            {s ? <BarChart values={ubiSeries.slice(-14)} labels={ubiDays.slice(-14).map((d) => dayLabel(d.day))} format={gdText} caption="claimed" /> : stats.isLoading ? <Sk className="h-48" /> : <p className="text-sm text-muted">Numbers are unavailable right now.</p>}
          </div>
        </Card>

        <Card className="p-6">
          <CardHeader title="From sign-up to learning" description="How many of the people who signed up get each step." />
          <div className="mt-5">{s ? <HBars rows={funnel} max={Math.max(s.users.total, 1)} /> : stats.isLoading ? <Sk className="h-48" /> : null}</div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <CardHeader title="Learners per day" description="People who attempted at least one lesson, last 14 days (UTC)." />
          <div className="mt-5">
            {act ? <BarChart values={act.slice(-14).map((a) => a.active)} labels={act.slice(-14).map((a) => dayLabel(a.day))} format={(v) => `${v.toLocaleString("en")} ${v === 1 ? "learner" : "learners"}`} caption="active" />
              : stats.isLoading ? <Sk className="h-48" /> : <p className="text-sm text-muted">Daily learner counts appear once the stats service is updated.</p>}
          </div>
        </Card>

        <Card className="p-6">
          <CardHeader title="On-chain now" />
          {stats.isLoading || pool.isLoading || cohorts.isLoading ? <div className="mt-5 grid gap-4">{[0, 1, 2].map((i) => <Sk key={i} className="h-12 rounded-input" />)}</div> : (
            <dl className="tabular mt-5 grid gap-5">
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
    </div>
  );
}
