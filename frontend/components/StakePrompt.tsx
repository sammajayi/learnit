"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, PiggyBank } from "@/components/icons";
import { ADDR } from "@learnit/backend/chain";
import { fmtGD } from "@learnit/backend/format";
import { useApi } from "@/lib/useApi";
import { useMe } from "@/lib/useMe";
import { Button, ButtonLink } from "./ui";

type OpenCohort = { start: number; end: number; min: string; bonusBps: number; joinable: boolean; mine: { stake: string } | null };

/** Offered on the result screen after a pass, while there is a challenge to join. Links to the Stake page with the minimum filled in. */
export function StakePrompt() {
  const api = useApi();
  const { data: me } = useMe();
  const [hidden, setHidden] = useState(false);
  const live = Boolean(ADDR.streakVault);
  const { data } = useQuery({ queryKey: ["cohorts"], queryFn: () => api<{ cohorts: OpenCohort[] }>("/api/cohorts/open"), enabled: live && !!me?.verified });
  const c = data?.cohorts[0];
  if (hidden || !live || !me?.verified || !c || !c.joinable || (c.mine && BigInt(c.mine.stake) > 0n)) return null;

  const days = Math.round((c.end - c.start) / 86400);
  // The minimum, rounded up to 2 decimals so it is always inside the allowed range.
  const min = String(Number((BigInt(c.min) + 10n ** 16n - 1n) / 10n ** 16n) / 100);
  return (
    <section aria-labelledby="stake-prompt" className="rounded-card border border-line bg-sunken p-4 text-left">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-ink-2"><PiggyBank size={18} aria-hidden /></span>
        <div className="min-w-0">
          <h2 id="stake-prompt" className="text-[15px] font-semibold text-ink">{`Put G$ behind a ${days} day streak`}</h2>
          <p className="mt-1 text-pretty text-sm leading-relaxed text-ink-2">
            Join the {days} day challenge with {fmtGD(c.min, 0)} G$ or more. Finish all {days} days and you get your stake back{c.bonusBps > 0 ? `, plus a ${c.bonusBps / 100}% bonus` : ""}. Miss a day and you lose it.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ButtonLink href={`/stake?amount=${min}`} variant="secondary" size="md" iconRight={ArrowRight}>See the challenge</ButtonLink>
        <Button variant="ghost" size="md" onClick={() => setHidden(true)}>Not now</Button>
      </div>
    </section>
  );
}
