"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, PiggyBank } from "@/components/icons";
import { ADDR } from "@learnit/backend/chain";
import { fmtGD } from "@learnit/backend/format";
import { useApi } from "@/lib/useApi";
import { useMe } from "@/lib/useMe";
import { useGoal } from "@/lib/useGoal";
import { Button, ButtonLink } from "./ui";

type OpenCohort = { start: number; end: number; min: string; bonusBps: number; joinable: boolean; settled: boolean; voided: boolean; mine: { stake: string } | null };

const SNOOZE_KEY = "learnit.stake-prompt-until";
const DAYS_MS = 3 * 86_400_000;

/**
 * Offered after a completed lesson (on the result screen and on Home) once the learner has set a goal, while there is a challenge of
 * their length to join. Links to the Stake page with the minimum filled in. "Not now" hides it for 3 days.
 */
export function StakePrompt() {
  const api = useApi();
  const { data: me } = useMe();
  const { data: goal } = useGoal();
  const [hidden, setHidden] = useState(true); // hidden until we have looked, so it never flashes
  useEffect(() => { try { setHidden(Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now()); } catch { setHidden(false); } }, []);
  const live = Boolean(ADDR.streakVault);
  const { data } = useQuery({ queryKey: ["cohorts"], queryFn: () => api<{ cohorts: OpenCohort[] }>("/api/cohorts/open"), enabled: live && !!me?.verified });
  const cohorts = data?.cohorts ?? [];
  const inOne = cohorts.some((x) => !!x.mine && BigInt(x.mine.stake) > 0n && !x.settled && !x.voided);
  const open = cohorts.filter((x) => x.joinable && !(x.mine && BigInt(x.mine.stake) > 0n));
  const lenOf = (x: OpenCohort) => Math.round((x.end - x.start) / 86400);
  const c = open.find((x) => lenOf(x) === goal?.goalDays) ?? open[0];
  if (hidden || !live || !me?.verified || !goal || inOne || !c) return null;

  const days = lenOf(c);
  // The minimum, rounded up to 2 decimals so it is always inside the allowed range.
  const min = String(Number((BigInt(c.min) + 10n ** 16n - 1n) / 10n ** 16n) / 100);
  return (
    <section aria-labelledby="stake-prompt" className="rounded-card border border-line bg-sunken p-4 text-left">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-ink-2"><PiggyBank size={18} aria-hidden /></span>
        <div className="min-w-0">
          <h2 id="stake-prompt" className="text-[15px] font-semibold text-ink">{`Stake ${fmtGD(c.min, 0)} G$ on your ${days} day goal`}</h2>
          <p className="mt-1 text-pretty text-sm leading-relaxed text-ink-2">
            Finish every day and your stake comes back{c.bonusBps > 0 ? `, plus a ${c.bonusBps / 100}% bonus` : ""}. Miss a day and you lose it.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ButtonLink href={`/stake?amount=${min}&days=${days}`} variant="secondary" size="md" iconRight={ArrowRight}>See the challenge</ButtonLink>
        <Button variant="ghost" size="md" onClick={() => { setHidden(true); try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + DAYS_MS)); } catch { /* it shows again next visit */ } }}>Not now</Button>
      </div>
    </section>
  );
}
