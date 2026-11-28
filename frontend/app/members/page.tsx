"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Users } from "@/components/icons";
import type { PublicMembers } from "@learnit/backend/handlers/publicMembers";
import { langOf } from "@/lib/languages";
import { Avatar } from "@/components/Avatar";
import { Badge, EmptyState, Notice, PageHeader, fieldClass } from "@/components/ui";
import { Sk } from "@/components/ui/Sk";

const joined = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** The public list of LearnIt members. No sign-in. Only public details; wallets and activity stay on the admin page. */
export default function MembersPage() {
  const [q, setQ] = useState("");
  const { data, isError, isLoading } = useQuery({
    queryKey: ["public-members"],
    queryFn: async () => {
      const res = await fetch("/api/public/members");
      if (!res.ok) throw new Error("members");
      return (await res.json()) as PublicMembers;
    },
  });
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^@/, "");
    return (data?.rows ?? []).filter((m) => !needle || m.username.includes(needle) || (m.displayName ?? "").toLowerCase().includes(needle));
  }, [data, q]);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <PageHeader eyebrow="Community" title="Members" description={data ? `${data.total.toLocaleString("en")} people learning on LearnIt.` : "People learning on LearnIt."} />
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or @username" aria-label="Search members" className={`${fieldClass} mt-6`} />
      {isError && <Notice tone="danger" title="We could not load the members" className="mt-4">Check your connection, then refresh the page.</Notice>}
      {isLoading && <div role="status" aria-busy="true" aria-label="Loading members" className="mt-4 space-y-2">{Array.from({ length: 6 }, (_, i) => <Sk key={i} className="h-14 w-full" />)}</div>}
      {data && rows.length === 0 && <EmptyState icon={Users} title="No one found">Try a different name.</EmptyState>}
      {rows.length > 0 && (
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {rows.map((m) => (
            <li key={m.username} className="flex items-center gap-3 px-4 py-3">
              <Avatar src={m.avatarUrl} name={m.displayName || m.username} size={36} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-[15px] font-medium text-ink">
                  <span className="truncate">{m.displayName || `@${m.username}`}</span>
                  {m.verified && <BadgeCheck size={15} className="shrink-0 text-sage-600" role="img" aria-label="GoodDollar verified" />}
                </p>
                <p className="truncate text-xs text-muted">{m.displayName ? `@${m.username} · ` : ""}Joined {joined(m.joined)}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge>{langOf(m.course).english}</Badge>
                <span className="tabular text-xs text-muted">{m.lessonsPassed.toLocaleString("en")} {m.lessonsPassed === 1 ? "lesson" : "lessons"}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {data?.truncated && <p className="mt-3 text-center text-xs text-muted">Showing the newest {data.rows.length.toLocaleString("en")}.</p>}
    </main>
  );
}
