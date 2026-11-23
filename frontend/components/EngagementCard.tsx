"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWalletClient } from "wagmi";
import { CheckCircle2, Gift } from "@/components/icons";
import { useApi } from "@/lib/useApi";
import { Button, Card } from "./ui";

type Typed = { domain: { name: string; version: string; chainId: number; verifyingContract: `0x${string}` }; types: Record<string, { name: string; type: string }[]>; primaryType: string; message: { app: `0x${string}`; inviter: `0x${string}`; validUntilBlock: string; description: string } };
type Prepared = { ready: true; typedData: Typed } | { ready: false; why: string };

/**
 * GoodDollar engagement reward: a one-off reward for a verified learner who has passed a lesson. The learner signs a
 * short message and LearnIt sends the claim and pays the network fee. Shown only when they can claim; hidden otherwise.
 */
export function EngagementCard() {
  const api = useApi();
  const qc = useQueryClient();
  const { data: wallet } = useWalletClient();
  const { data } = useQuery({ queryKey: ["engagement"], queryFn: () => api<Prepared>("/api/engagement"), retry: false, staleTime: 60_000 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <Card className="flex items-center gap-3 p-4">
        <CheckCircle2 size={20} className="shrink-0 text-sage-600" aria-hidden />
        <p className="text-sm text-ink-2">Engagement reward claimed. It is in your wallet.</p>
      </Card>
    );
  }
  if (!data?.ready) return null;

  async function claim() {
    if (!wallet) return;
    setBusy(true); setErr(null);
    try {
      // The message is valid for a few minutes, so ask for a fresh one at the moment of tapping.
      const fresh = await api<Prepared>("/api/engagement");
      if (!fresh.ready) throw new Error("This reward is not available right now.");
      const t = fresh.typedData;
      const signature = await wallet.signTypedData({
        account: wallet.account,
        domain: t.domain,
        types: t.types,
        primaryType: t.primaryType,
        message: { ...t.message, validUntilBlock: BigInt(t.message.validUntilBlock) },
      });
      await api("/api/engagement", { method: "POST", body: JSON.stringify({ validUntilBlock: t.message.validUntilBlock, signature }) });
      setDone(true);
      void qc.invalidateQueries({ queryKey: ["engagement"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "We could not claim it. Try again in a moment.");
    } finally { setBusy(false); }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-input bg-sunken text-ink-2"><Gift size={18} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink">Your GoodDollar engagement reward</h2>
          <p className="text-sm text-muted">Sign once and we send it. We pay the network fee.</p>
        </div>
        <Button size="sm" loading={busy} disabled={!wallet} onClick={claim}>Claim</Button>
      </div>
      {err && <p role="alert" className="mt-3 text-sm text-danger">{err}</p>}
    </Card>
  );
}
