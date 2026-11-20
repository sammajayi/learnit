"use client";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { encodeFunctionData, erc20Abi } from "viem";
import { ExternalLink, Flame, PauseCircle, PlayCircle, Plus, Send, Sparkles } from "@/components/icons";
import { friendlyError } from "@/lib/txErrors";
import { streakVaultAbi } from "@learnit/backend/abis";
import { ADDR } from "@learnit/backend/chain";
import { fmtGD } from "@learnit/backend/format";
import { Badge, Button, Card, CardHeader, EmptyState, Label, Notice, PageHeader, fieldClass } from "@/components/ui";
import { Sk } from "@/components/ui/Sk";
import { useAdmin } from "@/components/admin/AdminProvider";
import { DAY, RESULTS_DEADLINE, type Cohort, type CohortStatus, useBonus, useCohorts, useVaultPaused, useVaultPending } from "@/components/admin/data";
import { ConfirmAction, SafeTx, parseG, when } from "@/components/admin/bits";
import { CohortTimeline } from "@/components/admin/CohortTimeline";
import { ChallengeTable } from "@/components/admin/ChallengeTable";
import { HBars } from "@/components/admin/charts";

const LENGTHS = [7, 14, 30] as const; // the contract only accepts these
const MIN_LEAD = 10 * 60; // the contract needs a future start when the transaction lands
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
/** "6" (percent, what an admin types) <-> 600 (bps, what the contract stores). */
const pctToBps = (v: string): number | null => {
  const t = v.trim();
  if (!/^\d*\.?\d*$/.test(t) || t === "" || t === ".") return null;
  const n = Math.round(parseFloat(t) * 100);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const bpsToPct = (bps: number) => (bps / 100).toString();

export default function Challenges() {
  const qc = useQueryClient();
  const pc = usePublicClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { roles, rolesLoading, wrongNetwork, networkName } = useAdmin();
  const vault = ADDR.streakVault;
  const cohorts = useCohorts();
  const paused = useVaultPaused();
  const bonus = useBonus();
  const pending = useVaultPending();
  const pendingTotal = pending.data ? pending.data.rewards + pending.data.ubi : 0n;
  const isAdmin = roles?.admin === true, isGuardian = roles?.guardian === true;

  const defaultStart = useMemo(() => { const d = new Date(Date.now() + DAY * 1000); d.setMinutes(0, 0, 0); return toLocalInput(d); }, []);
  const [start, setStart] = useState(defaultStart);
  const [lengthDays, setLengthDays] = useState<number>(7);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [bonusPct, setBonusPct] = useState<Record<number, string>>({});
  const [fundAmount, setFundAmount] = useState("");
  const [busy, setBusy] = useState<null | "create" | "pause" | `bonus-${number}` | "fund" | `settle-${number}` | `void-${number}` | "distribute">(null);
  const [view, setView] = useState<"timeline" | "table">("timeline");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ text: string; hash: `0x${string}` } | null>(null);

  const settled = (cohorts.data ?? []).filter((c) => c.settled && c.pot > 0n).slice(0, 8);
  const startSec = Math.floor(new Date(start).getTime() / 1000);
  const minWei = parseG(min), maxWei = parseG(max);
  const now = Math.floor(Date.now() / 1000);
  const touched = min !== "" || max !== "";
  const problem =
    !Number.isFinite(startSec) ? "Pick a start date and time."
    : startSec < now + MIN_LEAD ? "The start must be at least 10 minutes from now."
    : minWei === null || minWei === 0n ? "Enter a minimum stake above 0."
    : maxWei === null || maxWei < minWei ? "The maximum must be at least the minimum."
    : null;

  async function send(kind: NonNullable<typeof busy>, fn: string, args: readonly unknown[], text: string) {
    if (!pc || !address) return;
    if (wrongNetwork) { setErr(`Switch your wallet to ${networkName} first.`); return; }
    setBusy(kind); setErr(null); setDone(null);
    try {
      // Simulate first: a wrong wallet or bad value fails here with a readable reason, before any gas is spent.
      const { request } = await pc.simulateContract({ account: address, address: vault, abi: streakVaultAbi, functionName: fn, args } as never);
      const hash = await writeContractAsync(request);
      await pc.waitForTransactionReceipt({ hash });
      setDone({ text, hash });
      await qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(null); }
  }

  const saveBonus = (len: number) => {
    const bps = pctToBps(bonusPct[len] ?? "");
    if (bps === null || !bonus.data) return;
    if (bps > bonus.data.capBps) { setErr(`That bonus rate is above the ${bonus.data.capBps / 100}% cap.`); return; }
    void send(`bonus-${len}`, "setBonusBps", [len, bps], `${len}-day bonus set to ${bps / 100}%.`);
  };

  const fundReserve = async () => {
    const wei = parseG(fundAmount);
    if (!pc || !address || wei === null || wei === 0n) return;
    if (wrongNetwork) { setErr(`Switch your wallet to ${networkName} first.`); return; }
    setBusy("fund"); setErr(null); setDone(null);
    try {
      const allowance = await pc.readContract({ address: ADDR.gd, abi: erc20Abi, functionName: "allowance", args: [address, vault] });
      if (allowance < wei) {
        const h = await writeContractAsync({ address: ADDR.gd, abi: erc20Abi, functionName: "approve", args: [vault, wei] });
        await pc.waitForTransactionReceipt({ hash: h });
      }
      const { request } = await pc.simulateContract({ account: address, address: vault, abi: streakVaultAbi, functionName: "fundBonusReserve", args: [wei] });
      const hash = await writeContractAsync(request);
      await pc.waitForTransactionReceipt({ hash });
      setDone({ text: `Added ${fmtGD(wei)} G$ to the bonus reserve.`, hash });
      setFundAmount("");
      await qc.invalidateQueries({ queryKey: ["admin", "bonus"] });
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(null); }
  };

  // Neither settle nor cancel needs a role, so every connected wallet sees them where they apply.
  const rowAction = (c: Cohort, status: CohortStatus) => {
                // Neither call needs a role: the contract lets anyone settle confirmed results, or cancel once the deadline has passed.
                if (!address) return null;
                if (status === "settle") return (
                  <Button size="sm" className="justify-self-start" loading={busy === `settle-${c.id}`} disabled={busy !== null}
                    onClick={() => send(`settle-${c.id}`, "settle", [BigInt(c.id)], `Challenge ${c.id} is settled. The people who finished can withdraw.`)}>Settle challenge {c.id}</Button>
                );
                if (status === "finalize" && now >= c.end + RESULTS_DEADLINE) return (
                  <ConfirmAction className="justify-self-start" label={`Cancel challenge ${c.id} and refund everyone`} confirmLabel={`Cancel challenge ${c.id}`}
                    consequence={`This cancels challenge ${c.id} for everyone. All who joined can take their stake back, whether or not they finished. It cannot be undone.`}
                    loading={busy === `void-${c.id}`} disabled={busy !== null}
                    onConfirm={() => send(`void-${c.id}`, "voidCohort", [BigInt(c.id)], `Challenge ${c.id} is cancelled. Everyone who joined can take their stake back.`)} />
                );
                return null;
  };

  if (!vault) {
    return (
      <div className="grid gap-6">
        <PageHeader title="Challenges" />
        <Notice tone="info" title="The StreakVault is not set up yet">Set NEXT_PUBLIC_STREAK_VAULT_ADDRESS after you deploy the contracts, then reload.</Notice>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <PageHeader title="Challenges" description="Streak challenges of 7, 14 or 30 days. People can join until the first day is over." />

      {err && <Notice tone="danger">{err}</Notice>}
      {done && (
        <Notice tone="success" title="Done" action={<a className="inline-flex items-center gap-1 font-medium underline underline-offset-4" href={`https://celoscan.io/tx/${done.hash}`} target="_blank" rel="noreferrer">View transaction <ExternalLink size={13} aria-hidden /></a>}>
          {done.text}
        </Notice>
      )}

      <section aria-labelledby="all-challenges">
        <Card className="p-6">
          <CardHeader id="all-challenges" title="All challenges" description={view === "timeline" ? "Newest first, on one calendar." : "Click a heading to sort. Search by number or status."}
            action={
              <div role="group" aria-label="View" className="inline-flex shrink-0 rounded-btn bg-sunken p-0.5">
                {(["timeline", "table"] as const).map((v) => (
                  <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
                    className={`h-8 rounded-[10px] px-3 text-sm font-medium capitalize transition duration-150 ${view === v ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"}`}>{v}</button>
                ))}
              </div>
            } />
          <div className="mt-5">
            {cohorts.isLoading ? (
              <div className="grid gap-5">{[0, 1, 2].map((i) => <Sk key={i} className="h-14 rounded-input" />)}</div>
            ) : !cohorts.data?.length ? (
              <EmptyState icon={Flame} title="No challenges yet">Create the first one below.</EmptyState>
            ) : (
              view === "timeline"
                ? <CohortTimeline cohorts={cohorts.data} now={now} action={rowAction} />
                : <ChallengeTable cohorts={cohorts.data} now={now} action={rowAction} />
            )}
          </div>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        {!address ? (
          <Card className="p-6">
            <CardHeader title="Create a challenge" description="Only the admin Safe can create challenges. Connect an authorised wallet (top right) to make changes." />
          </Card>
        ) : rolesLoading ? (
          <Sk className="h-72 rounded-card" />
        ) : (
        <Card className="p-6">
          <CardHeader title="Create a challenge" description={isAdmin ? "Sent from your wallet. The contract checks your role." : "Your wallet is not the admin, so this prepares a transaction for the Safe."} />
          <div className="mt-5 grid gap-4">
            <div>
              <Label htmlFor="start">Starts (your local time)</Label>
              <input id="start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={`${fieldClass} mt-1.5`} />
              {Number.isFinite(startSec) && <p className="mt-1.5 text-sm text-muted">Joining closes {when(startSec + DAY)}. It ends {when(startSec + lengthDays * DAY)}.</p>}
            </div>
            <div>
              <Label htmlFor="len">Length</Label>
              <select id="len" value={lengthDays} onChange={(e) => setLengthDays(Number(e.target.value))} className={`${fieldClass} mt-1.5`}>
                {LENGTHS.map((d) => <option key={d} value={d}>{d} days</option>)}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="min">Minimum stake (G$)</Label>
                <input id="min" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} placeholder="100" className={`${fieldClass} mt-1.5`} />
              </div>
              <div>
                <Label htmlFor="max">Maximum stake (G$)</Label>
                <input id="max" inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} placeholder="3000" className={`${fieldClass} mt-1.5`} />
              </div>
            </div>
            {problem && touched && <p className="text-sm text-danger" role="alert">{problem}</p>}
            {isAdmin ? (
              <Button onClick={() => { if (!problem) void send("create", "createCohort", [BigInt(startSec), lengthDays, minWei!, maxWei!], `Challenge created. It starts ${when(startSec)} and runs for ${lengthDays} days.`); }}
                disabled={!!problem} loading={busy === "create"} icon={Plus} block>
                {busy === "create" ? "Confirm in your wallet…" : "Create challenge"}
              </Button>
            ) : problem ? (
              <p className="text-sm text-muted">Fill in the fields to get the Safe transaction.</p>
            ) : (
              <SafeTx to={vault} data={encodeFunctionData({ abi: streakVaultAbi, functionName: "createCohort", args: [BigInt(startSec), lengthDays, minWei!, maxWei!] })}
                note="In the Safe app, open New transaction, then Transaction builder. Paste the address and data, keep the value at 0, and send it for signing. It must run before the start time." />
            )}
          </div>
        </Card>
        )}

        <div className="grid gap-6 xl:self-start">
        <Card className="p-6">
          <CardHeader title="Staking" description="Pausing stops new stakes. Stakes already in stay safe." />
          <div className="mt-4 flex items-center justify-between gap-3">
            {paused.isLoading ? <Sk className="h-6 w-20 rounded-full" /> : <Badge tone={paused.data ? "coral" : "sage"}>{paused.data ? "Paused" : "Running"}</Badge>}
            {isGuardian && (
              paused.data
                ? <Button variant="outline" size="sm" loading={busy === "pause"} icon={PlayCircle} onClick={() => send("pause", "unpause", [], "Staking is running again.")}>Resume staking</Button>
                : <ConfirmAction label="Pause staking" confirmLabel="Pause staking" icon={PauseCircle} loading={busy === "pause"} disabled={busy !== null}
                    consequence="Nobody can stake until you resume. Stakes already in stay safe."
                    onConfirm={() => send("pause", "pause", [], "Staking is paused.")} />
            )}
          </div>
          {!!address && !rolesLoading && !isGuardian && paused.data !== undefined && (
            <div className="mt-4">
              <SafeTx to={vault} data={encodeFunctionData({ abi: streakVaultAbi, functionName: paused.data ? "unpause" : "pause" })}
                note={`Only the guardian (the Safe) can ${paused.data ? "resume" : "pause"} staking. Send this from the Safe.`} />
            </div>
          )}
        </Card>
        {pendingTotal > 0n && (
          <Card className="p-6">
            <CardHeader title="Forfeit shares to send on" description="Settling a challenge sets these aside in the vault. Sending them on is a separate step, so a problem with the destination can never hold up a withdrawal." />
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-muted">To the rewards pool</dt><dd className="tabular mt-0.5 font-semibold text-ink">{fmtGD(pending.data!.rewards)} G$</dd></div>
              <div><dt className="text-muted">To UBI</dt><dd className="tabular mt-0.5 font-semibold text-ink">{fmtGD(pending.data!.ubi)} G$</dd></div>
            </dl>
            {address
              ? <Button variant="outline" size="sm" className="mt-4" icon={Send} loading={busy === "distribute"} disabled={busy !== null}
                  onClick={() => send("distribute", "distribute", [], `Sent ${fmtGD(pendingTotal)} G$ on to the rewards pool and UBI.`)}>Send them on</Button>
              : <p className="mt-4 text-sm text-muted">Sign in with any wallet to send them. No role is needed.</p>}
          </Card>
        )}
        {settled.length > 0 && (
          <Card className="p-6">
            <CardHeader title="Who finishes" description="Share of the G$ staked that belonged to people who finished, per settled challenge." />
            <HBars className="mt-5" max={100} rows={settled.map((c) => { const pct = Math.round(Number((c.finishedStake * 1000n) / c.pot) / 10); return { label: `Challenge ${c.id}`, value: pct, display: `${pct}%`, note: `${fmtGD(c.finishedStake)} of ${fmtGD(c.pot)} G$` }; })} />
          </Card>
        )}
        </div>
      </div>

      <Card className="p-6">
        <CardHeader title="Length bonus" description="An extra bonus for finishers, on top of the usual forfeit-sharing, by challenge length. Paid only from the reserve below, never from stakers' own principal. A new rate applies to challenges created after it is saved. Fund the reserve before a challenge with a bonus opens: a stake is refused if the reserve cannot cover its bonus." />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {LENGTHS.map((d) => {
            const current = bonus.data?.bpsFor[d];
            return (
              <div key={d}>
                <Label htmlFor={`bonus-${d}`}>{d}-day bonus</Label>
                <div className="relative mt-1.5">
                  <input id={`bonus-${d}`} inputMode="decimal" placeholder={current !== undefined ? bpsToPct(current) : "0"}
                    value={bonusPct[d] ?? ""} onChange={(e) => setBonusPct((s) => ({ ...s, [d]: e.target.value }))}
                    disabled={!isAdmin} className={`${fieldClass} pr-9`} />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">%</span>
                </div>
                {isAdmin && <Button variant="outline" size="sm" className="mt-2 w-full" loading={busy === `bonus-${d}`} onClick={() => saveBonus(d)}>Save</Button>}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">Currently set: {LENGTHS.map((d) => `${d}d ${bonus.data ? bpsToPct(bonus.data.bpsFor[d]) : "…"}%`).join(" · ")}. Capped at {bonus.data ? bpsToPct(bonus.data.capBps) : "50"}%.</p>
        {!isAdmin && !rolesLoading && !!address && bonus.data && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {LENGTHS.map((d) => {
              const bps = pctToBps(bonusPct[d] ?? "");
              return bps === null ? null : (
                <SafeTx key={d} to={vault} data={encodeFunctionData({ abi: streakVaultAbi, functionName: "setBonusBps", args: [d, bps] })}
                  note={`Set the ${d}-day bonus to ${bps / 100}% from the Safe.`} />
              );
            })}
          </div>
        )}

        {!!address && (
          <div className="mt-6 border-t border-line pt-5">
            <Label htmlFor="fund">Fund the bonus reserve</Label>
            <p className="mt-1 text-xs text-muted">Current reserve: <span className="tabular font-medium text-ink-2">{bonus.data ? fmtGD(bonus.data.reserve) : "…"} G$</span>. Anyone can fund it, no admin role needed.</p>
            <div className="mt-2 flex gap-3">
              <input id="fund" inputMode="decimal" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} placeholder="Amount in G$" className={fieldClass} />
              <Button variant="outline" icon={Sparkles} loading={busy === "fund"} onClick={fundReserve}>{busy === "fund" ? "Confirm in wallet…" : "Fund"}</Button>
            </div>
            <p className="mt-2 text-xs text-muted">Two steps in your wallet if allowance is short: approve, then fund.</p>
          </div>
        )}
      </Card>

    </div>
  );
}
