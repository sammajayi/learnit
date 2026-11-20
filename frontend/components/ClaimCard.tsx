"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, ExternalLink } from "@/components/icons";
import { useApi } from "@/lib/useApi";
import { useGoodSdk } from "@/lib/useGoodSdk";
import { fmtGD } from "@learnit/backend/format";
import { ClaimCardSkeleton } from "./Skeletons";
import { Button } from "./ui";

type Status = { claimable: string; canClaim: boolean; nextClaimAt: number | null; lastClaimTx: string | null };

function useCountdown(to: number | null) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!to) return;
    const tick = () => setLeft(Math.max(0, to - Math.floor(Date.now() / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [to]);
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
  return { left, text: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` };
}

export function ClaimCard() {
  const api = useApi();
  const sdk = useGoodSdk();
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["ubi"], queryFn: () => api<Status>("/api/ubi/status"), refetchInterval: 60_000 });
  const cd = useCountdown(data?.nextClaimAt ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tx, setTx] = useState<string | null>(null);

  async function claim() {
    if (!sdk) return;
    setBusy(true); setErr(null);
    try {
      const receipt = await sdk.claim.claim();
      const hash = (receipt as { transactionHash: string }).transactionHash;
      setTx(hash);
      await api("/api/ubi/claimed", { method: "POST", body: JSON.stringify({ txHash: hash }) });
      await qc.invalidateQueries({ queryKey: ["ubi"] });
      router.push("/learn");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "We could not complete your claim. Try again in a moment.");
    } finally { setBusy(false); }
  }

  if (isLoading || !data) return <ClaimCardSkeleton />;

  return (
    <section aria-labelledby="ubi-title" className="grain relative overflow-hidden rounded-card bg-ink p-6 text-white shadow-raised">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sage-500/20 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p id="ubi-title" className="text-sm font-medium text-white/70">Daily GoodDollar</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/80">UBI</span>
        </div>
        {data.canClaim ? (
          <>
            <p className="font-mono tabular mt-4 text-[2.5rem] font-semibold leading-none tracking-[-0.03em]">{fmtGD(data.claimable)} <span className="text-lg font-medium text-white/60">G$</span></p>
            <p className="mt-2 text-sm text-white/70">Ready to claim today</p>
            <Button onClick={claim} loading={busy} disabled={!sdk} size="lg" block className="mt-6">
              {busy ? "Claiming…" : "Claim your daily G$"}
            </Button>
            <p className="mt-3 text-xs text-white/60">Needs a little CELO for the network fee.</p>
          </>
        ) : (
          <>
            <p className="mt-4 flex items-center gap-2 text-xl font-semibold tracking-[-0.02em]"><CheckCircle2 size={20} className="text-sage-300" aria-hidden /> Claimed for today</p>
            <p className="mt-2 text-sm text-white/70">Next claim in <span className="tabular font-mono font-medium text-white">{cd.text}</span></p>
            <Button onClick={() => router.push("/learn")} variant="inverse" size="lg" block iconRight={ArrowRight} className="mt-6">Go to today&apos;s lesson</Button>
          </>
        )}
        {tx && (
          <a href={`https://celoscan.io/tx/${tx}`} target="_blank" rel="noreferrer" aria-label="View your claim on Celoscan" className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-white/60 underline-offset-2 hover:text-white hover:underline">
            {tx.slice(0, 10)}…{tx.slice(-6)} <ExternalLink size={12} aria-hidden />
          </a>
        )}
        {err && <p role="alert" className="mt-4 rounded-input bg-white/10 px-3 py-2 text-sm text-white">{err}</p>}
      </div>
    </section>
  );
}
