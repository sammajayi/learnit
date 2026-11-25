"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, Link01Icon, Tick02Icon, Share08Icon } from "@hugeicons/core-free-icons";
import { Award, Check, ChevronDown, Users } from "@/components/icons";
import { useApi } from "@/lib/useApi";
import { REFERRALS_ENABLED, inviteLink } from "@/lib/referral";
import { Badge, Button, Card, Notice } from "./ui";
import { useVote } from "./VoteCard";

type Person = { username: string | null; joined: string; verified: boolean; learned: boolean; claimed: boolean; counted: boolean };
export type Referral = { code: string | null; invited: number; counted: number; people: Person[] };

const STEPS: { key: "verified" | "learned" | "claimed"; label: string }[] = [
  { key: "verified", label: "Verified" },
  { key: "learned", label: "Passed a lesson" },
  { key: "claimed", label: "Claimed G$" },
];

/** The signed-in person's invite code and the people they invited. Off unless referrals are switched on. Shared by the profile and the Home tips. */
export function useReferral() {
  const api = useApi();
  const q = useQuery({ queryKey: ["referral"], queryFn: () => api<Referral>("/api/referral"), enabled: REFERRALS_ENABLED });
  return { enabled: REFERRALS_ENABLED && !!q.data?.code, data: q.data };
}

/** Copy and share for an invite code. Both the code and the link are on screen, so they can be copied by hand if the browser refuses. */
export function useInviteActions(code: string | null | undefined) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const link = code ? inviteLink(code) : "";
  const copy = async (what: "code" | "link") => {
    try { await navigator.clipboard.writeText(what === "code" ? code! : link); setCopied(what); setTimeout(() => setCopied(null), 2000); } catch { /* shown on screen */ }
  };
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  const share = () => { void navigator.share?.({ title: "LearnIt", text: "Learn French or Spanish with me on LearnIt.", url: link }).catch(() => {}); };
  return { copied, copy, share, canShare, link };
}

/** One quiet line for the vote: a small button, or "Voted" once this wallet has voted. */
function VoteRow() {
  const v = useVote();
  if (v.voted) return <p className="flex items-center gap-2 text-sm font-medium text-sage-700"><Check size={16} aria-hidden /> Voted</p>;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-sm text-muted">Back LearnIt with {v.votes} votes.</p>
        <Button variant="outline" size="sm" icon={Award} onClick={v.onVote} loading={v.isPending || v.checking || v.claiming} disabled={!v.ballot} className="shrink-0">{v.label}</Button>
      </div>
      {v.claiming && <p className="mt-2 text-xs text-muted">Sign the free message in your wallet.</p>}
      {v.isPending && <p className="mt-2 text-xs text-muted">Open your wallet app to confirm. Nothing showing? Close and reopen it, then tap again.</p>}
      {v.result && !v.result.ok && <Notice tone="danger" className="mt-2">{v.result.message}</Notice>}
    </div>
  );
}

/**
 * Invite friends as one line (icon, "5 invited · 1 counted", chevron). Tap it for the code, the people and the vote.
 * Without referrals it is just the vote. The vote is a secondary action here and becomes "Voted" once it is done.
 */
export function InviteCard() {
  const { enabled, data } = useReferral();
  const { copied, copy, share, canShare } = useInviteActions(data?.code);
  const [open, setOpen] = useState(false);
  const iconBtn = "grid h-9 w-9 shrink-0 place-items-center rounded-input border border-line text-ink-2 transition-colors duration-100 hover:bg-sunken active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/15";
  const summary = enabled && data ? `${data.invited} invited · ${data.counted} counted` : "Vote for LearnIt";

  return (
    <Card>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-card px-4 py-3.5 text-left transition-colors duration-100 hover:bg-canvas active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/15">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-input bg-sunken text-ink-2"><Users size={18} strokeWidth={1.85} aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink"><span className="tabular">{summary}</span></span>
          {enabled && data && <span className="block text-xs text-muted">Invite friends</span>}
        </span>
        <ChevronDown size={18} aria-hidden className={cn("shrink-0 text-muted transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid gap-3 border-t border-line px-4 pb-4 pt-3">
          {enabled && data && (
            <>
              <p className="text-xs text-muted">Counts after they verify, finish a lesson, and claim G$.</p>
              <div className="flex gap-2">
                <input readOnly value={data.code!} aria-label="Your invite code" onFocus={(e) => e.currentTarget.select()} className="h-9 min-w-0 flex-1 rounded-input border border-line bg-sunken px-3 font-mono text-sm font-semibold text-ink" />
                <button type="button" onClick={() => copy("code")} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-input border border-line px-3 text-sm font-medium text-ink transition-colors duration-100 hover:bg-sunken active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/15">
                  <HugeiconsIcon icon={copied === "code" ? Tick02Icon : Copy01Icon} size={15} />{copied === "code" ? "Copied" : "Copy code"}
                </button>
                <button type="button" onClick={() => copy("link")} aria-label={copied === "link" ? "Invite link copied" : "Copy invite link"} title="Copy invite link" className={iconBtn}>
                  <HugeiconsIcon icon={copied === "link" ? Tick02Icon : Link01Icon} size={15} />
                </button>
                {canShare && <button type="button" onClick={share} aria-label="Share your invite link" className={iconBtn}><HugeiconsIcon icon={Share08Icon} size={15} /></button>}
              </div>
              {data.people.length > 0 && (
                <ul className="divide-y divide-line border-t border-line">
                  {data.people.map((p, i) => (
                    <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="text-sm font-medium text-ink">{p.username ? `@${p.username}` : "New learner"}</span>
                      <span className="flex flex-wrap gap-1.5">
                        {STEPS.map((s) => <Badge key={s.key} tone={p[s.key] ? "sage" : "outline"}>{s.label}</Badge>)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <div className={cn(enabled && data && "border-t border-line pt-3")}><VoteRow /></div>
        </div>
      )}
    </Card>
  );
}
