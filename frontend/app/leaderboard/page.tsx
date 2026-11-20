"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Medal, Trophy, Users } from "@/components/icons";
import { useApi } from "@/lib/useApi";
import { useMe } from "@/lib/useMe";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { useAuthGate } from "@/components/useAuthGate";
import { ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { Sk } from "@/components/ui/Sk";
import { cn } from "@/lib/cn";

type Tab = "week" | "all";
type Row = { you: boolean; wallet: string; name: string; avatarUrl: string | null; points: number; rank: number };
type WeekBoard = { joined: false } | { joined: true; weekKey: string; endsAt: string; rows: Row[] };
type AllBoard = { scope: "all"; rows: Row[]; you: { rank: number; points: number } | null };

// Gold, silver and bronze, softened to sit with the rest of the palette.
const MEDAL: Record<number, string> = { 1: "bg-[#f3e3b5] text-[#7a5a12]", 2: "bg-[#e3e6ea] text-[#475163]", 3: "bg-[#f0d9c8] text-[#87502c]" };

/** "3 days" until the last day, then "5 hours" so the last day does not read as "1 day". */
function timeLeft(endsAt: string) {
  const ms = Math.max(0, new Date(endsAt).getTime() - Date.now());
  const hours = Math.ceil(ms / 3600_000);
  if (hours <= 24) return { n: Math.max(1, hours), unit: hours === 1 ? "hour" : "hours" };
  const days = Math.ceil(ms / 86400_000);
  return { n: days, unit: days === 1 ? "day" : "days" };
}

const pts = (n: number) => n.toLocaleString("en");
const word = (n: number) => (n === 1 ? "point" : "points");

/** One line of direction: how far to the next rank, or how far you lead. */
function nudgeFor(rows: Row[], me: Row | undefined) {
  if (!me) return null;
  const ahead = me.rank > 1 ? rows.find((r) => r.rank === me.rank - 1) : null;
  if (ahead) { const gap = Math.max(1, ahead.points - me.points + 1); return `${pts(gap)} ${word(gap)} to pass ${ahead.name}`; }
  const behind = me.rank === 1 ? rows.find((r) => r.rank === 2) : null;
  if (behind) return me.points > behind.points ? `You lead by ${pts(me.points - behind.points)} ${word(me.points - behind.points)}` : "Level with second place";
  return null;
}

function RankRow({ r, bonusLine = false }: { r: Row; bonusLine?: boolean }) {
  return (
    <li className={cn("flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5", r.you && "sticky bottom-[5.5rem] top-14 z-10 border-y border-sage-100 bg-sage-50 shadow-[inset_3px_0_0_var(--sage-600)] lg:bottom-0 lg:top-0", bonusLine && r.rank === 3 && "border-b-2 border-line-strong")}>
      <span className={cn("tabular grid h-7 min-w-7 shrink-0 place-items-center rounded-full px-1 text-sm font-semibold", MEDAL[r.rank] ?? "text-muted")}>
        {r.rank <= 3 ? <Medal size={15} role="img" aria-label={`Rank ${r.rank}`} /> : r.rank}
      </span>
      <Avatar src={r.avatarUrl} name={r.name} size={32} className="shrink-0" />
      <span className={cn("min-w-0 flex-1 truncate text-[15px] text-ink", r.you ? "font-semibold" : "font-medium")}>{r.name}{r.you && <span className="sr-only"> (you)</span>}{bonusLine && r.rank === 3 && <span className="sr-only">. Top 3 share the bonus.</span>}</span>
      <span className="tabular shrink-0 text-right text-sm font-semibold text-ink">{pts(r.points)}<span className="sr-only"> points</span></span>
    </li>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the leaderboard" role="status" className="mt-6 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5">
          <Sk className="h-7 w-7 rounded-full" /><Sk className="h-8 w-8 rounded-full" /><Sk className={cn("h-4 rounded", i % 2 ? "w-28" : "w-36")} /><Sk className="ml-auto h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

export default function Leaderboard() {
  const ok = useAuthGate();
  const api = useApi();
  const { data: me } = useMe();
  // The tab lives in the address (?tab=all) so a link or a refresh keeps it. The server never renders the lists, so this cannot mismatch.
  const [tab, setTab] = useState<Tab>(() => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "all" ? "all" : "week"));
  const week = useQuery({ queryKey: ["leaderboard", "week"], queryFn: () => api<WeekBoard>("/api/leaderboard"), enabled: ok && tab === "week" });
  const all = useQuery({ queryKey: ["leaderboard", "all"], queryFn: () => api<AllBoard>("/api/leaderboard?scope=all"), enabled: ok && tab === "all", staleTime: 30_000 });

  function pick(t: Tab) {
    setTab(t);
    window.history.replaceState(null, "", t === "all" ? "?tab=all" : window.location.pathname);
  }

  const switcher = (
    <div role="group" aria-label="Leaderboard period" className="flex w-full rounded-btn bg-sunken p-1 ring-1 ring-inset ring-line sm:inline-flex sm:w-auto">
      {([["week", "This week", CalendarDays], ["all", "All time", Trophy]] as const).map(([t, label, Icon]) => (
        <button key={t} type="button" aria-pressed={tab === t} onClick={() => pick(t)}
          className={cn("inline-flex flex-1 items-center justify-center gap-2 rounded-[9px] px-4 py-2.5 text-sm font-medium transition duration-200 sm:flex-none sm:py-2",
            tab === t ? "bg-surface text-ink shadow-card ring-1 ring-line" : "text-muted hover:text-ink")}>
          <Icon size={16} strokeWidth={2} aria-hidden />{label}
        </button>
      ))}
    </div>
  );

  const header = (
    <PageHeader eyebrow={tab === "week" ? "This week" : "All time"} title="Leaderboard" action={switcher}
      description={tab === "week" ? "Every finished lesson earns points, and the higher your accuracy, the more you earn. The top 3 share a G$ bonus when the week ends." : "Every lesson and checkpoint you have finished, at your best score. Only the weekly top 3 earn a bonus."} />
  );

  return (
    <AppShell width="narrow">
      {header}
      {tab === "week" ? <Weekly data={week.data} /> : <AllTime data={all.data} who={{ name: me?.displayName || me?.username || "You", avatarUrl: me?.avatarUrl ?? null }} />}
    </AppShell>
  );
}

function Weekly({ data }: { data: WeekBoard | undefined }) {
  if (!data) return <ListSkeleton />;
  if (!data.joined) {
    return (
      <EmptyState icon={Users} title="You are not in a group yet" className="mt-8" action={<ButtonLink href="/learn">Start a lesson</ButtonLink>}>
        Finish a lesson today to join this week&apos;s group.
      </EmptyState>
    );
  }
  const me = data.rows.find((r) => r.you);
  const left = timeLeft(data.endsAt);
  const nudge = nudgeFor(data.rows, me);
  return (
    <>
      <Card className="mt-8 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-muted">Your rank</p>
            <p className="tabular mt-1.5 text-[2.5rem] font-semibold leading-none tracking-[-0.03em] text-ink">{me ? `#${me.rank}` : "Not ranked"} {me && <span className="text-sm font-medium tracking-normal text-muted">of {data.rows.length}</span>}</p>
          </div>
          <p aria-label={`Ends in ${left.n} ${left.unit}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sunken px-3 py-1.5 text-sm font-semibold text-ink"><CalendarDays size={18} strokeWidth={1.75} aria-hidden className="text-muted" /><span className="tabular" aria-hidden>{left.n} {left.unit} left</span></p>
        </div>
        {nudge && <p className="mt-4 border-t border-line pt-3 text-sm font-medium text-sage-700">{nudge}</p>}
      </Card>

      {/* overflow-clip keeps the rounded corners without stopping the "You" row from sticking while you scroll. */}
      <Card className="mt-6 overflow-clip">
        <ol className="divide-y divide-line">{data.rows.map((r) => <RankRow key={r.wallet + r.rank} r={r} bonusLine />)}</ol>
      </Card>
    </>
  );
}

function AllTime({ data, who }: { data: AllBoard | undefined; who: { name: string; avatarUrl: string | null } }) {
  if (!data) return <ListSkeleton />;
  if (data.rows.length === 0) {
    return (
      <EmptyState icon={Trophy} title="No points yet" className="mt-8" action={<ButtonLink href="/learn">Start a lesson</ButtonLink>}>
        Finish a lesson to appear here.
      </EmptyState>
    );
  }
  const inList = data.rows.find((r) => r.you);
  const mine = inList ? { rank: inList.rank, points: inList.points } : data.you;
  const nudge = nudgeFor(data.rows, inList);
  return (
    <>
      <Card className="mt-8 p-5 sm:p-6">
        {mine ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-muted">Your rank</p>
                <p className="tabular mt-1.5 text-[2.5rem] font-semibold leading-none tracking-[-0.03em] text-ink">#{pts(mine.rank)}</p>
              </div>
              <p className="shrink-0 text-right text-[13px] font-medium text-muted">Points<span className="tabular mt-1.5 block text-base font-semibold text-ink">{pts(mine.points)}</span></p>
            </div>
            {nudge && <p className="mt-4 border-t border-line pt-3 text-sm font-medium text-sage-700">{nudge}</p>}
          </>
        ) : (
          <p className="text-sm text-ink-2">You have no points yet. Finish a lesson to join the board.</p>
        )}
      </Card>

      <Card className="mt-6 overflow-clip">
        <ol className="divide-y divide-line">{data.rows.map((r) => <RankRow key={r.wallet + r.rank} r={r} />)}</ol>
      </Card>

      {/* Outside the top 50: show where you stand, so the board is never a list you cannot find yourself on. */}
      {!inList && data.you && (
        <Card className="mt-3 overflow-clip">
          <ol><RankRow r={{ you: true, wallet: "you", name: who.name, avatarUrl: who.avatarUrl, points: data.you.points, rank: data.you.rank }} /></ol>
        </Card>
      )}
    </>
  );
}
