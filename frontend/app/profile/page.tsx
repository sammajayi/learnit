"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { ArrowRight, BadgeCheck, BookOpen, Check, CheckCircle2, Copy, Flame, Lock, LogOut, ScanFace, Snowflake } from "lucide-react";
import { useMe } from "@/lib/useMe";
import { useToday } from "@/lib/useToday";
import { langOf } from "@/lib/languages";
import { short } from "@learnit/backend/format";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { Flag } from "@/components/Flag";
import { ProfileEditor } from "@/components/ProfileEditor";
import { ReminderCard } from "@/components/ReminderCard";
import { ProfileSkeleton, Sk } from "@/components/Skeletons";
import { useAuthGate } from "@/components/useAuthGate";
import { Badge, Button, Card, CardHeader, PageHeader, Progress, ProgressRing, Stat } from "@/components/ui";
import { cn } from "@/lib/cn";

export default function Profile() {
  const ok = useAuthGate();
  const { logout } = useAuth();
  const { data: me } = useMe();
  const { data: t } = useToday();
  const [copied, setCopied] = useState(false);

  if (!ok || !me) return <ProfileSkeleton />;
  const lang = langOf(me.course);
  const name = me.displayName || (me.username ? `@${me.username}` : "Your profile");

  async function copy() {
    try { await navigator.clipboard.writeText(me!.wallet); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }

  const done = t?.units.reduce((s, u) => s + u.done, 0) ?? 0;
  const total = t?.units.reduce((s, u) => s + u.total, 0) ?? 0;

  return (
    <AppShell>
      <PageHeader eyebrow="Account" title="Profile and progress" />

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-8">
        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          {/* Identity */}
          <Card className="overflow-hidden">
            <div aria-hidden className="h-20 bg-gradient-to-r from-sage-100 via-sage-50 to-coral-50" />
            <div className="-mt-10 px-6 pb-6">
              <Avatar src={me.avatarUrl} name={name} size={80} className="ring-4 ring-surface" />
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">{name}</h2>
                {me.verified && <Badge tone="sage" icon={BadgeCheck}>Verified</Badge>}
              </div>
              {me.username && me.displayName && <p className="text-sm text-muted">@{me.username}</p>}
              {me.bio && <p className="mt-3 max-w-[56ch] text-pretty text-[15px] leading-relaxed text-ink-2">{me.bio}</p>}
              <p className="mt-4 inline-flex items-center gap-2 text-sm text-ink-2"><Flag code={lang.code} size={18} /> Learning <span lang={lang.code} className="font-medium text-ink">{lang.native}</span></p>
            </div>
          </Card>

          {/* Progress */}
          <Card>
            <div className="p-6">
              <CardHeader title={`${lang.english} progress`} description={t ? `A0 to A2 course · ${t.units.length} units` : undefined}
                action={t && <ProgressRing value={total ? done / total : 0} size={56} stroke={5} label={`${Math.round((total ? done / total : 0) * 100)}% of the course complete`}><span className="tabular text-xs font-semibold text-ink">{Math.round((total ? done / total : 0) * 100)}%</span></ProgressRing>} />
            </div>
            {t ? (
              <>
                <div className="grid grid-cols-2 border-y border-line sm:grid-cols-4 sm:divide-x sm:divide-line">
                  <Stat className="px-6 py-5" icon={Flame} label="Streak" value={t.streak} unit={t.streak === 1 ? "day" : "days"} />
                  <Stat className="px-6 py-5" icon={Snowflake} label="Freezes" value={t.freezesRemaining} />
                  <Stat className="px-6 py-5" icon={BookOpen} label="Lessons" value={done} unit={`/ ${total}`} />
                  <Stat className="px-6 py-5" icon={CheckCircle2} label="Units" value={t.units.filter((u) => u.checkpoint.state === "passed").length} unit={`/ ${t.units.length}`} />
                </div>
                <ol className="divide-y divide-line">
                  {t.units.map((u) => {
                    const locked = u.lessons[0].state === "locked";
                    const complete = u.checkpoint.state === "passed";
                    const current = u.n === t.currentUnit;
                    return (
                      <li key={u.n} className="flex items-center gap-4 px-6 py-4">
                        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold",
                          complete ? "bg-sage-600 text-white" : current ? "bg-ink text-white" : "bg-sunken text-muted")}>
                          {complete ? <Check size={16} strokeWidth={3} aria-label="Complete" /> : locked ? <Lock size={14} aria-label="Locked" /> : u.n}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-sm font-semibold", locked ? "text-muted" : "text-ink")}>Unit {u.n}: {u.title}</p>
                          <Progress className="mt-2 h-1.5" value={u.done / u.total} label={`Unit ${u.n} progress`} />
                        </div>
                        <span className="tabular w-12 text-right text-xs text-muted">{u.done}/{u.total}</span>
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : (
              <div className="grid gap-3 border-t border-line p-6">{[0, 1, 2, 3].map((i) => <Sk key={i} className="h-10 w-full rounded-input" />)}</div>
            )}
          </Card>
        </div>

        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          <Card className="p-6">
            <CardHeader title="Edit profile" description="How you appear on the leaderboard." className="mb-6" />
            <ProfileEditor />
          </Card>

          <ReminderCard />

          <Card>
            <div className="px-6 pt-6"><CardHeader title="Details" /></div>
            <dl className="mt-4 divide-y divide-line border-t border-line text-sm">
              <div className="flex items-center justify-between gap-4 px-6 py-4">
                <dt className="text-muted">Wallet</dt>
                <dd><button onClick={copy} className="inline-flex items-center gap-2 rounded-md font-mono text-[13px] text-ink transition hover:text-ink-2" aria-label="Copy wallet address">{short(me.wallet)} {copied ? <Check size={14} className="text-sage-700" aria-hidden /> : <Copy size={14} className="text-muted" aria-hidden />}</button></dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-6 py-4">
                <dt className="text-muted">GoodDollar</dt>
                <dd>{me.verified
                  ? <span className="inline-flex items-center gap-1.5 font-medium text-sage-700"><BadgeCheck size={16} aria-hidden /> Verified</span>
                  : <Link href="/home" className="inline-flex items-center gap-1.5 font-medium text-coral-700 underline-offset-4 hover:underline"><ScanFace size={16} aria-hidden /> Verify now</Link>}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-6 py-4">
                <dt className="text-muted">Learning</dt>
                <dd><Link href="/language" className="inline-flex items-center gap-1.5 font-medium text-ink underline-offset-4 hover:underline"><span lang={lang.code}>{lang.native}</span> <ArrowRight size={14} aria-hidden /></Link></dd>
              </div>
            </dl>
            <div className="border-t border-line p-6">
              <Button onClick={() => void logout()} variant="outline" icon={LogOut} block>Sign out</Button>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
