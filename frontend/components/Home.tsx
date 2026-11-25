"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Coins, Trophy, PiggyBank, type IconType } from "@/components/icons";
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
import { TipsCard } from "./TipsCard";
import { StatusChips } from "./StatusChips";
import { fmtWait, useProjectedLives, useSecondsUntil } from "./Lives";
import { Flag } from "./Flag";
import { Sk } from "./Skeletons";
import { Badge, ButtonLink, Card, Notice, Progress } from "./ui";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/**
 * The signed-in dashboard. One job: do today's lesson. One hero card for that, then the daily G$, then Earn, then Tips.
 */
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
      <div className="grid gap-6">
        <header className="flex flex-col gap-1">
          {me ? <h1 className="font-display text-display-md tracking-[-0.02em] text-ink sm:text-[2rem]">{greeting()}{first ? `, ${first}` : ""}</h1> : <Sk className="mt-1 h-9 w-64 rounded-lg" />}
          <p className="text-[15px] text-muted">
            {!t ? " " : t.todayDone ? "Done for today." : t.streak > 0 ? "Do 1 lesson to keep your streak." : "A lesson takes about 10 minutes."}
          </p>
          <div className="mt-2">{t ? <StatusChips streak={t.streak} todayDone={t.todayDone} freezes={t.freezesRemaining} lives={t.lives} /> : <Sk className="h-11 w-60 rounded-full" />}</div>
        </header>

        {error && <Notice tone="danger" title="We could not load your account">Check your connection, then refresh the page.</Notice>}

        {/* The hero */}
        {t && me ? <ContinueCard t={t} course={me.course} verified={me.verified} /> : <ContinueSkeleton />}

        {/* Money: the CELO banner (only at zero) sits above the daily claim */}
        {isLoading && <Sk className="h-[72px] w-full rounded-card" />}
        {me && (
          <div className="grid gap-3 empty:hidden">
            {me.verified && <GasCard />}
            {me.verified ? <ClaimCard /> : <VerifyCard />}
            {me.verified && <WelcomeCard />}
          </div>
        )}

        {me && <EarnSection verified={me.verified} />}

        {me && <TipsCard />}

        {me && <div className="grid gap-6 empty:hidden">{t && <GoalCard t={t} verified={me.verified} />}<InstallPrompt /><ReminderPrompt enabled={!!t && t.units.some((u) => u.done > 0)} /></div>}
      </div>
    </AppShell>
  );
}

function ContinueCard({ t, course, verified }: { t: Today; course: string; verified: boolean }) {
  const lang = langOf(course);
  const unit = t.units.find((u) => u.n === t.currentUnit) ?? t.units[0];
  const lives = useProjectedLives(t.lives) ?? t.lives;
  const wait = useSecondsUntil(lives.nextAt);
  const allDone = !t.nextLessonId && unit?.checkpoint.state !== "next";
  const href = t.nextLessonId ? `/learn/${t.nextLessonId}` : unit?.checkpoint.state === "next" ? `/learn/${unit.checkpoint.id}` : "/learn";
  const nextTitle = unit?.lessons.find((l) => l.id === t.nextLessonId)?.title ?? (unit?.checkpoint.state === "next" ? `Unit ${unit.n} checkpoint` : null);
  if (!unit) return null;
  return (
    <Card className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-sage-100/50 blur-3xl" />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Flag code={lang.code} size={22} />
            <p className="text-sm font-medium text-ink-2"><span lang={lang.code}>{lang.native}</span> <span className="text-muted">· {unit.level} · Unit {unit.n} of {t.units.length}</span></p>
          </div>
          {t.todayDone && <Badge tone="sage" icon={CheckCircle2}>Done today</Badge>}
        </div>
        <h2 className="mt-3 text-balance text-2xl font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[1.75rem]">{unit.title}</h2>

        <div className="mt-4 max-w-md">
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="font-medium text-ink">Unit progress</span>
            <span className="tabular text-muted">{unit.done}/{unit.total}</span>
          </div>
          <Progress value={unit.done / unit.total} label={`Unit ${unit.n} progress`} />
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {!verified
            ? <p className="text-[15px] text-ink-2">Verify with GoodDollar to start.</p>
            : lives.lives === 0
            ? <p className="text-[15px] text-ink-2">Out of lives. Next in <span className="tabular font-medium text-ink">{fmtWait(wait)}</span>.</p>
            : allDone
            ? <ButtonLink href="/learn" size="lg" variant="secondary" iconRight={ArrowRight}>Review your path</ButtonLink>
            : <ButtonLink href={href} size="lg" iconRight={ArrowRight}>{unit.done === 0 && t.currentUnit === 1 ? "Start first lesson" : "Continue learning"}</ButtonLink>}
          {nextTitle && lives.lives > 0 && <p className="text-sm text-muted">Next: <span className="font-medium text-ink-2">{nextTitle}</span></p>}
        </div>
      </div>
    </Card>
  );
}

function ContinueSkeleton() {
  return (
    <Card className="p-5 sm:p-6" aria-hidden>
      <Sk className="h-5 w-48 rounded" />
      <Sk className="mt-4 h-8 w-3/5 rounded-lg" />
      <Sk className="mt-3 h-4 w-4/5 rounded" />
      <Sk className="mt-6 h-2 w-full max-w-md rounded-full" />
      <Sk className="mt-6 h-[52px] w-48 rounded-btn" />
    </Card>
  );
}

/** Three ways to earn, as compact tiles. Rewards says when G$ is waiting to be claimed. */
function EarnSection({ verified }: { verified: boolean }) {
  const api = useApi();
  const { data } = useQuery({ queryKey: ["vouchers"], queryFn: () => api<{ vouchers: { amount: string; expiry: number }[] }>("/api/vouchers"), enabled: verified });
  const now = Date.now() / 1000;
  const ready = (data?.vouchers ?? []).filter((v) => v.expiry > now).reduce((s, v) => s + BigInt(v.amount), 0n);
  const tiles: { href: string; Icon: IconType; title: string; sub: string; highlight?: boolean }[] = [
    { href: "/stake", Icon: PiggyBank, title: "Stake", sub: "Stake G$ on your streak" },
    { href: "/leaderboard", Icon: Trophy, title: "Leaderboard", sub: "Top 3 win a weekly G$ bonus" },
    { href: "/earn", Icon: Coins, title: "Rewards", sub: ready > 0n ? `${fmtGD(ready)} G$ ready` : "Claim your G$", highlight: ready > 0n },
  ];
  return (
    <section aria-labelledby="earn">
      <h2 id="earn" className="mb-2 text-sm font-semibold text-muted">Earn</h2>
      <ul className="grid grid-cols-3 gap-3">
        {tiles.map(({ href, Icon, title, sub, highlight }) => (
          <li key={href}>
            <Link href={href} className="group flex h-full flex-col gap-2 rounded-card border border-line bg-surface p-3.5 shadow-card transition-[border-color,transform] duration-100 hover:border-line-strong active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/15">
              <span className={`grid h-9 w-9 place-items-center rounded-input ${highlight ? "bg-coral-50 text-coral-700" : "bg-sunken text-ink-2"}`}><Icon size={18} strokeWidth={1.85} aria-hidden /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{title}</span>
                <span className={`tabular line-clamp-2 text-xs leading-snug ${highlight ? "font-medium text-coral-700" : "text-muted"}`}>{sub}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
