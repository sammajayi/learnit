"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { erc20Abi, formatUnits, parseUnits } from "viem";
import { CalendarDays, Check, ChevronDown, Flame, Minus, SlidersHorizontal, Trophy, Users, PiggyBank } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useMe } from "@/lib/useMe";
import { friendlyError } from "@/lib/txErrors";
import { streakVaultAbi } from "@learnit/backend/abis";
import { ADDR } from "@learnit/backend/chain";
import { fmtGD } from "@learnit/backend/format";
import { AppShell } from "@/components/AppShell";
import { RewardsTabs } from "@/components/RewardsTabs";
import { Badge, Button, ButtonLink, Card, EmptyState, GMark, Label, Notice, PageHeader, fieldClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useAuthGate } from "@/components/useAuthGate";
import { StakeSkeleton } from "@/components/Skeletons";

type Cohort = {
  id: number; start: number; end: number; min: string; max: string; pot: string; settled: boolean; voided: boolean; resultsFinal: boolean; bonusBps: number; voidableAt: number | null; joinable: boolean; members: number;
  mine: { stake: string; finished: boolean; withdrawn: boolean; payout: string } | null;
  progress: { required: string[]; done: boolean[]; completed: number } | null;
};
type Step = null | "checking" | "approve" | "stake" | "withdraw" | "cancel";

