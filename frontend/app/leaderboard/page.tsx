"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Medal, Trophy, Users } from "@/components/icons";
import { useApi } from "@/lib/useApi";
import { useMe } from "@/lib/useMe";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { useAuthGate } from "@/components/useAuthGate";
import { ButtonLink, Card, EmptyState, Notice, PageHeader } from "@/components/ui";
import { Sk } from "@/components/ui/Sk";
import { cn } from "@/lib/cn";

type Tab = "contest" | "all";
type Row = { you: boolean; wallet: string; name: string; avatarUrl: string | null; points: number; rank: number };
type ContestRow = { you: boolean; name: string; avatarUrl: string | null; points: number; days: number; missed: boolean; rank: number | null; prize: number | null };
type ContestBoard = {
  contest: { index: number; start: string; end: string; endsAt: string; status: "upcoming" | "live"; today: string; dates: string[] };
  poolG: number; prizeRanks: number; entered: number; inRace: number; rows: ContestRow[];
  me: { verified: boolean; points: number; days: number; missed: boolean; rank: number | null; prize: number | null; attended: (boolean | null)[] };
};
type AllBoard = { scope: "all"; rows: Row[]; you: { rank: number; points: number } | null; ahead: { name: string; points: number } | null; page: number; pages: number; total: number };

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
  const [tab, setTab] = useState<Tab>(() => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "all" ? "all" : "contest"));
  const contest = useQuery({ queryKey: ["contest"], queryFn: () => api<ContestBoard>("/api/contest"), enabled: ok && tab === "contest", staleTime: 30_000 });
  const [page, setPage] = useState(1);
  const all = useQuery({ queryKey: ["leaderboard", "all", page], queryFn: () => api<AllBoard>(`/api/leaderboard?scope=all&page=${page}`), enabled: ok && tab === "all", staleTime: 30_000, placeholderData: (prev) => prev });

  function pick(t: Tab) {
    setTab(t);
    window.history.replaceState(null, "", t === "all" ? "?tab=all" : window.location.pathname);
  }

  const switcher = (
    <div role="group" aria-label="Leaderboard period" className="flex w-full rounded-btn bg-sunken p-1 ring-1 ring-inset ring-line sm:inline-flex sm:w-auto">
      {([["contest", "Two weeks", CalendarDays], ["all", "Overall", Trophy]] as const).map(([t, label, Icon]) => (
        <button key={t} type="button" aria-pressed={tab === t} onClick={() => pick(t)}
          className={cn("inline-flex flex-1 items-center justify-center gap-2 rounded-[9px] px-4 py-2.5 text-sm font-medium transition duration-200 sm:flex-none sm:py-2",
            tab === t ? "bg-surface text-ink shadow-card ring-1 ring-line" : "text-muted hover:text-ink")}>
          <Icon size={16} strokeWidth={2} aria-hidden />{label}
        </button>
      ))}
    </div>
  );

  const header = (
    <PageHeader eyebrow={tab === "contest" ? "Biweekly contest" : "Overall"} title="Leaderboard" action={switcher}
      description={tab === "contest" ? "Pass a lesson every day. The top 10 who never miss a day share the prize." : "Every lesson and checkpoint you have finished, at your best score. Only the weekly top 3 earn a bonus."} />
  );

  return (
    <AppShell width="narrow">
      {header}
      {tab === "contest" ? <Contest data={contest.data} /> : <AllTime data={all.data} onPage={setPage} who={{ name: me?.displayName || me?.username || "You", avatarUrl: me?.avatarUrl ?? null }} />}
    </AppShell>
  );
}

const dayLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const gd = (n: number) => `${n.toLocaleString("en", { maximumFractionDigits: 2 })} G$`;

/** One row of the contest, as a fine ledger line: rank, name, the prize for the top 10, points. Out of the race: no rank, quieter. */
function ContestRowItem({ r }: { r: ContestRow }) {
  return (
    <li className={cn("flex items-center gap-3 px-4 py-2.5 sm:px-5", r.you && "bg-sage-50 shadow-[inset_2px_0_0_var(--sage-600)]", r.missed && "opacity-55")}>
      <span className={cn("tabular grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold", r.rank !== null && MEDAL[r.rank] ? MEDAL[r.rank] : "text-muted")}>{r.rank ?? ""}</span>
      <Avatar src={r.avatarUrl} name={r.name} size={28} className="shrink-0" />
      <span className={cn("min-w-0 flex-1 truncate text-sm text-ink", r.you ? "font-semibold" : "font-medium")}>{r.you ? "You" : r.name}</span>
      {r.prize !== null && <span className="tabular shrink-0 rounded-full bg-sage-100 px-2 py-px text-[11px] font-semibold text-sage-700">{gd(r.prize)}</span>}
      <span className="tabular w-10 shrink-0 text-right text-sm font-semibold text-ink">{pts(r.points)}<span className="sr-only"> points</span></span>
    </li>
  );
}

