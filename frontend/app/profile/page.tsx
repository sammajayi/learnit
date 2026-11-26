"use client";
import { useEffect, useState } from "react";
import { BadgeCheck, BookOpen, CalendarCheck, Check, CheckCircle2, ChevronDown, Lock, Pencil, Snowflake } from "@/components/icons";
import { useMe } from "@/lib/useMe";
import { useToday } from "@/lib/useToday";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { EditProfileSheet } from "@/components/EditProfileSheet";
import { InviteCard } from "@/components/InviteCard";
import { ProfileSkeleton, Sk } from "@/components/Skeletons";
import { useAuthGate } from "@/components/useAuthGate";
import { Badge, Button, Card, Progress, ProgressRing } from "@/components/ui";
import type { PathUnit } from "@/components/LearnPath";
import { cn } from "@/lib/cn";

const pct = (done: number, total: number) => (total ? done / total : 0);

/** Identity and progress, nothing else. Account settings live in Settings. */
export default function Profile() {
  const ok = useAuthGate();
  const { data: me } = useMe();
  const { data: t } = useToday();
  const [editing, setEditing] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { if (!updated) return; const id = setTimeout(() => setUpdated(false), 4000); return () => clearTimeout(id); }, [updated]);

  if (!ok || !me) return <ProfileSkeleton />;
  const name = me.displayName || (me.username ? `@${me.username}` : "Your profile");

  const done = t?.units.reduce((s, u) => s + u.done, 0) ?? 0;
  const total = t?.units.reduce((s, u) => s + u.total, 0) ?? 0;
  const unitsDone = t?.units.filter((u) => u.checkpoint.state === "passed").length ?? 0;
  const current = t?.units.find((u) => u.n === t.currentUnit);
  const next = t?.units.find((u) => u.n === (t?.currentUnit ?? 0) + 1);
  const others = t?.units.filter((u) => u !== current && u !== next) ?? [];
  const overall = Math.round(pct(done, total) * 100);

  const iconBtn = "grid h-9 w-9 place-items-center rounded-full text-ink-2 transition-colors duration-100 hover:bg-sunken hover:text-ink active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/15";

  return (
    <AppShell>
      <div className="grid gap-6">
        {/* Identity */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <Avatar src={me.avatarUrl} name={name} size={72} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h1 className="truncate text-xl font-semibold tracking-[-0.02em] text-ink">{name}</h1>
                {me.verified && <Badge tone="sage" icon={BadgeCheck}>Verified</Badge>}
              </div>
              {me.username && me.displayName && <p className="text-sm text-muted">@{me.username}</p>}
              {me.bio && <p className="mt-2 max-w-[56ch] text-pretty text-[15px] leading-relaxed text-ink-2">{me.bio}</p>}
            </div>
            <button type="button" onClick={() => setEditing(true)} aria-label="Edit profile" title="Edit profile" className={cn(iconBtn, "-mr-2 -mt-1 shrink-0")}><Pencil size={18} aria-hidden /></button>
          </div>
          <p role="status" aria-live="polite" className={cn("mt-3 flex items-center gap-1.5 text-sm font-medium text-sage-700", !updated && "sr-only")}>{updated && <><Check size={16} aria-hidden /> Profile updated.</>}</p>
        </Card>

        {/* Four numbers */}
        <section>
          <Card>
            {t ? (
              <dl className="grid grid-cols-2">
                {[
                  { Icon: CalendarCheck, label: "Streak", value: t.streak },
                  { Icon: Snowflake, label: "Freezes", value: t.freezesRemaining },
                  { Icon: BookOpen, label: "Lessons", value: done },
                  { Icon: CheckCircle2, label: "Units", value: unitsDone },
                ].map(({ Icon, label, value }, i) => (
                  <div key={label} className={cn("flex items-center justify-between gap-3 px-4 py-3", i % 2 === 1 && "border-l border-line", i >= 2 && "border-t border-line")}>
                    <dt className="flex items-center gap-2 text-sm text-muted"><Icon size={16} strokeWidth={2} aria-hidden />{label}</dt>
                    <dd className="tabular text-xl font-semibold tracking-[-0.02em] text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : <div className="grid grid-cols-2 gap-2 p-3">{[0, 1, 2, 3].map((i) => <Sk key={i} className="h-10 rounded-input" />)}</div>}
          </Card>
        </section>

        {/* Course progress: the unit you are in, the next one, and the rest on request */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Course</h2>
              <p className="mt-0.5 text-sm text-muted tabular">{t ? `${done}/${total} lessons` : " "}</p>
            </div>
            <ProgressRing value={pct(done, total)} size={56} stroke={5} label={`${overall}% of the course complete`}><span className="tabular text-xs font-semibold text-ink">{overall}%</span></ProgressRing>
          </div>
          {t ? (
            <div className="mt-4 grid gap-3">
              {current && <UnitRow u={current} t={t} expanded />}
              {next && <UnitRow u={next} t={t} />}
              {others.length > 0 && (
                <>
                  <button type="button" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}
                    className="inline-flex items-center gap-1.5 justify-self-start rounded text-sm font-medium text-ink-2 transition-colors duration-100 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/15">
                    {showAll ? "Hide units" : `View all ${t.units.length} units`}
                    <ChevronDown size={16} aria-hidden className={cn("transition-transform duration-200", showAll && "rotate-180")} />
                  </button>
                  {showAll && <ol className="grid gap-3 border-t border-line pt-3">{others.map((u) => <li key={u.n}><UnitRow u={u} t={t} /></li>)}</ol>}
                </>
              )}
            </div>
          ) : <div className="mt-4 grid gap-3">{[0, 1].map((i) => <Sk key={i} className="h-14 w-full rounded-input" />)}</div>}
        </Card>

        <InviteCard />
      </div>

      <EditProfileSheet open={editing} onClose={() => setEditing(false)} onSaved={() => setUpdated(true)} />
    </AppShell>
  );
}

/** One unit: its title and bar. The unit you are in is expanded; a locked one says what unlocks it. */
function UnitRow({ u, t, expanded = false }: { u: PathUnit; t: NonNullable<ReturnType<typeof useToday>["data"]>; expanded?: boolean }) {
  const locked = u.lessons[0].state === "locked";
  const complete = u.checkpoint.state === "passed";
  const here = u.n === t.currentUnit;
  return (
    <div className={cn("flex items-start gap-3 rounded-input", expanded && "bg-sunken p-3")}>
      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold", complete ? "bg-sage-600 text-white" : here ? "bg-ink text-white" : "bg-sunken text-muted ring-1 ring-inset ring-line")}>
        {complete ? <Check size={15} strokeWidth={3} aria-label="Complete" /> : locked ? <Lock size={14} aria-label="Locked" /> : u.n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className={cn("truncate text-sm font-semibold", locked ? "text-muted" : "text-ink")}>Unit {u.n}: {u.title}</p>
          {!locked && <span className="tabular shrink-0 text-xs text-muted">{u.done}/{u.total}</span>}
        </div>
        {locked
          ? <p className="mt-0.5 text-sm text-muted">Finish Unit {u.n - 1} to unlock</p>
          : <Progress className="mt-2 h-1.5" value={u.done / u.total} label={`Unit ${u.n} progress`} />}
      </div>
    </div>
  );
}