// Challenge windows run on UTC days, so every date on this page is shown in UTC.
const fmtDate = (s: number) => new Date(s * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
const STEP_LABEL: Record<Exclude<Step, null>, string> = {
  checking: "Checking…",
  approve: "Step 1 of 2: allow in wallet",
  stake: "Step 2 of 2: confirm in wallet",
  withdraw: "Confirm in your wallet",
  cancel: "Step 1 of 2: cancel in wallet",
};

function parseAmount(v: string): bigint | null {
  if (!/^\d*\.?\d*$/.test(v.trim()) || v.trim() === "" || v.trim() === ".") return null;
  try { return parseUnits(v.trim(), 18); } catch { return null; }
}

export default function Stake() {
  const ok = useAuthGate();
  const api = useApi();
  const qc = useQueryClient();
  const pc = usePublicClient();
  const { address } = useAccount();
  const { data: me } = useMe();
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>(null);
  const [paying, setPaying] = useState<number | null>(null); // which payout is being withdrawn, so only that row shows progress
  const [err, setErr] = useState<string | null>(null);
  const live = Boolean(ADDR.streakVault);
  const busy = step !== null;

  const { data } = useQuery({ queryKey: ["cohorts"], queryFn: () => api<{ cohorts: Cohort[] }>("/api/cohorts/open"), enabled: ok });
  // Checked before the stake form is shown, so nobody hits a revert.
  const paused = useQuery({ queryKey: ["paused", "vault"], enabled: ok && live && !!pc, staleTime: 30_000,
    queryFn: () => pc!.readContract({ address: ADDR.streakVault, abi: streakVaultAbi, functionName: "paused" }) });

  if (!data) return <StakeSkeleton />;

  const c = data.cohorts[0];
  const staked = !!c?.mine && BigInt(c.mine.stake) > 0n;
  // Closed challenges where a payout is still waiting. They stay visible even after a newer challenge opens.
  const owedOlder = data.cohorts.filter((x) => x.id !== c?.id && !!x.mine && BigInt(x.mine.payout) > 0n);
  const isPaused = paused.data === true;

  // Why the form cannot be used, in the order a person would fix them.
  const verifiedUntilSec = me?.verifiedUntil ? Date.parse(me.verifiedUntil) / 1000 : null;
  const expiresBeforeEnd = !!c && verifiedUntilSec !== null && verifiedUntilSec < c.end;
  const wei = parseAmount(amount);
  const outOfBounds = !!c && wei !== null && (wei < BigInt(c.min) || wei > BigInt(c.max));
  const blocker =
    !live ? "Staking is not live yet."
    : !me?.verified ? "Staking needs a GoodDollar face check."
    : expiresBeforeEnd ? `Your verification expires ${new Date(verifiedUntilSec! * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}, before this challenge ends. Renew it to join.`
    : null;

  async function run(fn: () => Promise<void>) {
    setErr(null);
    try { await fn(); await qc.invalidateQueries({ queryKey: ["cohorts"] }); }
    catch (e) { setErr(friendlyError(e)); await qc.invalidateQueries({ queryKey: ["cohorts"] }); }
    finally { setStep(null); setPaying(null); }
  }

  const stake = () => run(async () => {
    if (!c || !pc || !address) throw new Error("Connect your wallet first.");
    if (blocker) throw new Error(blocker);
    if (wei === null) throw new Error("Enter an amount in G$.");
    if (outOfBounds) throw new Error(`Stake between ${fmtGD(c.min)} and ${fmtGD(c.max)} G$.`);
    setStep("checking");
    // Approve only when the current allowance is too small. Two prompts, two receipts.
    const allowance = await pc.readContract({ address: ADDR.gd, abi: erc20Abi, functionName: "allowance", args: [address, ADDR.streakVault] });
    if (allowance < wei) {
      setStep("approve");
      const h = await writeContractAsync({ address: ADDR.gd, abi: erc20Abi, functionName: "approve", args: [ADDR.streakVault, wei] });
      const r = await pc.waitForTransactionReceipt({ hash: h });
      if (r.status !== "success") throw new Error("The approval didn't go through. Nothing was staked.");
    }
    setStep("checking");
    const { request } = await pc.simulateContract({ account: address, address: ADDR.streakVault, abi: streakVaultAbi, functionName: "stake", args: [BigInt(c.id), wei] });
    setStep("stake");
    const h2 = await writeContractAsync(request);
    const r2 = await pc.waitForTransactionReceipt({ hash: h2 });
    if (r2.status !== "success") throw new Error("The stake didn't go through. Your G$ stayed in your wallet.");
    setAmount("");
  });

  async function sendWithdraw(id: number) {
    setStep("checking");
    const { request } = await pc!.simulateContract({ account: address!, address: ADDR.streakVault, abi: streakVaultAbi, functionName: "withdraw", args: [BigInt(id)] });
    setStep("withdraw");
    const h = await writeContractAsync(request);
    const r = await pc!.waitForTransactionReceipt({ hash: h });
    if (r.status !== "success") throw new Error("The withdrawal didn't go through. Your payout is still waiting for you.");
  }

  const withdraw = (id: number | undefined = c?.id) => run(async () => {
    if (id === undefined || !pc || !address) return;
    setPaying(id);
    await sendWithdraw(id);
  });

  // Results were not confirmed in time. The contract lets anyone cancel the challenge then, after which every
  // staker takes their own stake back. Two transactions: cancel, then withdraw.
  const refund = (id: number) => run(async () => {
    if (!pc || !address) throw new Error("Connect your wallet first.");
    setPaying(id);
    setStep("checking");
    const { request } = await pc.simulateContract({ account: address, address: ADDR.streakVault, abi: streakVaultAbi, functionName: "voidCohort", args: [BigInt(id)] });
    setStep("cancel");
    const h = await writeContractAsync(request);
    const r = await pc.waitForTransactionReceipt({ hash: h });
    if (r.status !== "success") throw new Error("The cancellation didn't go through. Your stake is still in the challenge.");
    await sendWithdraw(id);
  });

  const ended = !!c && c.end * 1000 < Date.now();
  const status = !c ? null : c.voided ? { label: "Cancelled", tone: "neutral" as const } : c.settled ? { label: "Closed", tone: "neutral" as const } : ended ? { label: "Results pending", tone: "outline" as const } : c.joinable ? { label: "Open to join", tone: "coral" as const } : { label: "Running", tone: "sage" as const };
  const days = c ? Math.round((c.end - c.start) / 86400) : 7;

  const formShown = !staked && !!c?.joinable && !isPaused;
  // The bonus rate was locked when the challenge was created and each stake's bonus is set aside up front, so this is a floor, not an estimate.
  const bonusBps = c?.bonusBps ?? 0;
  const bonusWei = wei !== null && !outOfBounds && bonusBps > 0 ? (wei * BigInt(bonusBps)) / 10_000n : 0n;
  const overdue = !!c && c.voidableAt !== null && Date.now() / 1000 >= c.voidableAt;
  const amt = wei !== null && !outOfBounds ? Number(formatUnits(wei, 18)).toLocaleString("en", { maximumFractionDigits: 4 }) : null;
  const stats = (cls: string, compact = false) => c ? (
      <>
      {!compact && <p className={`px-4 py-3 text-sm text-muted sm:hidden ${cls}`}><span className="tabular font-semibold text-ink">{fmtGD(c.pot)} G$</span> staked by <span className="tabular font-semibold text-ink">{c.members}</span> {c.members === 1 ? "person" : "people"}</p>}
      <dl className={`${compact ? "grid" : "hidden sm:grid"} grid-cols-2 divide-line sm:divide-x ${compact ? "" : "sm:grid-cols-4"} ${cls}`}>
        {[
          { Icon: PiggyBank, k: "Total staked", v: <><span className="tabular">{fmtGD(c.pot)}</span> <span className="text-sm font-medium text-muted">G$</span></> },
          { Icon: Users, k: "People in", v: <span className="tabular">{c.members}</span> },
          { Icon: CalendarDays, k: "Length", v: <>{days} <span className="text-sm font-medium text-muted">days</span></> },
          { Icon: SlidersHorizontal, k: "Stake limits", v: <span className="tabular text-lg">{fmtGD(c.min, 0)}–{fmtGD(c.max, 0)}</span> },
        ].slice(0, compact ? 2 : 4).map(({ Icon, k, v }) => (
          <div key={k} className="px-4 py-3.5 sm:px-6 sm:py-5">
            <dt className="flex items-center gap-1.5 text-[13px] font-medium text-muted"><Icon size={14} aria-hidden />{k}</dt>
            <dd className="mt-1.5 text-xl font-semibold sm:text-2xl tracking-[-0.02em] text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      </>
  ) : null;
  const howItWorks = (open: boolean) => (
    <details className="group" open={open}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-input focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/15 [&::-webkit-details-marker]:hidden">
        <h2 className="text-[15px] font-semibold text-ink">How it works</h2>
        <ChevronDown size={16} aria-hidden className="text-muted transition-transform duration-150 group-open:rotate-180" />
      </summary>
      <div className="pb-4">
      <ol className="mt-2 grid gap-5">
        {[
          { Icon: PiggyBank, t: "Stake G$", b: c ? `Pick ${fmtGD(c.min, 0)} to ${fmtGD(c.max, 0)} G$ while it is open.` : "Pick an amount while a challenge is open." },
          { Icon: Flame, t: `Learn for ${days} days`, b: "Pass a lesson every day, in your timezone." },
          { Icon: Trophy, t: "Get it back", b: `Finish all ${days} days and withdraw it${bonusBps > 0 ? `, plus ${bonusBps / 100}% bonus` : ""}.` },
        ].map(({ Icon, t, b }, i) => (
          <li key={t} className="flex gap-4">
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken text-ink-2">
              <Icon size={16} aria-hidden />
              {i < 2 && <span aria-hidden className="absolute left-1/2 top-full h-5 w-px -translate-x-1/2 bg-line-strong" />}
            </span>
            <span><span className="block text-sm font-semibold text-ink">{t}</span><span className="mt-0.5 block text-pretty text-sm leading-relaxed text-muted">{b}</span></span>
          </li>
        ))}
      </ol>
      <p className="mt-6 border-t border-line pt-4 text-sm leading-relaxed text-muted">Miss a day and you lose your stake.</p>
      </div>
    </details>
  );

  return (
    <AppShell>
      <PageHeader eyebrow="Staking & Rewards" title="Stay committed" description={`Finish ${days} days, get your stake back.`} action={<RewardsTabs />} />

      {isPaused && <Notice tone="paused" className="mt-6" title="Staking is paused">Your stake is safe. It will resume soon.</Notice>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <div className="grid content-start gap-6">
          {!c && <EmptyState icon={CalendarDays} title="No open challenge">Check back soon.</EmptyState>}

          {owedOlder.length > 0 && (
            <section aria-labelledby="owed-title" className="rounded-card bg-sage-50 p-5 ring-1 ring-inset ring-sage-100 sm:p-6">
              <h2 id="owed-title" className="text-[15px] font-semibold text-ink">Money waiting for you</h2>
              <ul className="mt-2 divide-y divide-sage-100">
                {owedOlder.map((o) => {
                  const len = Math.round((o.end - o.start) / 86400);
                  const here = paying === o.id;
                  return (
                    <li key={o.id} className="grid gap-3 py-4 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{len} day challenge <span className="font-normal text-muted">&middot; {fmtDate(o.start)} to {fmtDate(o.end)}</span></p>
                        <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink"><span className="tabular">{fmtGD(o.mine!.payout)}</span> <span className="text-sm font-medium text-muted">G$</span></p>
                      </div>
                      <Button variant="outline" onClick={() => withdraw(o.id)} loading={here} disabled={busy && !here} block className="sm:w-auto">{here && step ? STEP_LABEL[step] : "Withdraw"}</Button>
                    </li>
                  );
                })}
              </ul>
              {err && <Notice tone="danger" className="mt-4">{err}</Notice>}
            </section>
          )}

          {c && (
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-5">
                <div>
                  <p className="text-[15px] font-semibold text-ink">{days} day challenge</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted"><CalendarDays size={14} aria-hidden />{fmtDate(c.start)} to {fmtDate(c.end)} <span className="text-xs">UTC</span></p>
                </div>
                {status && <Badge tone={status.tone} className="px-3 py-1">{status.label}</Badge>}
              </div>

              {!staked && stats("border-b border-line")}

              <div className="p-6">
                {/* Already staked: progress comes from the server's streak days, no contract read needed. */}
                {staked && c.progress && (
                  <div>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted">Your stake</p>
                        <p className="tabular mt-1 flex items-center gap-2 text-[2rem] font-semibold leading-none tracking-[-0.03em] text-ink"><GMark size={26} />{fmtGD(c.mine!.stake)}</p>
                      </div>
                      <p className="text-sm text-muted"><span className="tabular font-semibold text-ink">{c.progress.completed}</span> of {days} days</p>
                    </div>
                    <ol className="mt-5 grid grid-cols-7 gap-2" aria-label="Daily progress">
                      {c.progress.done.map((d, i) => {
                        const day = c.progress!.required[i];
                        const missed = !d && (ended || day < new Date().toLocaleDateString("en-CA"));
                        const name = new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" });
                        const state = d ? "done" : missed ? "missed" : "still to come";
                        return (
                          <li key={i} className="flex flex-col items-center gap-1.5">
                            <span className={cn("grid aspect-square w-full max-w-[52px] place-items-center rounded-input transition",
                              d ? "bg-sage-600 text-white" : missed ? "border border-coral-100 bg-coral-50 text-coral-700" : "border border-dashed border-line-strong bg-canvas text-muted")}>
                              {d ? <Check size={18} strokeWidth={3} aria-hidden /> : missed ? <Minus size={18} strokeWidth={3} aria-hidden /> : null}
                              <span className="sr-only">{name}: {state}</span>
                            </span>
                            <span className="text-[11px] text-muted" aria-hidden>{name}</span>
                          </li>
                        );
                      })}
                    </ol>
                    {(() => {
                      if (c.settled || ended) return null;
                      const i = c.progress.required.indexOf(new Date().toLocaleDateString("en-CA"));
                      if (i < 0) return null;
                      return <p className="mt-4 text-sm text-ink-2">{c.progress.done[i] ? "Done today." : "Pass a lesson today."}</p>;
                    })()}
                  </div>
                )}

                {/* Not staked yet. */}
                {!staked && !c.joinable && <Notice tone="info" title="Joining has closed">The next challenge opens soon.</Notice>}
                {formShown && (
                  <form onSubmit={(e) => { e.preventDefault(); if (!busy) void stake(); }} noValidate>
                    <div className="mb-5 rounded-input bg-sunken px-4 lg:hidden">{howItWorks(false)}</div>
                    {blocker && <Notice tone="warning" className="mb-5" action={!me?.verified && live ? <ButtonLink href="/home" variant="outline" size="sm">Verify on Home</ButtonLink> : undefined}>{blocker}</Notice>}
                    <Label htmlFor="amt">Amount</Label>
                    <div className="relative mt-2">
                      <input id="amt" inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => { setAmount(e.target.value); setErr(null); }} placeholder={`e.g. ${fmtGD(c.min, 0)}…`} spellCheck={false} aria-invalid={outOfBounds} aria-describedby="amt-help"
                        disabled={!!blocker} className={cn(fieldClass, "tabular h-14 pr-16 text-xl font-semibold")} />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">G$</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[c.min, c.max].map((w, i) => (
                        <button key={i} type="button" disabled={!!blocker} onClick={() => { /* min rounds up, max rounds down, so the preset is always in range */ setAmount(String(Number(i === 0 ? (BigInt(w) + 10n ** 16n - 1n) / 10n ** 16n : BigInt(w) / 10n ** 16n) / 100)); setErr(null); }}
                          className="inline-flex h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink-2 transition hover:border-ink/30 disabled:opacity-50">
                          <span className="text-muted">{i === 0 ? "Min" : "Max"}</span><span className="tabular">{fmtGD(w)} G$</span>
                        </button>
                      ))}
                    </div>
                    <p id="amt-help" className={cn("mt-3 min-h-5 text-[13px] leading-relaxed", outOfBounds ? "font-medium text-danger" : "text-muted")}>
                      {`Between ${fmtGD(c.min)} and ${fmtGD(c.max)} G$. Any transfer fee comes off your stake.`}
                    </p>
                    {amt ? (
                      <dl className="mt-5 grid gap-px overflow-hidden rounded-input border border-line bg-line text-sm sm:grid-cols-2">
                        <div className="bg-sage-50 px-4 py-3"><dt className="text-xs font-medium text-sage-700">If you finish</dt><dd className="tabular mt-0.5 font-semibold text-ink">{amt} G$ back{bonusWei > 0n && ` + ${fmtGD(bonusWei)} G$ bonus`}</dd></div>
                        <div className="bg-coral-50 px-4 py-3"><dt className="text-xs font-medium text-coral-700">If you miss a day</dt><dd className="mt-0.5 font-semibold text-ink">You lose the stake</dd></div>
                      </dl>
                    ) : null}
                    <Button type="submit" loading={busy} disabled={!!blocker || wei === null || outOfBounds} size="lg" block className="mt-4">
                      {busy ? STEP_LABEL[step!] : amt ? `Stake ${amt} G$` : "Stake G$"}
                    </Button>
                    <p className="mt-3 text-center text-xs text-muted">Your wallet asks twice: allow, then stake.</p>
                    {err && <Notice tone="danger" className="mt-4">{err}</Notice>}
                  </form>
                )}

                {/* After settlement. */}
                {staked && c.settled && c.mine!.finished && !c.mine!.withdrawn && (() => {
                  const share = BigInt(c.mine!.payout) - BigInt(c.mine!.stake);
                  return (
                    <div className="mt-6 rounded-card bg-sage-50 p-5 ring-1 ring-inset ring-sage-100 sm:p-6">
                      <p className="text-sm font-semibold text-sage-700">You finished all {days} days</p>
                      <p className="mt-2 flex items-baseline gap-2 text-4xl font-semibold tracking-[-0.03em] text-ink"><span className="tabular">{fmtGD(c.mine!.payout)}</span><span className="text-lg font-medium text-muted">G$</span></p>
                      <p className="mt-1 text-sm text-ink-2">{share > 0n ? `Your ${fmtGD(c.mine!.stake)} G$ back, plus ${fmtGD(share.toString())} G$ extra.` : "Your stake, back in full."}</p>
                      <Button onClick={() => withdraw(c.id)} loading={busy} size="lg" block className="mt-5 sm:w-auto">{busy ? STEP_LABEL[step!] : "Withdraw"}</Button>
                    </div>
                  );
                })()}
                {staked && c.settled && !c.mine!.finished && <Notice tone="warning" className="mt-6" title="You missed a day">Your stake was shared out, mostly to the people who finished.</Notice>}
                {staked && c.mine!.withdrawn && <Notice tone="success" className="mt-6" >Withdrawn to your wallet.</Notice>}
                {staked && c.voided && !c.mine!.withdrawn && (
                  <div className="mt-6 rounded-card bg-sunken p-5 ring-1 ring-inset ring-line">
                    <p className="font-semibold text-ink">Challenge cancelled</p>
                    <p className="mt-1 text-sm text-ink-2">Results were not confirmed in time. Everyone gets their stake back.</p>
                    <Button onClick={() => withdraw(c.id)} loading={busy} size="lg" block className="mt-4 sm:w-auto">{busy ? STEP_LABEL[step!] : `Withdraw ${fmtGD(c.mine!.payout)} G$`}</Button>
                  </div>
                )}
                {staked && !c.settled && !c.voided && ended && (c.resultsFinal ? (
                  <Notice tone="info" className="mt-6">Results confirmed. Payouts open soon.</Notice>
                ) : overdue ? (
                  <div className="mt-6 rounded-card bg-sunken p-5 ring-1 ring-inset ring-line">
                    <p className="font-semibold text-ink">Results are late</p>
                    <p className="mt-1 text-sm text-ink-2">Cancel the challenge and everyone gets their stake back. Your wallet asks twice: cancel, then withdraw.</p>
                    <Button onClick={() => refund(c.id)} loading={busy} size="lg" block className="mt-4 sm:w-auto">{busy ? STEP_LABEL[step!] : `Cancel and withdraw ${fmtGD(c.mine!.stake)} G$`}</Button>
                  </div>
                ) : (
                  <Notice tone="info" className="mt-6">
                    Ended. We are confirming who finished.
                    {c.voidableAt !== null && ` If that is not done by ${fmtDate(c.voidableAt)}, everyone gets their stake back.`}
                  </Notice>
                ))}
              </div>
              {staked && stats("border-t border-line", true)}
            </Card>
          )}
          {err && !formShown && owedOlder.length === 0 && <Notice tone="danger">{err}</Notice>}
        </div>

        <p role="status" aria-live="polite" className="sr-only">{step && step !== "checking" ? STEP_LABEL[step] : ""}</p>

        <aside className="hidden content-start gap-6 lg:grid">
          <Card className="px-6 py-2">{howItWorks(true)}</Card>
        </aside>
      </div>
    </AppShell>
  );
}
