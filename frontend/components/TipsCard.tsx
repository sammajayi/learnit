"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Award, Check, Copy, PiggyBank, Share, Users, X, type IconType } from "@/components/icons";
import { cn } from "@/lib/cn";
import { useInviteActions, useReferral } from "./InviteCard";
import { useVote } from "./VoteCard";
import { Button, ButtonLink, Card } from "./ui";

const KEY = "learnit.tips-dismissed";

type Slide = { key: string; Icon: IconType; title: string; body: string; action: ReactNode };

/**
 * One swipeable, dismissible card instead of a stack of promo cards: invite, vote, stake. Swipe or tap a dot to move; the X hides it for good.
 * A slide that no longer applies is left out: the vote slide goes once this wallet has voted, the invite slide when referrals are off.
 */
export function TipsCard() {
  const referral = useReferral();
  const invite = useInviteActions(referral.data?.code);
  const vote = useVote();
  const track = useRef<HTMLUListElement>(null);
  const [at, setAt] = useState(0);
  const [hidden, setHidden] = useState(true); // hidden until we know, so it never flashes in for someone who dismissed it
  useEffect(() => { try { setHidden(localStorage.getItem(KEY) === "1"); } catch { setHidden(false); } }, []);
  const dismiss = () => { setHidden(true); try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } };

  const slides: Slide[] = [];
  if (referral.enabled) slides.push({
    key: "invite", Icon: Users, title: "Invite friends",
    body: "",
    action: (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" icon={invite.copied === "code" ? Check : Copy} onClick={() => invite.copy("code")}>{invite.copied === "code" ? "Copied" : "Copy invite code"}</Button>
        {invite.canShare && <Button size="sm" variant="ghost" icon={Share} onClick={invite.share} aria-label="Share your invite link">Share</Button>}
      </div>
    ),
  });
  if (!vote.voted) slides.push({
    key: "vote", Icon: Award, title: "Vote for LearnIt",
    body: "Back LearnIt with 10 votes.",
    action: <Button size="sm" variant="outline" icon={Award} onClick={vote.onVote} loading={vote.isPending || vote.checking || vote.claiming} disabled={!vote.ballot}>{vote.shortLabel}</Button>,
  });
  slides.push({
    key: "stake", Icon: PiggyBank, title: "Stake G$ on your streak",
    body: "",
    action: <ButtonLink href="/stake" size="sm" variant="outline">See challenges</ButtonLink>,
  });

  const go = (i: number) => {
    const el = track.current; if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };
  const onScroll = () => { const el = track.current; if (el) setAt(Math.round(el.scrollLeft / el.clientWidth)); };
  const shown = Math.min(at, slides.length - 1);
  if (hidden) return null;

  return (
    <Card className="relative overflow-hidden">
      <button type="button" onClick={dismiss} aria-label="Dismiss tips" className="absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full text-muted transition-colors duration-100 hover:bg-sunken hover:text-ink active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/15"><X size={16} aria-hidden /></button>
      <section role="region" aria-roledescription="carousel" aria-label="Tips">
        <ul ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {slides.map(({ key, Icon, title, body, action }, i) => (
            <li key={key} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`} className="min-w-full snap-center py-4 pl-4 pr-12">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-input bg-sunken text-ink-2"><Icon size={18} strokeWidth={1.85} aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-ink">{title}</h2>
                  {body && <p className="mt-0.5 text-pretty text-sm text-muted">{body}</p>}
                  <div className="mt-3">{action}</div>
                  {key === "vote" && vote.claiming && <p className="mt-2 text-xs text-muted">Sign the free message in your wallet.</p>}
                  {key === "vote" && vote.result && !vote.result.ok && <p role="alert" className="mt-2 text-sm text-coral-700">{vote.result.message}</p>}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {slides.length > 1 && (
          <div className="flex justify-center gap-1.5 pb-3">
            {slides.map((s, i) => (
              <button key={s.key} type="button" onClick={() => go(i)} aria-label={`Show tip ${i + 1} of ${slides.length}`} aria-current={i === shown}
                className="grid h-6 w-6 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/15">
                <span className={cn("h-1.5 rounded-full transition-[width,background-color] duration-200", i === shown ? "w-4 bg-ink" : "w-1.5 bg-line-strong")} />
              </button>
            ))}
          </div>
        )}
      </section>
    </Card>
  );
}