function Contest({ data }: { data: ContestBoard | undefined }) {
  if (!data) return <ListSkeleton />;
  const { contest, me } = data;
  const startsIn = Math.max(1, Math.round((Date.parse(`${contest.start}T00:00:00Z`) - Date.parse(`${contest.today}T00:00:00Z`)) / 86400_000));
  if (contest.status === "upcoming") {
    return (
      <Card className="mt-8 p-5 sm:p-6">
        <p className="text-[13px] font-medium text-muted">Next contest</p>
        <p className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] text-ink">Starts in {startsIn} day{startsIn === 1 ? "" : "s"}</p>
        <p className="mt-2 text-sm text-ink-2">Pass a lesson every day for 14 days.{data.poolG > 0 ? ` The top ${data.prizeRanks} share ${gd(data.poolG)}.` : ""}</p>
        {!me.verified && <Notice tone="info" className="mt-4" title="Verify to enter">Only verified people can win. A quick GoodDollar face check takes a minute.</Notice>}
      </Card>
    );
  }
  const left = timeLeft(contest.endsAt);
  const inRace = data.rows.filter((r) => !r.missed);
  const out = data.rows.filter((r) => r.missed);
  const status = !me.verified ? null : me.missed ? "You missed a day, so you are out of the race. Your points still count on Overall."
    : me.rank !== null ? (me.prize ? `On course for ${gd(me.prize)}` : me.rank <= data.prizeRanks ? "In the prize race" : `Reach the top ${data.prizeRanks} to win`) : "Pass a lesson today to join the contest.";
  return (
    <>
      <Card className="mt-8 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
                        <p className="tabular text-[2.5rem] font-semibold leading-none tracking-[-0.03em] text-ink">{me.verified && me.rank !== null ? `#${me.rank}` : me.verified ? "Not ranked" : "Not entered"}{me.verified && me.rank !== null && <span className="text-sm font-medium tracking-normal text-muted"> of {data.inRace}</span>}</p>
          </div>
          <p aria-label={`Ends in ${left.n} ${left.unit}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sunken px-3 py-1.5 text-sm font-semibold text-ink"><CalendarDays size={18} strokeWidth={1.75} aria-hidden /><span className="tabular">{left.n}</span> {left.unit} left</p>
        </div>
        {status && <p className={cn("mt-4 border-t border-line pt-3 text-sm font-medium", me.missed ? "text-coral-700" : "text-sage-700")}>{status}</p>}
        {!me.verified && <Notice tone="info" className="mt-4" title="Verify to enter">Only verified people can win. Your points still count on Overall.</Notice>}
        {me.verified && (
          <div className="mt-4">
            <ul className="flex gap-1" aria-label="Your 14 days">
              {me.attended.map((x, i) => (
                <li key={i} aria-label={`${dayLabel(contest.dates[i])}: ${x === null ? "not yet" : x ? "showed up" : "missed"}`}
                  className={cn("h-2 flex-1 rounded-full", x === true ? "bg-sage-600" : x === false ? "bg-coral-500" : "bg-line-strong/60")} />
              ))}
            </ul>
          </div>
        )}
        <p className="mt-3 text-xs text-muted">{data.poolG > 0 ? `${gd(data.poolG)} shared by the top ${data.prizeRanks}` : "Prize to be announced"}</p>
      </Card>

      {inRace.length === 0 ? (
        <EmptyState icon={Users} title="Nobody is in yet" className="mt-6" action={<ButtonLink href="/learn">Start a lesson</ButtonLink>}>Pass a lesson today to be first on the board.</EmptyState>
      ) : (
        <ul className="mt-5 divide-y divide-line/70 overflow-clip rounded-card border border-line bg-surface">{inRace.map((r, i) => <ContestRowItem key={i} r={r} />)}</ul>
      )}
      {out.length > 0 && (
        <details className="mt-4 overflow-clip rounded-card border border-line bg-surface">
          <summary className="cursor-pointer list-none px-4 py-2.5 text-[13px] font-medium text-muted hover:text-ink sm:px-5">Out of the race ({out.length})</summary>
          <ul className="divide-y divide-line/70 border-t border-line">{out.map((r, i) => <ContestRowItem key={i} r={r} />)}</ul>
        </details>
      )}
    </>
  );
}

function AllTime({ data, who, onPage }: { data: AllBoard | undefined; onPage: (n: number) => void; who: { name: string; avatarUrl: string | null } }) {
  if (!data) return <ListSkeleton />;
  if (data.rows.length === 0) {
    return (
      <EmptyState icon={Trophy} title="No points yet" className="mt-8" action={<ButtonLink href="/learn">Start a lesson</ButtonLink>}>
        Finish a lesson to appear here.
      </EmptyState>
    );
  }
  const inList = data.rows.find((r) => r.you);
  const mine = data.you;
  const gap = data.ahead && mine ? Math.max(1, data.ahead.points - mine.points + 1) : 0;
  const nudge = data.ahead && mine ? `${pts(gap)} ${word(gap)} to pass ${data.ahead.name}` : mine?.rank === 1 ? "You are first" : null;
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

      {data.pages > 1 && (
        <nav aria-label="Leaderboard pages" className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={() => onPage(data.page - 1)} disabled={data.page <= 1} className="rounded-btn px-3 py-2 text-sm font-medium text-ink ring-1 ring-line disabled:opacity-40">Previous</button>
          <span className="tabular text-sm text-muted" aria-live="polite">Page {data.page} of {data.pages}</span>
          <button type="button" onClick={() => onPage(data.page + 1)} disabled={data.page >= data.pages} className="rounded-btn px-3 py-2 text-sm font-medium text-ink ring-1 ring-line disabled:opacity-40">Next</button>
        </nav>
      )}

      {/* Not on this page: show where you stand, so the board is never a list you cannot find yourself on. */}
      {!inList && data.you && (
        <Card className="mt-3 overflow-clip">
          <ol><RankRow r={{ you: true, wallet: "you", name: who.name, avatarUrl: who.avatarUrl, points: data.you.points, rank: data.you.rank }} /></ol>
        </Card>
      )}
    </>
  );
}
