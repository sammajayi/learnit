"use client";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock, Wallet } from "@/components/icons";
import type { AdminUserRow, AdminUsers } from "@learnit/backend/handlers/adminUsers";
import { langOf } from "@/lib/languages";
import { cn } from "@/lib/cn";
import { Badge, Button, Card, EmptyState, Notice, PageHeader, Stat, fieldClass } from "@/components/ui";
import { Sk } from "@/components/ui/Sk";
import { useAdmin } from "@/components/admin/AdminProvider";
import { useAdminSession } from "@/components/admin/session";
import { DataTable, type Col } from "@/components/admin/DataTable";
import { fmtDuration, shortAddr } from "@/components/admin/bits";

class ApiError extends Error { constructor(message: string, readonly status: number) { super(message); } }

const DAY_MS = 86_400_000;
const date = (iso: string) => new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
function ago(iso: string) {
  const ms = Date.now() - Date.parse(iso);
  if (ms < 3_600_000) return "Just now";
  if (ms < DAY_MS) return rtf.format(-Math.round(ms / 3_600_000), "hour");
  if (ms < 60 * DAY_MS) return rtf.format(-Math.round(ms / DAY_MS), "day");
  return rtf.format(-Math.round(ms / (30 * DAY_MS)), "month");
}
const ts = (iso: string | null) => (iso ? Date.parse(iso) : null);

const COLS: Col<AdminUserRow>[] = [
  { key: "username", header: "Username", value: (r) => r.username, render: (r) => (r.username ? <span className="font-medium">@{r.username}</span> : <span className="text-muted">Not set</span>), exportValue: (r) => r.username },
  { key: "name", header: "Name", value: (r) => r.displayName, render: (r) => r.displayName ?? <span className="text-muted">Not set</span> },
  { key: "wallet", header: "Wallet", value: (r) => r.wallet, render: (r) => <span title={r.wallet} className="font-mono text-xs">{shortAddr(r.wallet)}</span> },
  { key: "course", header: "Learning", value: (r) => langOf(r.course).english },
  { key: "verified", header: "GoodDollar", value: (r) => (r.verified ? 1 : 0), exportValue: (r) => (r.verified ? "verified" : "not verified"), render: (r) => (r.verified ? <Badge tone="sage">Verified</Badge> : <Badge tone="neutral">Not verified</Badge>) },
  { key: "passed", header: "Lessons passed", align: "right", value: (r) => r.lessonsPassed },
  { key: "claims", header: "UBI claims", align: "right", value: (r) => r.ubiClaims },
  { key: "time", header: "Time learning", align: "right", value: (r) => r.learningSeconds, render: (r) => (r.learningSeconds ? fmtDuration(r.learningSeconds) : <span className="text-muted">None</span>) },
  { key: "last", header: "Last active", value: (r) => ts(r.lastActive), exportValue: (r) => r.lastActive, render: (r) => (r.lastActive ? <span title={date(r.lastActive)}>{ago(r.lastActive)}</span> : <span className="text-muted">Never</span>) },
  { key: "joined", header: "Joined", value: (r) => ts(r.joined), exportValue: (r) => r.joined, render: (r) => date(r.joined) },
  { key: "flag", header: "Flagged", value: (r) => (r.flagged ? 1 : 0), exportValue: (r) => (r.flagged ? "yes" : "no"), render: (r) => (r.flagged ? <Badge tone="coral">Flagged</Badge> : <span className="text-muted">No</span>) },
];

const select = cn(fieldClass, "h-10 w-auto py-0 pr-8");

