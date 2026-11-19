"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Share2 } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { REFERRALS_ENABLED, inviteLink } from "@/lib/referral";
import { Badge, Button, Card, CardHeader } from "./ui";

type Person = { username: string | null; joined: string; verified: boolean; claimed: boolean; learned: boolean; counted: boolean };
type Referral = { code: string | null; invited: number; counted: number; people: Person[] };

const STEPS: { key: "verified" | "claimed" | "learned"; label: string }[] = [
  { key: "verified", label: "Verified" },
  { key: "claimed", label: "Claimed" },
  { key: "learned", label: "Passed a lesson" },
];

/** The invite link and how far each invited person has got. Hidden unless referrals are switched on. */
export function InviteCard() {
  const api = useApi();
  const [copied, setCopied] = useState(false);
  const { data } = useQuery({ queryKey: ["referral"], queryFn: () => api<Referral>("/api/referral"), enabled: REFERRALS_ENABLED });
  if (!REFERRALS_ENABLED || !data?.code) return null;

  const link = inviteLink(data.code);
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the link is shown, so it can be copied by hand */ }
  };
  const share = () => { void navigator.share?.({ title: "LearnIt", text: "Learn French or Spanish with me on LearnIt.", url: link }).catch(() => {}); };

  return (
    <Card className="p-6">
      <CardHeader title="Invite friends" description="A friend counts once they verify with GoodDollar, claim G$ in the app and pass a lesson." className="mb-5" />
      <div className="flex gap-2">
        <input readOnly value={link} aria-label="Your invite link" onFocus={(e) => e.currentTarget.select()} className="h-11 min-w-0 flex-1 rounded-input border border-line bg-sunken px-3 font-mono text-[13px] text-ink-2" />
        <Button variant="outline" icon={copied ? Check : Copy} onClick={copy}>{copied ? "Copied" : "Copy"}</Button>
        {typeof navigator !== "undefined" && "share" in navigator && <Button variant="outline" icon={Share2} onClick={share} aria-label="Share your invite link" />}
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
