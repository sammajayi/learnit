"use client";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { BookOpen, CheckCircle2, ChevronDown, Clock, ExternalLink, Gift, Trophy } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { friendlyError, STALE_ERRORS } from "@/lib/txErrors";
import { rewardsPoolAbi } from "@learnit/backend/abis";
import { ADDR } from "@learnit/backend/chain";
import { fmtGD } from "@learnit/backend/format";
import { AppShell } from "@/components/AppShell";
import { RewardsTabs } from "@/components/RewardsTabs";
import { Badge, Button, ButtonLink, Card, EmptyState, GMark, Notice, PageHeader, Progress } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useAuthGate } from "@/components/useAuthGate";
import { EarnSkeleton } from "@/components/Skeletons";

type V = { id: string; root: `0x${string}`; amount: string; nonce: string; expiry: number; signature: `0x${string}`; reason: string };
type Data = { verified: boolean; vouchers: V[]; earnedToday: string; dailyCap: string; capRemaining: string };
type Step = null | "checking" | "wallet" | "confirming";

const REASON: Record<string, { label: string; Icon: typeof BookOpen }> = { lesson: { label: "Lesson passed", Icon: BookOpen }, checkpoint: { label: "Checkpoint passed", Icon: CheckCircle2 }, league: { label: "Leaderboard bonus", Icon: Trophy } };

function expiresIn(expiry: number) {
  const s = expiry - Math.floor(Date.now() / 1000);
  if (s <= 0) return "Expired";
  const h = Math.floor(s / 3600), d = Math.floor(h / 24);
  return d >= 1 ? `Expires in ${d} day${d === 1 ? "" : "s"}` : h >= 1 ? `Expires in ${h}h` : "Expires soon";
}
const STEP_LABEL: Record<Exclude<Step, null>, string> = { checking: "Checking…", wallet: "Confirm in your wallet", confirming: "Waiting for confirmation" };
const toArg = (v: V) => ({ root: v.root, amount: BigInt(v.amount), nonce: BigInt(v.nonce), expiry: BigInt(v.expiry) });

