"use client";
import { useEffect, useState } from "react";
import { ExternalLink, Fuel, X } from "@/components/icons";
import { CELO_HELP_URL } from "@/lib/links";
import { useBalances } from "@/lib/useBalances";
import { ButtonLink } from "./ui";

const KEY = "learnit.gas-card-dismissed";

/**
 * One line that asks a wallet with no CELO to get some for network fees, with a Join Telegram button. It shows only while the
 * balance is exactly zero, sits above the daily claim, and can be dismissed.
 */
export function GasCard() {
  const { data: bal } = useBalances();
  const [hidden, setHidden] = useState(true); // hidden until we know, so it never flashes in for someone who dismissed it
  useEffect(() => { try { setHidden(localStorage.getItem(KEY) === "1"); } catch { setHidden(false); /* private window: show it */ } }, []);
  if (hidden || !bal || bal.celo === undefined || bal.celo > 0n) return null;
  const dismiss = () => { setHidden(true); try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } };
  return (
    <div role="status" className="flex items-center gap-3 rounded-card border border-line bg-surface py-2 pl-4 pr-2 shadow-card">
      <Fuel size={16} strokeWidth={1.85} aria-hidden className="shrink-0 text-ink-2" />
      <p className="min-w-0 flex-1 text-sm font-medium text-ink">Get free CELO for fees.</p>
      <ButtonLink href={CELO_HELP_URL} target="_blank" rel="noreferrer" variant="outline" size="sm" icon={ExternalLink} className="shrink-0">Join Telegram</ButtonLink>
      <button type="button" onClick={dismiss} aria-label="Dismiss. I already have CELO" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors duration-100 hover:bg-sunken hover:text-ink active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/15">
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
