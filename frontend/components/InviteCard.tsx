"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, Link01Icon, Tick02Icon, Share08Icon } from "@hugeicons/core-free-icons";
import { useApi } from "@/lib/useApi";
import { REFERRALS_ENABLED, inviteLink } from "@/lib/referral";
import { Badge, Card } from "./ui";

type Person = { username: string | null; joined: string; verified: boolean; learned: boolean; counted: boolean };
type Referral = { code: string | null; invited: number; counted: number; people: Person[] };

const STEPS: { key: "verified" | "learned"; label: string }[] = [
  { key: "verified", label: "Verified" },
  { key: "learned", label: "Passed a lesson" },
];

/** The invite link and how far each invited person has got. Hidden unless referrals are switched on. */
export function InviteCard() {
  const api = useApi();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const { data } = useQuery({ queryKey: ["referral"], queryFn: () => api<Referral>("/api/referral"), enabled: REFERRALS_ENABLED });
  if (!REFERRALS_ENABLED || !data?.code) return null;

  const link = inviteLink(data.code);
  const copy = async (what: "code" | "link") => {
    try { await navigator.clipboard.writeText(what === "code" ? data.code! : link); setCopied(what); setTimeout(() => setCopied(null), 2000); } catch { /* both are shown, so they can be copied by hand */ }
  };
  const share = () => { void navigator.share?.({ title: "LearnIt", text: "Learn French or Spanish with me on LearnIt.", url: link }).catch(() => {}); };

  const iconBtn = "grid h-9 w-9 shrink-0 place-items-center rounded-input border border-line text-ink-2 transition-colors hover:bg-sunken";
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-ink">Invite friends</h2>
        <p className="text-xs text-muted"><span className="tabular font-semibold text-ink">{data.invited}</span> invited, <span className="tabular font-semibold text-ink">{data.counted}</span> counted</p>
      </div>
      <p className="mt-0.5 text-xs text-muted">Counts once they verify with GoodDollar and pass a lesson.</p>
      <div className="mt-3 flex gap-2">
        <input readOnly value={data.code} aria-label="Your invite code" onFocus={(e) => e.currentTarget.select()} className="h-9 min-w-0 flex-1 rounded-input border border-line bg-sunken px-3 font-mono text-sm font-semibold text-ink" />
        <button type="button" onClick={() => copy("code")} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-input border border-line px-3 text-sm font-medium text-ink transition-colors hover:bg-sunken">
          <HugeiconsIcon icon={copied === "code" ? Tick02Icon : Copy01Icon} size={15} />{copied === "code" ? "Copied" : "Copy code"}
        </button>
        <button type="button" onClick={() => copy("link")} aria-label={copied === "link" ? "Link copied" : "Copy invite link"} title="Copy invite link" className={iconBtn}>
          <HugeiconsIcon icon={copied === "link" ? Tick02Icon : Link01Icon} size={15} />
        </button>
        {typeof navigator !== "undefined" && "share" in navigator && <button type="button" onClick={share} aria-label="Share your invite link" className={iconBtn}><HugeiconsIcon icon={Share08Icon} size={15} /></button>}
      </div>
      {data.people.length > 0 && (
        <details className="group mt-3 border-t border-line pt-2">
          <summary className="cursor-pointer list-none text-xs font-medium text-muted hover:text-ink">Who you invited ({data.people.length})</summary>
          <ul className="mt-1 divide-y divide-line">
            {data.people.map((p, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-sm font-medium text-ink">{p.username ? `@${p.username}` : "New learner"}</span>
                <span className="flex flex-wrap gap-1.5">
                  {STEPS.map((s) => <Badge key={s.key} tone={p[s.key] ? "sage" : "outline"}>{s.label}</Badge>)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}
