"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, Coins, Trophy, PiggyBank } from "@/components/icons";
import { useApi } from "@/lib/useApi";
import { useMe } from "@/lib/useMe";
import { langOf } from "@/lib/languages";
import { fmtGD } from "@learnit/backend/format";
import { useToday, type Today } from "@/lib/useToday";
import { AppShell } from "./AppShell";
import { VerifyCard } from "./VerifyCard";
import { ClaimCard } from "./ClaimCard";
import { GasCard } from "./GasCard";
import { WelcomeCard } from "./WelcomeCard";
import { InstallPrompt } from "./InstallPrompt";
import { ReminderPrompt } from "./ReminderPrompt";
import { GoalCard } from "./GoalCard";
import { StatusChips } from "./StatusChips";
import { Flag } from "./Flag";
import { Sk } from "./Skeletons";
import { Badge, ButtonLink, Card, Notice, Progress, Stat } from "./ui";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** The signed-in dashboard. */
export function Home() {
  const { data: me, isLoading, error } = useMe();
  const api = useApi();
  const today = useToday();
  useEffect(() => {
    // Streak days follow the learner's own timezone.
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (me && tz && me.timezone !== tz) api("/api/me", { method: "PATCH", body: JSON.stringify({ timezone: tz }) }).catch(() => {});
  }, [me, api]);

  const first = me?.displayName?.split(" ")[0] || (me?.username ? `@${me.username}` : null);
  const t = today.data;

  return (
    <AppShell>
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted">{new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</p>
        {me ? <h1 className="font-display text-display-md text-ink sm:text-[2rem]">{greeting()}{first ? `, ${first}` : ""}</h1> : <Sk className="mt-1 h-9 w-64 rounded-lg" />}
        <p className="text-[15px] text-muted">
          {!t ? " " : t.todayDone ? "Today's lesson is done. Your streak is safe." : t.streak > 0 ? "One lesson today keeps your streak going." : "Your next lesson takes about 10 minutes."}
        </p>
        <div className="mt-3">{t ? <StatusChips streak={t.streak} todayDone={t.todayDone} freezes={t.freezesRemaining} lives={t.lives} /> : <Sk className="h-10 w-60 rounded-full" />}</div>
      </header>

      {error && <Notice tone="danger" className="mt-6" title="We could not load your account">Check your connection, then refresh the page.</Notice>}

      {/* Two columns on desktop. On mobile the columns dissolve (\`contents\`) and \`order\` interleaves them: lesson, daily G$, stats, rewards. */}
      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-8">
        <div className="grid min-w-0 grid-cols-1 content-start gap-6 max-xl:contents">
          <div className="order-1 min-w-0">{t && me ? <ContinueCard t={t} course={me.course} verified={me.verified} /> : <ContinueSkeleton />}</div>
          <div className="order-3 min-w-0">{t ? <StatsRow t={t} /> : <Sk className="h-[104px] w-full rounded-card" />}</div>
          {me && <div className="order-5 grid min-w-0 gap-6 empty:hidden">{t && <GoalCard t={t} verified={me.verified} />}<InstallPrompt /><ReminderPrompt enabled={!!t && t.units.some((u) => u.done > 0)} /></div>}
        </div>

        <div className="grid min-w-0 grid-cols-1 content-start gap-6 max-xl:contents">
          <div className="order-2 grid min-w-0 grid-cols-1 gap-6">
            {isLoading && <Sk className="h-[220px] w-full rounded-card" />}
            {me && (me.verified ? <ClaimCard /> : <VerifyCard />)}
            {me && me.verified && <WelcomeCard />}
            {me && me.verified && !me.gasTopupDone && <GasCard />}
          </div>
          {me && <div className="order-4 min-w-0 empty:hidden"><RewardsCard verified={me.verified} /></div>}
          <div className="order-6 min-w-0"><QuickLinks /></div>
        </div>
      </div>
    </AppShell>
  );
}

function ContinueCard({ t, course, verified }: { t: Today; course: string; verified: boolean }) {
  const lang = langOf(course);
  const unit = t.units.find((u) => u.n === t.currentUnit) ?? t.units[0];
  const allDone = !t.nextLessonId && unit?.checkpoint.state !== "next";
  const href = t.nextLessonId ? `/learn/${t.nextLessonId}` : unit?.checkpoint.state === "next" ? `/learn/${unit.checkpoint.id}` : "/learn";
  const nextTitle = unit?.lessons.find((l) => l.id === t.nextLessonId)?.title ?? (unit?.checkpoint.state === "next" ? `Unit ${unit.n} checkpoint` : null);
  if (!unit) return null;
  return (
    <Card className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-sage-100/50 blur-3xl" />
      <div className="relative p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Flag code={lang.code} size={22} />
            <p className="text-sm font-medium text-ink-2"><span lang={lang.code}>{lang.native}</span> <span className="text-muted">· {unit.level} · Unit {unit.n} of {t.units.length}</span></p>
          </div>
          {t.todayDone && <Badge tone="sage" icon={CheckCircle2}>Done today</Badge>}
        </div>
        <h2 className="mt-6 text-balance text-[1.625rem] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-3xl">{unit.title}</h2>
        <p className="mt-2 max-w-[52ch] text-pretty text-[15px] leading-relaxed text-ink-2">{unit.blurb}</p>

        <div className="mt-7 max-w-md">
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="font-medium text-ink">Unit progress</span>
            <span className="tabular text-muted">{unit.done} of {unit.total} complete</span>
          </div>
          <Progress value={unit.done / unit.total} label={`Unit ${unit.n} progress`} />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {!verified
            ? <p className="text-[15px] text-ink-2">Verify with GoodDollar to start your first lesson. It is a quick face check.</p>
            : allDone
            ? <ButtonLink href="/learn" size="lg" variant="secondary" iconRight={ArrowRight}>Review your path</ButtonLink>
            : <ButtonLink href={href} size="lg" iconRight={ArrowRight}>{unit.done === 0 && t.currentUnit === 1 ? "Start first lesson" : "Continue learning"}</ButtonLink>}
          {nextTitle && <p className="text-sm text-muted">Up next: <span className="font-medium text-ink-2">{nextTitle}</span></p>}
        </div>
      </div>
    </Card>
  );
}

