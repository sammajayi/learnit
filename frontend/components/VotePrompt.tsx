"use client";
import { useEffect, useState } from "react";
import { Award, Check } from "@/components/icons";
import { useMe } from "@/lib/useMe";
import { shouldOfferVotePrompt } from "@/lib/votePrompt";
import { Button, Notice } from "./ui";
import { Sheet } from "./ui/Sheet";
import { useVote } from "./VoteCard";

/**
 * A popup that asks people who have not voted to vote for LearnIt. It opens a moment after Home settles, and only for someone
 * who can vote right now. "Not now" only hides it for this visit: it comes back every time Home is opened, until they have voted.
 * It is a centred popup box on every screen size.
 */
export function VotePrompt() {
  const { data: me } = useMe();
  const v = useVote();
  const [open, setOpen] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [dismissed, setDismissed] = useState(false); // for this visit only, so a new visit shows it again

  const eligible = !open && !!me && shouldOfferVotePrompt({
    onboarded: me.onboarded, verified: me.verified, voted: v.voted, ballotKind: v.ballot?.kind ?? null,
    snoozedUntil: dismissed ? Infinity : 0, now: Date.now(),
  });
  useEffect(() => {
    if (!eligible) return;
    const t = setTimeout(() => setOpen(true), 2500);
    return () => clearTimeout(t);
  }, [eligible]);

  // Once the vote lands, say thanks for a moment and close.
  useEffect(() => {
    if (!open || !v.voted) return;
    setThanks(true);
    const t = setTimeout(() => { setOpen(false); setThanks(false); }, 1800);
    return () => clearTimeout(t);
  }, [open, v.voted]);

  const notNow = () => { setDismissed(true); setOpen(false); };

  return (
    <Sheet modal open={open} onClose={thanks ? () => setOpen(false) : notNow} title="Vote for LearnIt">
      {thanks ? (
        <p role="status" className="flex items-center gap-2 py-2 text-[15px] font-medium text-sage-700"><Check size={18} aria-hidden /> Vote recorded. Thank you.</p>
      ) : (
        <div className="grid gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-input bg-sunken text-ink-2"><Award size={18} strokeWidth={1.85} aria-hidden /></span>
            <p className="pt-2 text-[15px] text-ink-2">Back LearnIt with {v.votes} votes.</p>
          </div>
          {v.claiming && <p className="text-sm text-muted">Sign the free message in your wallet.</p>}
          {v.isPending && <p className="text-sm text-muted">Open your wallet app to confirm. Nothing showing? Close and reopen it, then tap again.</p>}
          {v.result && !v.result.ok && <Notice tone="danger">{v.result.message}</Notice>}
          <div className="flex flex-col gap-2">
            <Button size="lg" block icon={Award} onClick={v.onVote} loading={v.isPending || v.checking || v.claiming} disabled={!v.ballot}>{v.shortLabel === "Vote" ? v.label : v.shortLabel}</Button>
            <Button size="lg" variant="ghost" block onClick={notNow}>Not now</Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
