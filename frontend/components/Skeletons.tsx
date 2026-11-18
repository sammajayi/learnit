import { AppShell } from "./AppShell";
import { Logo } from "./Logo";
import { Sk } from "./ui/Sk";

export { Sk };

/** Wrapper that tells assistive tech the region is loading. */
function Busy({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div role="status" aria-busy="true" aria-live="polite" className={className}><span className="sr-only">{label}</span>{children}</div>;
}

const card = "rounded-card border border-line bg-surface shadow-card";

function TitleSk({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><Sk className="h-3 w-24" /><Sk className="mt-3 h-9 w-56 rounded-lg" /><Sk className="mt-3 h-4 w-80 max-w-full" /></div>
      {withAction && <Sk className="h-10 w-60 rounded-btn" />}
    </div>
  );
}

/** The navy daily-claim card. */
export function ClaimCardSkeleton() {
  return (
    <Busy label="Loading your daily G$" className="rounded-card bg-ink p-6">
      <Sk dark className="h-4 w-28" />
      <Sk dark className="mt-5 h-10 w-44 rounded-lg" />
      <Sk dark className="mt-3 h-4 w-32" />
      <Sk dark className="mt-6 h-[52px] w-full rounded-btn" />
    </Busy>
  );
}

export function HomeSkeleton() {
  return (
    <AppShell>
      <Sk className="h-4 w-40" /><Sk className="mt-3 h-9 w-72 rounded-lg" />
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-8">
        <div className="grid content-start gap-6"><Sk className="h-[320px] w-full rounded-card" /><Sk className="h-[104px] w-full rounded-card" /></div>
        <div className="grid content-start gap-6"><ClaimCardSkeleton /><Sk className="h-[168px] w-full rounded-card" /></div>
      </div>
    </AppShell>
  );
}

export function LearnSkeleton() {
  const off = [0, 40, 64, 40, 0, -40];
  return (
    <AppShell width="narrow">
      <TitleSk />
      <Busy label="Loading your path" className="mt-10">
        <Sk className="h-[112px] w-full rounded-card" />
        <div className="mt-10 flex flex-col items-center gap-6" aria-hidden>
          {off.map((x, i) => <div key={i} style={{ transform: `translateX(${x}px)` }}><Sk className="h-[68px] w-[68px] rounded-full" /></div>)}
        </div>
      </Busy>
    </AppShell>
  );
}

export function EarnSkeleton() {
  return (
    <AppShell>
      <TitleSk withAction />
      <Busy label="Loading your rewards" className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-card bg-ink p-6"><Sk dark className="h-4 w-24" /><Sk dark className="mt-4 h-9 w-36 rounded-lg" /><Sk dark className="mt-3 h-4 w-28" /></div>
        {[0, 1].map((i) => <div key={i} className={`${card} p-6`}><Sk className="h-4 w-24" /><Sk className="mt-4 h-8 w-28 rounded-lg" /><Sk className="mt-4 h-2 w-full rounded-full" /></div>)}
      </Busy>
      <div aria-hidden className={`${card} mt-8 divide-y divide-line`}>
        <div className="px-6 py-5"><Sk className="h-4 w-32" /><Sk className="mt-2 h-3.5 w-64" /></div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4">
            <Sk className="h-10 w-10 rounded-input" /><div className="flex-1"><Sk className="h-4 w-32" /><Sk className="mt-2 h-3 w-24" /></div><Sk className="h-5 w-16" /><Sk className="h-9 w-20 rounded-btn" />
          </div>
        ))}
      </div>
    </AppShell>
  );
}

export function StakeSkeleton() {
  return (
    <AppShell>
      <TitleSk withAction />
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
        <Busy label="Loading the challenge" className={card}>
          <div className="flex items-center justify-between border-b border-line px-6 py-5"><div><Sk className="h-4 w-40" /><Sk className="mt-2 h-3.5 w-32" /></div><Sk className="h-6 w-24 rounded-full" /></div>
          <div className="grid grid-cols-2 border-b border-line sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="px-6 py-5"><Sk className="h-3.5 w-20" /><Sk className="mt-3 h-7 w-24 rounded-lg" /></div>)}</div>
          <div className="p-6"><Sk className="h-4 w-28" /><Sk className="mt-3 h-14 w-full rounded-input" /><Sk className="mt-6 h-[52px] w-full rounded-btn" /></div>
        </Busy>
        <div aria-hidden className="grid content-start gap-6"><Sk className="h-[260px] w-full rounded-card" /><Sk className="h-[180px] w-full rounded-card" /></div>
      </div>
    </AppShell>
  );
}

