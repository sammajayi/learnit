"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Coins, ExternalLink } from "@/components/icons";
import { useApi } from "@/lib/useApi";
import { useGoodSdk } from "@/lib/useGoodSdk";
import { nextClaimText } from "@/lib/countdown";
import { fmtGD } from "@learnit/backend/format";
import { Sk } from "./Skeletons";
import { Button, Card } from "./ui";

type Status = { claimable: string; canClaim: boolean; nextClaimAt: number | null; lastClaimTx: string | null };

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

/** The daily GoodDollar claim as one compact row: a Claim button, or when claimed, a live count to the next claim. */
export function ClaimCard() {
  const api = useApi();
  const sdk = useGoodSdk();
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["ubi"], queryFn: () => api<Status>("/api/ubi/status"), refetchInterval: 60_000 });
  const left = useSecondsUntil(data?.nextClaimAt ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tx, setTx] = useState<string | null>(null);

  // When the wait runs out, ask the server again so the row flips to "Claim" without a reload.
  useEffect(() => { if (data && !data.canClaim && left === 0) void qc.invalidateQueries({ queryKey: ["ubi"] }); }, [left, data, qc]);

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
      setErr(e instanceof Error ? e.message : "We could not complete your claim. Check that you have a little CELO for fees, then try again.");
    } finally { setBusy(false); }
  }

  if (isLoading || !data) return <Sk className="h-[72px] w-full rounded-card" />;

  return (
    <Card className="px-4 py-3.5">
      <section aria-label="Daily GoodDollar" className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-input bg-sunken text-ink-2">
          {data.canClaim ? <Coins size={18} strokeWidth={1.85} aria-hidden /> : <CheckCircle2 size={18} strokeWidth={1.85} aria-hidden className="text-sage-700" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Daily GoodDollar</p>
          {!data.canClaim && <p className="tabular truncate text-sm text-muted" aria-live="off">Claimed · {nextClaimText(left)}</p>}
        </div>
        {data.canClaim && (
          <Button onClick={claim} loading={busy} disabled={!sdk} size="sm" className="shrink-0">{busy ? "Claiming…" : `Claim ${fmtGD(data.claimable)} G$`}</Button>
        )}
      </section>
      {tx && (
        <a href={`https://celoscan.io/tx/${tx}`} target="_blank" rel="noreferrer" aria-label="View your claim on Celoscan" className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-muted underline-offset-2 hover:text-ink hover:underline">
          {tx.slice(0, 10)}…{tx.slice(-6)} <ExternalLink size={12} aria-hidden />
        </a>
      )}
      {err && <p role="alert" className="mt-3 rounded-input bg-coral-50 px-3 py-2 text-sm text-coral-700">{err}</p>}
    </Card>
  );
}
