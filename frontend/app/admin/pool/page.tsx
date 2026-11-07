"use client";
import { encodeFunctionData } from "viem";
import { rewardsPoolAbi } from "@learnit/backend/abis";
import { ADDR } from "@learnit/backend/chain";
import { fmtGD } from "@learnit/backend/format";
import { Badge, Card, CardHeader, Notice, PageHeader, Stat } from "@/components/ui";
import { Sk } from "@/components/ui/Sk";
import { useAdmin } from "@/components/admin/AdminProvider";
import { usePool, usePoolHistory } from "@/components/admin/data";
import { ErrorNote, SafeTx, dayLabel, gdNum, shortAddr } from "@/components/admin/bits";
import { BarChart, LineChart } from "@/components/admin/charts";

const gdText = (v: number) => `${v.toLocaleString("en", { maximumFractionDigits: v < 10 ? 2 : 0 })} G$`;

export default function Pool() {
  const { address: wallet } = useAdmin();
  const pool = usePool();
  const history = usePoolHistory(14);
  const addr = ADDR.rewardsPool;
  const d = pool.data;

  if (!addr) {
    return (
      <div className="grid gap-6">
        <PageHeader title="Rewards pool" />
        {wallet
          ? <Notice tone="info" title="The RewardsPool is not set up yet">Set NEXT_PUBLIC_REWARDS_POOL_ADDRESS after you deploy the contracts, then reload.</Notice>
          : <Notice tone="info" title="No rewards pool yet">Pool numbers will appear here once rewards go live.</Notice>}
      </div>
    );
  }

  const daysLeft = d && d.dailyBudget > 0n ? Number(d.balance / d.dailyBudget) : null;

  // Worst case: everyone earns the full daily budget every day. Real spending is usually lower, so this is the earliest the pool could run dry.
  const runway = (() => {
    if (!d || d.dailyBudget === 0n) return null;
    const horizon = Math.min(30, Math.max(7, Math.ceil(Number(d.balance) / Number(d.dailyBudget)) + 3));
    const bal = gdNum(d.balance), budget = gdNum(d.dailyBudget);
    const points = Array.from({ length: horizon + 1 }, (_, i) => Math.max(0, bal - budget * i));
    const labels = points.map((_, i) => (i === 0 ? "Today" : dayLabel(new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10))));
    return { points, labels };
  })();

  return (
    <div className="grid gap-8">
      <PageHeader title="Rewards pool" description="The G$ that pays lesson and checkpoint rewards. It only pays out what has been deposited."
        action={d && <Badge tone={d.paused ? "coral" : "sage"}>{d.paused ? "Paused" : "Paying out"}</Badge>} />

      <ErrorNote error={pool.error} />

      {wallet && d && d.balance < d.dailyBudget && !d.paused && (
        <Notice tone="warning" title="The pool holds less than one day's budget">Rewards will start failing once it runs out. Send more G$ from the Safe with approve, then deposit.</Notice>
      )}

      <Card className="grid gap-6 p-6 sm:grid-cols-3">
        {pool.isLoading ? [0, 1, 2].map((i) => <Sk key={i} className="h-14 rounded-input" />) : d && (
          <>
            <Stat label="Balance" value={fmtGD(d.balance)} unit="G$" hint={daysLeft === null ? undefined : `About ${daysLeft} days at the daily budget`} />
            <Stat label="Paid out today" value={fmtGD(d.spentToday)} unit="G$" hint={`of ${fmtGD(d.dailyBudget)} G$ daily budget`} />
            <Stat label="Status" value={d.paused ? "Paused" : "Paying out"} hint="Today resets at midnight UTC" />
          </>
        )}
      </Card>

      {d && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <CardHeader title="Paid out per day" description="Last 14 days (UTC). The dashed line is the daily budget." />
            <div className="mt-5">
              {history.data ? (
                <BarChart values={history.data.map((h) => gdNum(h.spent))} labels={history.data.map((h) => dayLabel(h.day))} format={gdText} caption="paid out"
                  limit={d.dailyBudget > 0n ? { value: gdNum(d.dailyBudget), label: "Budget" } : undefined} />
              ) : history.isLoading ? <Sk className="h-48" /> : <p className="text-sm text-muted">Payout history is unavailable right now.</p>}
            </div>
          </Card>
          <Card className="p-6">
            <CardHeader title="How long the pool lasts" description="Balance if every day pays out the full budget. Real spending is usually lower." />
            <div className="mt-5">
              {runway ? <LineChart points={runway.points} labels={runway.labels} format={gdText} caption="balance" zeroLabel="Runs out" /> : <p className="text-sm text-muted">Set a daily budget to see how long the balance lasts.</p>}
            </div>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <CardHeader title="Contract" />
          <dl className="mt-4 grid gap-3 text-sm">
            <div><dt className="text-xs font-medium text-muted">Pool address</dt><dd className="mt-0.5 break-all font-mono text-xs text-ink">{addr}</dd></div>
            {d && <div><dt className="text-xs font-medium text-muted">Voucher signer</dt><dd className="mt-0.5 font-mono text-xs text-ink">{shortAddr(d.signer)}</dd></div>}
            {d && (
              <div className="tabular grid grid-cols-3 gap-3 border-t border-line pt-3">
                <div><dt className="text-xs font-medium text-muted">Daily budget</dt><dd className="mt-0.5 text-ink">{fmtGD(d.dailyBudget)} G$</dd></div>
                <div><dt className="text-xs font-medium text-muted">Per person, daily</dt><dd className="mt-0.5 text-ink">{fmtGD(d.dailyCap)} G$</dd></div>
                <div><dt className="text-xs font-medium text-muted">Per person, weekly</dt><dd className="mt-0.5 text-ink">{fmtGD(d.weeklyCap)} G$</dd></div>
              </div>
            )}
          </dl>
        </Card>
        {d && (
          <Card className="p-6">
            <CardHeader title={d.paused ? "Resume payouts" : "Pause payouts"} description="Only the guardian (the Safe) can do this." />
            <div className="mt-4">
              <SafeTx to={addr} data={encodeFunctionData({ abi: rewardsPoolAbi, functionName: d.paused ? "unpause" : "pause" })}
                note={`Send this from the Safe to ${d.paused ? "resume" : "pause"} reward payouts. Stakes are not affected.`} />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