export function LeaderboardSkeleton() {
  return (
    <AppShell width="narrow">
      <TitleSk />
      <div aria-hidden className="mt-8 grid grid-cols-2 gap-4"><Sk className="h-[92px] w-full rounded-card" /><Sk className="h-[92px] w-full rounded-card" /></div>
      <Busy label="Loading the leaderboard" className={`${card} mt-6 divide-y divide-line`}>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5">
            <Sk className="h-8 w-8 rounded-full" /><Sk className="h-9 w-9 rounded-full" /><Sk className={`h-4 rounded ${i % 2 ? "w-28" : "w-36"}`} /><Sk className="ml-auto h-4 w-14" />
          </div>
        ))}
      </Busy>
    </AppShell>
  );
}

export function LanguageSkeleton() {
  return (
    <AppShell width="narrow">
      <Sk className="mb-4 h-9 w-20 rounded-btn" />
      <Sk className="h-9 w-56 rounded-lg" /><Sk className="mt-3 h-4 w-72" />
      <Busy label="Loading languages" className="mt-8 grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => <div key={i} className={`${card} p-5`}><Sk className="h-10 w-10 rounded-full" /><Sk className="mt-5 h-7 w-32 rounded-lg" /><Sk className="mt-2 h-4 w-24" /><Sk className="mt-4 h-4 w-full" /></div>)}
      </Busy>
    </AppShell>
  );
}

/** Lesson player while the lesson loads: top bar, prompt, four options, Check bar. */
export function LessonSkeleton({ label = "Loading your lesson" }: { label?: string }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <div aria-hidden className="border-b border-line/70">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-4 px-3 sm:px-5"><Sk className="h-10 w-10 rounded-full" /><div className="flex-1"><Sk className="h-3 w-28" /><Sk className="mt-2 h-2 w-full rounded-full" /></div><Sk className="h-10 w-10 rounded-full" /></div>
      </div>
      <Busy label={label} className="mx-auto w-full max-w-2xl flex-1 px-5 pt-8 sm:pt-14">
        <Sk className="h-3 w-28" /><Sk className="mt-4 h-9 w-4/5 rounded-lg" /><Sk className="mt-3 h-9 w-1/2 rounded-lg" />
        <div className="mt-8 grid gap-3">{[0, 1, 2, 3].map((i) => <Sk key={i} className="h-[66px] w-full rounded-card" />)}</div>
      </Busy>
      <div aria-hidden className="border-t border-line py-5"><div className="mx-auto flex max-w-2xl justify-end px-5"><Sk className="h-[52px] w-full rounded-btn sm:w-[180px]" /></div></div>
    </div>
  );
}

/** First paint while sign-in starts. Neutral, since we don't know yet whether to show the landing page or the app. */
export function BootSkeleton() {
  return (
    <main role="status" aria-busy="true" className="grid min-h-[100dvh] place-items-center">
      <span className="sr-only">Loading LearnIt</span>
      <div className="flex flex-col items-center gap-5 motion-safe:animate-pulse"><Logo /></div>
    </main>
  );
}

export function ProfileSkeleton() {
  return (
    <AppShell>
      <Sk className="h-3 w-20" /><Sk className="mt-3 h-9 w-64 rounded-lg" />
      <Busy label="Loading your profile" className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-8">
        <div className="grid content-start gap-6"><Sk className="h-[260px] w-full rounded-card" /><Sk className="h-[420px] w-full rounded-card" /></div>
        <div className="grid content-start gap-6"><Sk className="h-[460px] w-full rounded-card" /><Sk className="h-[200px] w-full rounded-card" /></div>
      </Busy>
    </AppShell>
  );
}
