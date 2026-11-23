"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, Tick02Icon, Share08Icon } from "@hugeicons/core-free-icons";
import { useApi } from "@/lib/useApi";
import { REFERRALS_ENABLED, inviteLink } from "@/lib/referral";
import { Badge, Button, Card, CardHeader } from "./ui";

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

  return (
    <Card className="p-6">
      <CardHeader title="Invite friends" description="A friend counts once they verify with GoodDollar and pass a lesson." className="mb-5" />
      <p className="mb-1.5 text-xs font-medium text-muted">Your invite code</p>
      <div className="mb-4 flex gap-2">
        <input readOnly value={data.code} aria-label="Your invite code" onFocus={(e) => e.currentTarget.select()} className="h-11 min-w-0 flex-1 rounded-input border border-line bg-sunken px-3 font-mono text-[15px] font-semibold text-ink" />
        <Button variant="outline" onClick={() => copy("code")}><HugeiconsIcon icon={copied === "code" ? Tick02Icon : Copy01Icon} size={16} />{copied === "code" ? "Copied" : "Copy code"}</Button>
      </div>
      <p className="mb-1.5 text-xs font-medium text-muted">Or share your link</p>
      <div className="flex gap-2">
        <input readOnly value={link} aria-label="Your invite link" onFocus={(e) => e.currentTarget.select()} className="h-11 min-w-0 flex-1 rounded-input border border-line bg-sunken px-3 font-mono text-[13px] text-ink-2" />
        <Button variant="outline" onClick={() => copy("link")}><HugeiconsIcon icon={copied === "link" ? Tick02Icon : Copy01Icon} size={16} />{copied === "link" ? "Copied" : "Copy link"}</Button>
        {typeof navigator !== "undefined" && "share" in navigator && <Button variant="outline" onClick={share} aria-label="Share your invite link"><HugeiconsIcon icon={Share08Icon} size={16} /></Button>}
      </div>
      <p className="mt-4 text-sm text-muted"><span className="tabular font-semibold text-ink">{data.invited}</span> invited, <span className="tabular font-semibold text-ink">{data.counted}</span> counted</p>
      {data.people.length > 0 && (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {data.people.map((p, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="text-sm font-medium text-ink">{p.username ? `@${p.username}` : "New learner"}</span>
              <span className="flex flex-wrap gap-1.5">
                {STEPS.map((s) => <Badge key={s.key} tone={p[s.key] ? "sage" : "outline"}>{s.label}</Badge>)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
