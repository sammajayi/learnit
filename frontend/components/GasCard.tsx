"use client";
import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Fuel, X } from "lucide-react";
import { useBalance } from "wagmi";
import { parseUnits } from "viem";
import { CELO_HELP_URL } from "@/lib/links";
import { useMe } from "@/lib/useMe";
import { Button, ButtonLink, Card } from "./ui";

const KEY = "learnit.gas-card-dismissed";
/** Enough CELO for a handful of claims and stakes. Below this the card shows; at or above it, it goes away on its own. */
const ENOUGH = parseUnits("0.005", 18);

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Walks a new wallet through getting free CELO (network fees): copy the address, send it to the Telegram group. Hides itself once the wallet has CELO. */
export function GasCard() {
  const { data: me } = useMe();
  const { data: bal, isPending, refetch } = useBalance({ address: me?.wallet, query: { enabled: !!me?.wallet, refetchInterval: 15_000 } });
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => { try { setHidden(localStorage.getItem(KEY) === "1"); } catch { /* private window: show it */ } }, []);
  if (hidden || !me?.wallet) return null;
  if (isPending) return null; // wait for the balance, so the card never flashes for someone who already has CELO
  if (bal && bal.value >= ENOUGH) return null;

  const dismiss = () => { setHidden(true); try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } };
  const copy = async () => {
    try { await navigator.clipboard.writeText(me.wallet); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* the address is shown, so it can be copied by hand */ }
  };
  return (
    <Card className="p-5">
      <div className="flex gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-input bg-sunken text-ink-2"><Fuel size={17} strokeWidth={1.85} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink">Get free CELO for fees</h2>
          <p className="mt-1 text-pretty text-sm leading-relaxed text-muted">Claiming and staking need a little CELO to pay network fees. It is free.</p>
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss, I already have CELO" className="-mr-2 -mt-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-sunken hover:text-ink">
          <X size={16} aria-hidden />
        </button>
      </div>
      <ol className="mt-4 grid gap-2 text-sm text-ink-2">
        <li className="flex gap-2.5"><span className="tabular grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sunken text-xs font-semibold text-ink">1</span>Copy your wallet address, <span className="font-mono text-[13px]">{short(me.wallet)}</span>.</li>
        <li className="flex gap-2.5"><span className="tabular grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sunken text-xs font-semibold text-ink">2</span>Send it in our Telegram group.</li>
        <li className="flex gap-2.5"><span className="tabular grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sunken text-xs font-semibold text-ink">3</span>We send you CELO. This card goes away when it arrives.</li>
      </ol>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button variant="outline" icon={copied ? Check : Copy} onClick={copy} block>{copied ? "Copied" : "Copy wallet address"}</Button>
        <ButtonLink href={CELO_HELP_URL} target="_blank" rel="noreferrer" variant="outline" block icon={ExternalLink} onClick={() => void refetch()}>Open Telegram</ButtonLink>
      </div>
    </Card>
  );
}