export default function Users() {
  const admin = useAdmin();
  const s = useAdminSession();
  const [verified, setVerified] = useState<"all" | "yes" | "no">("all");
  const [course, setCourse] = useState("all");
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const q = useQuery({
    queryKey: ["admin", "users", s.session?.address, s.session?.issued],
    enabled: !!s.headers, staleTime: 30_000, gcTime: 0, retry: false,
    queryFn: async (): Promise<AdminUsers> => {
      const res = await fetch("/api/admin/users", { headers: s.headers!, cache: "no-store" });
      if (!res.ok) throw new ApiError((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`, res.status);
      return res.json();
    },
  });
  const failure = q.error instanceof ApiError ? q.error : null;
  // An expired sign-in is not an error to read about: ask again.
  useEffect(() => { if (failure?.status === 401) s.signOut(); }, [failure, s]);

  const data = q.data;
  const rows = useMemo(() => (data?.rows ?? []).filter((r) =>
    (verified === "all" || r.verified === (verified === "yes")) && (course === "all" || r.course === course) && (!flaggedOnly || r.flagged)), [data, verified, course, flaggedOnly]);
  const courses = useMemo(() => Array.from(new Set((data?.rows ?? []).map((r) => r.course))), [data]);
  const stats = useMemo(() => {
    const all = data?.rows ?? [];
    const week = Date.now() - 7 * DAY_MS;
    return { time: all.reduce((s, r) => s + r.learningSeconds, 0), verified: all.filter((r) => r.verified).length, active: all.filter((r) => (ts(r.lastActive) ?? 0) > week).length, named: all.filter((r) => r.username).length, flagged: all.filter((r) => r.flagged).length };
  }, [data]);

  return (
    <div className="grid gap-8">
      <PageHeader title="People" description="Everyone who has signed up, with their username and how they are learning. Click a heading to sort." />
      <Notice tone="warning" title="Personal data">Only wallets on the server's admin list can open this. Do not share exports outside the team.</Notice>

      {!admin.address ? (
        <EmptyState icon={Wallet} title="Connect an admin wallet" action={<Button variant="outline" size="sm" icon={Wallet} loading={admin.connecting} onClick={admin.connect} disabled={!admin.hasInjected}>Connect wallet</Button>}>
          People are only shown to a connected admin wallet.
        </EmptyState>
      ) : !s.session ? (
        <EmptyState icon={Lock} title="Sign to view people" action={<Button size="sm" loading={s.signing} onClick={() => void s.signIn()}>Sign with your wallet</Button>}>
          Your wallet signs a short message to prove it is yours. It sends no transaction and costs nothing. The sign-in lasts an hour in this tab.
          {s.error && <span className="mt-2 block text-danger">{s.error}</span>}
        </EmptyState>
      ) : q.isLoading ? (
        <Card className="grid gap-3 p-6">{[0, 1, 2, 3, 4].map((i) => <Sk key={i} className="h-10 rounded-input" />)}</Card>
      ) : failure && failure.status !== 401 ? (
        <Notice tone="danger" title={failure.status === 403 ? "This wallet is not on the admin list" : failure.status === 503 ? "The people list is not set up" : "We could not load people"}
          action={failure.status === 403 || failure.status === 503 ? undefined : <Button variant="outline" size="sm" onClick={() => void q.refetch()}>Try again</Button>}>
          {failure.message}
        </Notice>
      ) : data ? (
        <>
          <Card className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="People" value={data.total.toLocaleString("en")} hint={data.truncated ? `Showing the newest ${data.rows.length.toLocaleString("en")}` : undefined} />
            <Stat label="Verified" value={stats.verified.toLocaleString("en")} hint="GoodDollar, as last checked" />
            <Stat label="Active this week" value={stats.active.toLocaleString("en")} hint="Attempted a lesson in 7 days" />
            <Stat label="Time learning" value={fmtDuration(stats.time)} hint="In finished lessons, all time" />
            <Stat label="Have a username" value={stats.named.toLocaleString("en")} hint={stats.flagged ? `${stats.flagged} flagged for review` : undefined} />
          </Card>

          <Card className="p-6">
            <DataTable label="People" rows={rows} cols={COLS} rowKey={(r) => r.wallet} initialSort={{ key: "joined", dir: "desc" }} exportName="learnit-people"
              searchText={(r) => `${r.username ?? ""} ${r.displayName ?? ""} ${r.wallet}`} empty="No one matches these filters."
              filters={
                <>
                  <select aria-label="Filter by GoodDollar status" value={verified} onChange={(e) => setVerified(e.target.value as typeof verified)} className={select}>
                    <option value="all">All people</option><option value="yes">Verified</option><option value="no">Not verified</option>
                  </select>
                  <select aria-label="Filter by language" value={course} onChange={(e) => setCourse(e.target.value)} className={select}>
                    <option value="all">All languages</option>
                    {courses.map((c) => <option key={c} value={c}>{langOf(c).english}</option>)}
                  </select>
                  <label className="inline-flex items-center gap-2 text-sm text-ink-2"><input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="size-4 accent-[var(--sage-600)]" />Flagged only</label>
                </>
              } />
          </Card>
          <p className="text-xs text-muted">Updated {new Date(data.generatedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}. Use Refresh above to reload.</p>
        </>
      ) : null}
    </div>
  );
}
