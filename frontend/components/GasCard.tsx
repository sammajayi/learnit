"use client";
import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Fuel, X } from "@/components/icons";
import { CELO_HELP_URL } from "@/lib/links";
import { useMe } from "@/lib/useMe";
import { ButtonLink, Card } from "./ui";

const KEY = "learnit.gas-card-dismissed";

/** Points new wallets at the Telegram group for free CELO (network fees). People who already have CELO can dismiss it. */
export function GasCard() {
  const [hidden, setHidden] = useState(false);
  const { data: me } = useMe();
  const [copied, setCopied] = useState(false);
  useEffect(() => { try { setHidden(localStorage.getItem(KEY) === "1"); } catch { /* private window: show it */ } }, []);
  if (hidden) return null;
  const dismiss = () => { setHidden(true); try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } };
  return (
    <Card className="p-6">
      <div className="flex gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-input bg-sunken text-ink-2"><Fuel size={18} strokeWidth={1.85} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink">Get free CELO to stake and claim</h2>
          <p className="mt-1 text-pretty text-sm leading-relaxed text-muted">Claiming and staking need a little CELO to pay network fees. Join our Telegram group and send your wallet address in the chat. It is free.</p>
          {me?.wallet && (
            <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(me.wallet); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the address is shown, so it can be copied by hand */ } }}
              className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-input border border-line bg-sunken px-3 font-mono text-[13px] text-ink-2 transition hover:border-line-strong focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/15" aria-label="Copy your wallet address">
              {me.wallet.slice(0, 6)}…{me.wallet.slice(-4)}
              {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
              <span className="font-sans text-xs text-muted">{copied ? "Copied" : "Copy"}</span>
            </button>
          )}
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss, I already have CELO" className="-mr-2 -mt-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-sunken hover:text-ink">
          <X size={16} aria-hidden />
        </button>
      </div>
      <ButtonLink href={CELO_HELP_URL} target="_blank" rel="noreferrer" variant="outline" block icon={ExternalLink} className="mt-5">Get free CELO on Telegram</ButtonLink>
    </Card>
  );
}
