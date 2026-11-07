"use client";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { encodeFunctionData } from "viem";
import { ExternalLink, Flame, PauseCircle, PlayCircle, Plus } from "lucide-react";
import { friendlyError } from "@/lib/txErrors";
import { streakVaultAbi } from "@learnit/backend/abis";
import { ADDR } from "@learnit/backend/chain";
import { fmtGD } from "@learnit/backend/format";
import { Badge, Button, Card, CardHeader, EmptyState, Label, Notice, PageHeader, fieldClass } from "@/components/ui";
import { Sk } from "@/components/ui/Sk";
import { useAdmin } from "@/components/admin/AdminProvider";
import { DAY, cohortStatus, useCohorts, useVaultPaused } from "@/components/admin/data";
import { SafeTx, parseG, when } from "@/components/admin/bits";
import { CohortTimeline } from "@/components/admin/CohortTimeline";
import { HBars } from "@/components/admin/charts";

const LENGTHS = [7, 14, 30] as const; // the contract only accepts these
const MIN_LEAD = 10 * 60; // the contract needs a future start when the transaction lands
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

export default function Challenges() {
  const qc = useQueryClient();
  const pc = usePublicClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { roles } = useAdmin();
  const vault = ADDR.streakVault;
  const cohorts = useCohorts();
  const paused = useVaultPaused();
  const isAdmin = roles?.admin === true, isGuardian = roles?.guardian === true;

  const defaultStart = useMemo(() => { const d = new Date(Date.now() + DAY * 1000); d.setMinutes(0, 0, 0); return toLocalInput(d); }, []);
  const [start, setStart] = useState(defaultStart);
  const [lengthDays, setLengthDays] = useState<number>(7);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [busy, setBusy] = useState<null | "create" | "pause">(null);
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

  async function send(kind: "create" | "pause", fn: "createCohort" | "pause" | "unpause", args: readonly unknown[], text: string) {
    if (!pc || !address) return;
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

  if (!vault) {
    return (
      <div className="grid gap-6">
        <PageHeader title="Challenges" />
        {address
          ? <Notice tone="info" title="The StreakVault is not set up yet">Set NEXT_PUBLIC_STREAK_VAULT_ADDRESS after you deploy the contracts, then reload.</Notice>
          : <Notice tone="info" title="No challenges yet">Challenges will appear here once staking goes live.</Notice>}
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
          <CardHeader id="all-challenges" title="All challenges" description="Newest first, on one calendar." />
          <div className="mt-5">
            {cohorts.isLoading ? (
              <div className="grid gap-5">{[0, 1, 2].map((i) => <Sk key={i} className="h-14 rounded-input" />)}</div>
            ) : !cohorts.data?.length ? (
              <EmptyState icon={Flame} title="No challenges yet">Create the first one below.</EmptyState>
            ) : (
              <CohortTimeline cohorts={cohorts.data} now={now} canAct={!!address} />
            )}
          </div>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        {!address ? (
          <Card className="p-6">
            <CardHeader title="Create a challenge" description="Only the admin Safe can create challenges. Use Admin sign-in (top right) with an authorised wallet to make changes." />
          </Card>
        ) : (
        <Card className="p-6">
          <CardHeader title="Create a challenge" description={isAdmin ? "Sent from your wallet. The contract checks your role." : "Your wallet is not the admin, so this prepares a transaction for the Safe."} />
          <div className="mt-5 grid gap-4">
            <div>
              <Label htmlFor="start">Starts</Label>
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
                {busy === "create" ? "Confirm in your wallet..." : "Create challenge"}
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
              <Button variant="outline" size="sm" loading={busy === "pause"} icon={paused.data ? PlayCircle : PauseCircle}
                onClick={() => send("pause", paused.data ? "unpause" : "pause", [], paused.data ? "Staking is running again." : "Staking is paused.")}>
                {paused.data ? "Resume staking" : "Pause staking"}
              </Button>
            )}
          </div>
          {!!address && !isGuardian && paused.data !== undefined && (
            <div className="mt-4">
              <SafeTx to={vault} data={encodeFunctionData({ abi: streakVaultAbi, functionName: paused.data ? "unpause" : "pause" })}
                note={`Only the guardian (the Safe) can ${paused.data ? "resume" : "pause"} staking. Send this from the Safe.`} />
            </div>
          )}
        </Card>
        {settled.length > 0 && (
          <Card className="p-6">
            <CardHeader title="Who finishes" description="Share of the G$ staked that belonged to people who finished, per settled challenge." />
            <HBars className="mt-5" max={100} rows={settled.map((c) => { const pct = Math.round(Number((c.finishedStake * 1000n) / c.pot) / 10); return { label: `Challenge ${c.id}`, value: pct, display: `${pct}%`, note: `${fmtGD(c.finishedStake)} of ${fmtGD(c.pot)} G$` }; })} />
          </Card>
        )}
        </div>
      </div>

    </div>
  );
}