function ContinueSkeleton() {
  return (
    <Card className="p-6 sm:p-8" aria-hidden>
      <Sk className="h-5 w-48 rounded" />
      <Sk className="mt-6 h-8 w-3/5 rounded-lg" />
      <Sk className="mt-3 h-4 w-4/5 rounded" />
      <Sk className="mt-8 h-2 w-full max-w-md rounded-full" />
      <Sk className="mt-8 h-[52px] w-48 rounded-btn" />
    </Card>
  );
}

function StatsRow({ t }: { t: Today }) {
  const done = t.units.reduce((s, u) => s + u.done, 0);
  const total = t.units.reduce((s, u) => s + u.total, 0);
  const unitsDone = t.units.filter((u) => u.checkpoint.state === "passed").length;
  return (
    <Card className="grid grid-cols-2 divide-x divide-line">
      <Stat className="p-5 sm:px-6" icon={BookOpen} label="Lessons" value={done} unit={`/ ${total}`} hint="Across the whole course" />
      <Stat className="p-5 sm:px-6" icon={CheckCircle2} label="Units" value={unitsDone} unit={`/ ${t.units.length}`} hint="Checkpoints passed" />
    </Card>
  );
}

function RewardsCard({ verified }: { verified: boolean }) {
  const api = useApi();
  const { data } = useQuery({ queryKey: ["vouchers"], queryFn: () => api<{ vouchers: { amount: string; expiry: number }[]; earnedToday: string; dailyCap: string; capRemaining: string }>("/api/vouchers"), enabled: verified });
  if (!verified) return null;
  if (!data) return <Sk className="h-[168px] w-full rounded-card" />;
  const now = Date.now() / 1000;
  const ready = data.vouchers.filter((v) => v.expiry > now);
  const pending = ready.reduce((s, v) => s + BigInt(v.amount), 0n);
  const cap = BigInt(data.dailyCap);
  const earned = BigInt(data.earnedToday);
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Lesson rewards</p>
        <Link href="/earn" className="inline-flex items-center gap-1 text-sm font-medium text-muted transition hover:text-ink">See rewards <ArrowUpRight size={14} aria-hidden /></Link>
      </div>
      <p className="font-mono tabular mt-4 text-3xl font-semibold tracking-[-0.02em] text-ink">{fmtGD(data.earnedToday)} <span className="text-base font-medium text-muted"><span className="font-mono">G$</span> <span className="font-sans">today</span></span></p>
      <Progress className="mt-4" value={cap > 0n ? Number((earned * 1000n) / cap) / 1000 : 0} label="Share of today's reward limit earned" />
      <p className="mt-2 text-xs text-muted tabular">{fmtGD(data.capRemaining)} G$ left under today&apos;s limit</p>
      {ready.length > 0 && (
        <Link href="/earn" className="mt-5 flex items-center justify-between rounded-input bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700 ring-1 ring-inset ring-coral-100 transition hover:bg-coral-100">
          <span><span className="font-mono tabular font-semibold">{fmtGD(pending)} G$</span> ready to claim</span>
          <ArrowRight size={16} aria-hidden />
        </Link>
      )}
    </Card>
  );
}

function QuickLinks() {
  const links = [
    { href: "/stake", Icon: PiggyBank, title: "Stake", body: "Optional. Put G$ behind a streak challenge" },
    { href: "/leaderboard", Icon: Trophy, title: "Leaderboard", body: "Weekly top 3 share a G$ bonus" },
    { href: "/earn", Icon: Coins, title: "Rewards", body: "Claim the G$ you have earned" },
  ];
  return (
    <Card className="divide-y divide-line">
      {links.map(({ href, Icon, title, body }) => (
        <Link key={href} href={href} className="group flex items-center gap-4 px-5 py-4 transition first:rounded-t-card last:rounded-b-card hover:bg-canvas">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-input bg-sunken text-ink-2 transition group-hover:bg-sage-50 group-hover:text-sage-700"><Icon size={18} strokeWidth={1.85} aria-hidden /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{title}</span><span className="block truncate text-sm text-muted">{body}</span></span>
          <ArrowRight size={16} className="text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
        </Link>
      ))}
    </Card>
  );
}