export default function Earn() {
  const ok = useAuthGate();
  const api = useApi();
  const qc = useQueryClient();
  const pc = usePublicClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [step, setStep] = useState<Step>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tx, setTx] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const live = Boolean(ADDR.rewardsPool);
  const busy = step !== null;

  const { data } = useQuery({ queryKey: ["vouchers"], queryFn: () => api<Data>("/api/vouchers"), enabled: ok });

  // Is the pool paused? Checked before we offer a Claim button, so nobody hits a revert.
  const paused = useQuery({ queryKey: ["paused", "pool"], enabled: ok && live && !!pc, staleTime: 30_000,
    queryFn: () => pc!.readContract({ address: ADDR.rewardsPool, abi: rewardsPoolAbi, functionName: "paused" }) });

  // Has any voucher already been claimed (for example on another device)? The contract is the source of truth.
  const list = data?.vouchers ?? [];
  const used = useQuery({ queryKey: ["nonces", list.map((v) => v.id).join()], enabled: ok && live && !!pc && list.length > 0,
    queryFn: async () => {
      const res = await pc!.multicall({ allowFailure: true, contracts: list.map((v) => ({ address: ADDR.rewardsPool, abi: rewardsPoolAbi, functionName: "nonceUsed" as const, args: [v.root, BigInt(v.nonce)] as const })) });
      return Object.fromEntries(list.map((v, i) => [v.id, res[i].status === "success" && res[i].result === true])) as Record<string, boolean>;
    } });
  useEffect(() => { if (Object.values(used.data ?? {}).some(Boolean)) void qc.invalidateQueries({ queryKey: ["vouchers"] }); }, [used.data, qc]);

  if (!data) return <EarnSkeleton />;

  const now = Math.floor(Date.now() / 1000);
  const stateOf = (v: V): "ready" | "expired" | "claimed" => (v.expiry < now ? "expired" : used.data?.[v.id] ? "claimed" : "ready");
  const ready = list.filter((v) => stateOf(v) === "ready");
  const isPaused = paused.data === true;
  const total = ready.reduce((s, v) => s + BigInt(v.amount), 0n);

  async function claim(batch: V[]) {
    if (!pc || !address || !live) return setErr("Rewards are not live yet.");
    setErr(null); setTx(null); setDone(null); setStep("checking");
    try {
      const call = batch.length === 1
        ? { functionName: "claim", args: [toArg(batch[0]), batch[0].signature] }
        : { functionName: "claimBatch", args: [batch.map(toArg), batch.map((v) => v.signature)] };
      // Simulate first: a revert becomes a clear message instead of a failed, fee-costing transaction.
      const { request } = await pc.simulateContract({ account: address, address: ADDR.rewardsPool, abi: rewardsPoolAbi, ...call } as never);
      setStep("wallet");
      const hash = await writeContractAsync(request as never);
      setTx(hash); setStep("confirming");
      const receipt = await pc.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("The transaction failed on the network.");
      await qc.invalidateQueries({ queryKey: ["vouchers"] });
      setDone(`${fmtGD(batch.reduce((n, v) => n + BigInt(v.amount), 0n))} G$ is in your wallet.`);
    } catch (e) {
      const msg = friendlyError(e);
      setErr(msg);
      if (STALE_ERRORS.test(msg)) await qc.invalidateQueries({ queryKey: ["vouchers"] });
    } finally { setStep(null); }
  }

  const cap = BigInt(data.dailyCap);
  const earned = BigInt(data.earnedToday);
  // The pool counts UTC days. Show the reset in the person's own time.
  const resetAt = new Date((Math.floor(Date.now() / 86_400_000) + 1) * 86_400_000).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const history = list.filter((v) => stateOf(v) !== "ready");

  const row = (v: V) => {
    const st = stateOf(v);
    const reason = REASON[v.reason] ?? { label: "Reward", Icon: Gift };
    const soon = st === "ready" && v.expiry - now < 86_400;
    return (
      <li key={v.id} className={cn("flex items-center gap-4 px-6 py-4", st !== "ready" && "bg-canvas/50")}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-input bg-sunken text-ink-2"><reason.Icon size={18} strokeWidth={1.85} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{reason.label}</p>
          <p className={cn("mt-0.5 flex items-center gap-1 text-xs", soon ? "font-medium text-coral-700" : "text-muted")}><Clock size={12} aria-hidden />{st === "claimed" ? "Paid to your wallet" : st === "expired" ? "Not claimed in time" : expiresIn(v.expiry)}</p>
        </div>
        <p className="font-mono tabular flex items-center gap-2 text-[15px] font-semibold text-ink"><GMark size={20} />{fmtGD(v.amount)}</p>
        <div className="w-[96px] text-right">
          {st === "ready" && !isPaused && <Button size="sm" variant={ready.length > 1 ? "outline" : "primary"} disabled={busy || !live} onClick={() => claim([v])} aria-label={`Claim ${reason.label.toLowerCase()}, ${fmtGD(v.amount)} G$`}>Claim</Button>}
          {st === "ready" && isPaused && <Badge tone="outline">Paused</Badge>}
          {st === "expired" && <Badge tone="neutral">Expired</Badge>}
          {st === "claimed" && <Badge tone="sage" icon={CheckCircle2}>Claimed</Badge>}
        </div>
      </li>
    );
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Staking & Rewards" title="Rewards" description="G$ you earn from lessons, checkpoints and the weekly leaderboard. Claim to your wallet whenever you like, before each reward expires." action={<RewardsTabs />} />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card className="grain relative overflow-hidden bg-ink p-6 text-white sm:col-span-1">
          <p className="text-sm font-medium text-white/70">Ready to claim</p>
          <p className="font-mono tabular mt-3 text-[2.25rem] font-semibold leading-none tracking-[-0.03em]">{fmtGD(total)} <span className="text-base font-medium text-white/60">G$</span></p>
          <p className="mt-2 text-sm text-white/60">{ready.length} reward{ready.length === 1 ? "" : "s"} waiting</p>
        </Card>
        <Card className="p-6 sm:col-span-2">
          <p className="text-sm font-medium text-muted">Today&apos;s limit</p>
          <p className="font-mono tabular mt-3 text-[1.75rem] font-semibold leading-none tracking-[-0.025em] text-ink">{fmtGD(data.earnedToday)} <span className="font-sans text-sm font-medium text-muted">of {fmtGD(data.dailyCap)} G$ earned</span></p>
          <Progress className="mt-4" value={cap > 0n ? Number((earned * 1000n) / cap) / 1000 : 0} label="Share of today's limit earned" />
          <p className="mt-3 text-xs text-muted"><span className="tabular">{fmtGD(data.capRemaining)}</span> G$ left. Resets at {resetAt}.</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-3">
        {!data.verified && <Notice tone="warning" title="Verify to earn" action={<ButtonLink href="/home" variant="outline" size="sm">Go to verification</ButtonLink>}>Rewards need a quick GoodDollar face check. You can keep learning in the meantime.</Notice>}
        {!live && <Notice tone="info">Rewards aren&apos;t live yet. Anything you earn will be kept here.</Notice>}
        {isPaused && <Notice tone="paused" title="Rewards are paused">Your rewards are safe and will be here when claiming resumes.</Notice>}
      </div>

      <Card className="mt-8 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Your rewards</h2>
            <p className="mt-0.5 text-sm text-muted">Each one is a signed voucher, paid out by the rewards pool contract.</p>
          </div>
          {ready.length > 1 && !isPaused && (
            <Button onClick={() => claim(ready)} loading={busy} disabled={!live}>{busy ? STEP_LABEL[step!] : `Claim all · ${fmtGD(total)} G$`}</Button>
          )}
        </div>

        {list.length === 0 ? (
          <EmptyState icon={Gift} title="No rewards yet" className="m-6 border-line" action={<ButtonLink href="/learn" variant="outline" size="sm">Go to your lessons</ButtonLink>}>
            {data.verified ? "Pass a lesson to earn G$. New rewards show up here straight away." : "Once you're verified, every lesson you pass earns G$ here."}
          </EmptyState>
        ) : (
          <>
            {ready.length > 0 ? <ul className="divide-y divide-line">{ready.map(row)}</ul> : <p className="px-6 py-5 text-sm text-muted">Nothing to claim right now.</p>}
            {history.length > 0 && (
              <div className="border-t border-line">
                <button type="button" onClick={() => setShowHistory((v) => !v)} aria-expanded={showHistory}
                  className="flex w-full items-center justify-between px-6 py-3.5 text-left text-sm font-medium text-ink-2 transition hover:bg-canvas">
                  History ({history.length})
                  <ChevronDown size={16} aria-hidden className={cn("transition-transform duration-200", showHistory && "rotate-180")} />
                </button>
                {showHistory && <ul className="divide-y divide-line border-t border-line">{history.map(row)}</ul>}
              </div>
            )}
          </>
        )}
      </Card>

      <div className="mt-4 grid gap-3" aria-live="polite">
        {busy && ready.length <= 1 && <Notice tone="info">{STEP_LABEL[step!]}</Notice>}
        {done && <Notice tone="success">{done}</Notice>}
        {tx && (
          <p className="text-sm text-muted">Transaction{" "}
            <a className="inline-flex items-center gap-1 font-mono text-ink underline-offset-2 hover:underline" href={`https://celoscan.io/tx/${tx}`} target="_blank" rel="noreferrer">{tx.slice(0, 10)}…{tx.slice(-6)} <ExternalLink size={12} aria-hidden /></a>
          </p>
        )}
        {err && <Notice tone="danger">{err}</Notice>}
      </div>
    </AppShell>
  );
}
