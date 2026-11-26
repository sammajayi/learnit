"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "@/components/icons";
import { ApiError, useApi } from "@/lib/useApi";
import { useGoodSdk } from "@/lib/useGoodSdk";
import { useMe } from "@/lib/useMe";
import { friendlyError } from "@/lib/txErrors";
import { nextClaimText } from "@/lib/countdown";
import { cn } from "@/lib/cn";
import { fmtGD } from "@learnit/backend/format";
import { LogoMark } from "./LogoMark";
import { Sk } from "./Skeletons";

type Status = { claimable: string; canClaim: boolean; nextClaimAt: number | null; dayEndsAt: number };

/** A claim that reached the chain but could not be recorded yet is kept here and recorded on the next visit, so it is never lost or claimed twice. */
const PENDING_KEY = "learnit.claim-pending";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const readPending = () => { try { return localStorage.getItem(PENDING_KEY); } catch { return null; } };
const writePending = (h: string | null) => { try { if (h) localStorage.setItem(PENDING_KEY, h); else localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ } };

/** Seconds until `to` (a unix time), counting down live. Null when there is no time. It starts from the real value, so it never flashes 0. */
function useSecondsUntil(to: number | null) {
  const calc = () => (to ? Math.max(0, to - Math.floor(Date.now() / 1000)) : null);
  const [left, setLeft] = useState<number | null>(calc);
  useEffect(() => {
    setLeft(calc());
    if (!to) return;
    const id = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);
  return left;
}

/** The EMV-style chip: a small gold plate with the usual contact lines. Decorative. */
function Chip() {
  return (
    <span aria-hidden className="relative block h-8 w-11 overflow-hidden rounded-[7px] bg-gradient-to-br from-[#f1d9a6] via-[#e6c27c] to-[#cfa458] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]">
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-black/20" />
      <span className="absolute inset-y-0 left-1/3 w-px bg-black/20" />
      <span className="absolute inset-y-0 right-1/3 w-px bg-black/20" />
      <span className="absolute left-1/3 right-1/3 top-[28%] bottom-[28%] rounded-[3px] border border-black/20" />
    </span>
  );
}

/** The contactless waves printed beside the chip. Decorative. */
function Contactless() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="opacity-80">
      <path d="M8 8.5a5 5 0 0 1 0 7" /><path d="M11.5 6a8.5 8.5 0 0 1 0 12" /><path d="M15 3.5a12 12 0 0 1 0 17" />
    </svg>
  );
}

/**
 * The daily GoodDollar claim, built as a bank card. Claim and the card is live; claim again tomorrow and it is dimmed with a count to the next one.
 * The number on it is only the last four characters of your wallet. A transaction hash is never shown anywhere in the app.
 */
export function ClaimCard() {
  const api = useApi();
  const sdk = useGoodSdk();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data, isLoading } = useQuery({ queryKey: ["ubi"], queryFn: () => api<Status>("/api/ubi/status"), refetchInterval: 60_000 });
  const left = useSecondsUntil(data?.nextClaimAt ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /** Tells the server about a claim that is on the chain. It can take a moment to be seen there, so it tries a few times, quietly. */
  async function record(hash: string) {
    for (let i = 0; i < 5; i++) {
      try { await api("/api/ubi/claimed", { method: "POST", body: JSON.stringify({ txHash: hash }) }); return true; }
      catch (e) { if (e instanceof ApiError && e.status !== 503 && e.status < 500) throw e; await sleep(2000); }
    }
    return false;
  }

  // A claim from an earlier visit that was not recorded yet: record it now.
  useEffect(() => {
    const pending = readPending();
    if (!pending) return;
    void record(pending).then((ok) => { if (ok) { writePending(null); void qc.invalidateQueries({ queryKey: ["ubi"] }); } }).catch(() => writePending(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the wait runs out, ask the server again so the card flips to "Claim" without a reload.
  useEffect(() => { if (data && !data.canClaim && left === 0) void qc.invalidateQueries({ queryKey: ["ubi"] }); }, [left, data, qc]);

  async function claim() {
    if (!sdk || !data) return;
    setBusy(true); setErr(null);
    try {
      const receipt = await sdk.claim.claim();
      const hash = (receipt as { transactionHash: string }).transactionHash;
      // The claim is on the chain. Show it as claimed at once, so the card never offers it again while the record catches up.
      qc.setQueryData<Status>(["ubi"], (s) => (s ? { ...s, claimable: "0", canClaim: false, nextClaimAt: s.dayEndsAt } : s));
      writePending(hash);
      if (await record(hash)) writePending(null);
      void qc.invalidateQueries({ queryKey: ["ubi"] });
      router.push("/learn");
    } catch (e) {
      setErr(friendlyError(e));
      void qc.invalidateQueries({ queryKey: ["ubi"] });
    } finally { setBusy(false); }
  }

  const box = "aspect-[1.75/1] w-full max-w-[400px] rounded-[20px]";
  if (isLoading || !data) return <Sk className={box} />;

  const holder = (me?.username ?? "learner").toUpperCase();
  const last4 = me?.wallet ? me.wallet.slice(-4).toUpperCase() : "••••";

  return (
    <div>
      <section
        aria-label="Daily GoodDollar"
        className={cn(
          box, "relative flex flex-col justify-between overflow-hidden p-5 text-canvas shadow-raised transition-[filter,opacity] duration-300 ease-soft",
          "bg-gradient-to-br from-sage-600 via-sage-700 to-[#2d4337]",
          !data.canClaim && "saturate-[.7]",
        )}
      >
        {/* Printed artwork: soft rings and a watermark of the symbol, like the pattern on a real card. */}
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[26px] border-white/[0.06]" />
        <span aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 h-60 w-60 rounded-full border-[22px] border-white/[0.05]" />

        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-2">
            <LogoMark mode="still" size={26} />
            <span className="text-[13px] font-semibold tracking-[-0.01em]">Daily GoodDollar</span>
          </div>
          {data.canClaim
            ? <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]">Ready</span>
            : <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"><Check size={12} aria-hidden /> Claimed</span>}
        </div>

        <div className="relative">
          <div className="flex items-center gap-3"><Chip /><Contactless /></div>
          <p className="tabular mt-3 font-mono text-[15px] tracking-[0.18em] opacity-90" aria-label={`Wallet ending ${last4}`}>•••• •••• •••• {last4}</p>
        </div>

        <div className="relative flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] opacity-60">Card holder</p>
            <p className="truncate text-[13px] font-semibold tracking-[0.06em]">{holder}</p>
          </div>
          {data.canClaim ? (
            <button
              type="button" onClick={claim} disabled={!sdk || busy}
              className="shrink-0 rounded-full bg-canvas px-4 py-2 text-sm font-semibold text-sage-700 shadow-card transition duration-150 ease-soft hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canvas focus-visible:ring-offset-2 focus-visible:ring-offset-sage-700 active:scale-[0.97] disabled:opacity-60"
            >
              {busy ? "Claiming…" : `Claim ${fmtGD(data.claimable)} G$`}
            </button>
          ) : (
            <div className="shrink-0 text-right">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] opacity-60">Next claim</p>
              <p className="tabular text-[13px] font-semibold" aria-live="off">{nextClaimText(left).replace(/^next in /, "in ").replace(/^next claim /, "")}</p>
            </div>
          )}
        </div>
      </section>
      {err && <p role="alert" className="mt-3 max-w-[400px] rounded-input bg-coral-50 px-3 py-2 text-sm text-coral-700">{err}</p>}
    </div>
  );
}
