"use client";
import { useState } from "react";
import { Coins, Download } from "lucide-react";
import { fmtGD } from "@learnit/backend/format";
import { Button, Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui";
import { Sk } from "@/components/ui/Sk";
import { usePublicStats, type UbiDay } from "@/components/admin/data";
import { ErrorNote, dayLabel as label, fillDays, gdNum } from "@/components/admin/bits";
import { BarChart } from "@/components/admin/charts";
import { cn } from "@/lib/cn";

const SERIES = {
  gd: { name: "G$", caption: "claimed", pick: (d: UbiDay) => gdNum(d.total), format: (v: number) => `${v.toLocaleString("en", { maximumFractionDigits: v < 10 ? 2 : 0 })} G$` },
  claims: { name: "Claims", caption: "claims", pick: (d: UbiDay) => d.claims, format: (v: number) => `${v.toLocaleString("en")} ${v === 1 ? "claim" : "claims"}` },
  people: { name: "People", caption: "people", pick: (d: UbiDay) => d.claimers, format: (v: number) => `${v.toLocaleString("en")} ${v === 1 ? "person" : "people"}` },
} as const;
type SeriesKey = keyof typeof SERIES;

function csv(days: UbiDay[]) {
  const rows = ["date_utc,claims,people,g_dollars", ...days.map((d) => `${d.day},${d.claims},${d.claimers},${(Number(BigInt(d.total) / 10n ** 14n) / 10_000).toFixed(4)}`)];
  const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url; a.download = "learnit-ubi-claims.csv"; a.click();
  URL.revokeObjectURL(url);
}

export default function Ubi() {
  const { data, isLoading, error } = usePublicStats();
  const [series, setSeries] = useState<SeriesKey>("gd");
  const ubi = data?.ubi;
  const days = ubi ? fillDays(ubi.days, 30) : [];
  const total30 = days.reduce((s, d) => s + BigInt(d.total), 0n);
  const active = days.filter((d) => d.claims > 0).length;

  return (
    <div className="grid gap-8">
      <PageHeader title="UBI claims" description="G$ claimed through LearnIt, by UTC day. Claims made in other apps are not counted. Totals only: no names or wallets."
        action={ubi && <Button variant="outline" size="sm" icon={Download} onClick={() => csv(ubi.days)}>Export CSV</Button>} />

      <ErrorNote error={error} />
      {isLoading && <Card className="grid gap-4 p-6"><Sk className="h-6 w-40" /><Sk className="h-32" /></Card>}

      {ubi && (
        <>
          <Card className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Today" value={fmtGD(ubi.today.total)} unit="G$" hint={`${ubi.today.claims} claims, ${ubi.today.claimers} people`} />
            <Stat label="Last 30 days" value={fmtGD(total30)} unit="G$" hint={`${active} active days`} />
            <Stat label="All time" value={fmtGD(ubi.allTime.total)} unit="G$" hint={`${ubi.allTime.claims} claims`} />
            <Stat label="People who claimed" value={ubi.allTime.claimers.toLocaleString("en")} hint="All time" />
          </Card>

          <Card className="p-6">
            <CardHeader title="Last 30 days"
              description={series === "gd" ? "G$ claimed per day." : series === "claims" ? "Claims made per day." : "Different people who claimed, per day."}
              action={
                <div role="radiogroup" aria-label="Chart shows" className="inline-flex shrink-0 rounded-btn bg-sunken p-0.5">
                  {(Object.keys(SERIES) as SeriesKey[]).map((k) => (
                    <button key={k} type="button" role="radio" aria-checked={series === k} onClick={() => setSeries(k)}
                      className={cn("h-8 rounded-[10px] px-3 text-sm font-medium transition duration-150", series === k ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink")}>{SERIES[k].name}</button>
                  ))}
                </div>
              } />
            <div className="mt-5">
              <BarChart key={series} values={days.map(SERIES[series].pick)} labels={days.map((d) => label(d.day))} format={SERIES[series].format} caption={SERIES[series].caption} height={200} />
            </div>
          </Card>

          {ubi.allTime.claims === 0 && (
            <EmptyState icon={Coins} title="No claims recorded yet">Claims appear here after someone claims from the LearnIt home screen.</EmptyState>
          )}
          <p className="text-xs text-muted">Updated {new Date(data!.generatedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}. Refreshes every few minutes.</p>
        </>
      )}
    </div>
  );
}
