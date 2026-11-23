"use client";
import { useMemo, type ReactNode } from "react";
import { fmtGD } from "@learnit/backend/format";
import { Badge } from "@/components/ui";
import { DAY, cohortStatus, type Cohort, type CohortStatus } from "./data";
import { STATUS } from "./CohortTimeline";
import { gdNum, when } from "./bits";
import { DataTable, type Col } from "./DataTable";

/** Challenges that need someone come first when sorting by status. */
const ORDER: Record<CohortStatus, number> = { finalize: 0, settle: 1, open: 2, running: 3, upcoming: 4, settled: 5, voided: 6 };
const iso = (s: number) => new Date(s * 1000).toISOString();

/** The same challenges as the timeline, as a table you can sort, search and export. */
export function ChallengeTable({ cohorts, now, action }: { cohorts: Cohort[]; now: number; action?: (c: Cohort, status: CohortStatus) => ReactNode }) {
  const cols = useMemo<Col<Cohort>[]>(() => [
    { key: "id", header: "Challenge", value: (c) => c.id, render: (c) => <span className="font-medium">Challenge {c.id}</span>, exportValue: (c) => c.id },
    { key: "status", header: "Status", value: (c) => ORDER[cohortStatus(c, now)], exportValue: (c) => STATUS[cohortStatus(c, now)].label, render: (c) => { const st = STATUS[cohortStatus(c, now)]; return <Badge tone={st.tone}>{st.label}</Badge>; } },
    { key: "start", header: "Starts", value: (c) => c.start, exportValue: (c) => iso(c.start), render: (c) => when(c.start) },
    { key: "end", header: "Ends", value: (c) => c.end, exportValue: (c) => iso(c.end), render: (c) => when(c.end) },
    { key: "len", header: "Days", align: "right", value: (c) => Math.round((c.end - c.start) / DAY) },
    { key: "pot", header: "Pot (G$)", align: "right", value: (c) => gdNum(c.pot), render: (c) => fmtGD(c.pot) },
    { key: "fin", header: "Finished", align: "right", value: (c) => (c.settled && c.pot > 0n ? Math.round(Number((c.finishedStake * 1000n) / c.pot) / 10) : null), render: (c) => (c.settled && c.pot > 0n ? `${Math.round(Number((c.finishedStake * 1000n) / c.pot) / 10)}%` : <span className="text-muted">Not yet</span>) },
    { key: "range", header: "Stake range (G$)", value: (c) => gdNum(c.min), exportValue: (c) => `${fmtGD(c.min)} to ${fmtGD(c.max)}`, render: (c) => `${fmtGD(c.min)} to ${fmtGD(c.max)}` },
    ...(action ? [{ key: "action", header: "Action", noExport: true, value: () => null, render: (c: Cohort) => action(c, cohortStatus(c, now)) ?? <span className="text-muted">None</span> } satisfies Col<Cohort>] : []),
  ], [now, action]);

  return (
    <DataTable label="Challenges" rows={cohorts} cols={cols} rowKey={(c) => String(c.id)} initialSort={{ key: "id", dir: "desc" }} pageSize={10} exportName="learnit-challenges"
      searchText={(c) => `challenge ${c.id} ${STATUS[cohortStatus(c, now)].label}`} empty="No challenges match." />
  );
}
