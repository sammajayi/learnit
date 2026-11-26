// Builds the Safe batch that keeps the open challenge running: one cohort per day for each length (7, 14, 30 days), each
// with an 800 G$ minimum. createCohort is admin only, so the backend cannot do this itself; import the JSON file into the
// Safe app (Transaction Builder, "Upload a batch") and sign it.
//   npx tsx --env-file=.env scripts/rolling-cohorts.mts                 (next 30 days, all three lengths)
//   npx tsx --env-file=.env scripts/rolling-cohorts.mts --days 60 --lengths 7,14 --max 5000
//   npx tsx --env-file=.env scripts/rolling-cohorts.mts --bonus 14=150,30=400   (also set bonus rates in bps for new cohorts)
// Days that already have a cohort of that length are skipped, so running it again only fills the gaps.
// The bonus is paid from the reserve, so fund it first with fundBonusReserve; a stake is refused if the reserve cannot cover it.
import { writeFileSync } from "node:fs";
import { CHAIN_ID, ADDR } from "../src/chain";
import { cohortSpans, listCohortIds, readCohort } from "../src/cohorts";

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : undefined; };
const days = Number(arg("days") ?? 30);
const lengths = (arg("lengths") ?? "7,14,30").split(",").map(Number);
const G = 10n ** 18n;
const min = 800n * G; // at least 800 G$ to stake
if (!ADDR.streakVault) throw new Error("NEXT_PUBLIC_STREAK_VAULT_ADDRESS is not set");
if (lengths.some((l) => ![7, 14, 30].includes(l))) throw new Error("lengths must be 7, 14 or 30");

const ids = await listCohortIds();
const last = ids.length ? await readCohort(ids[ids.length - 1]) : null;
const max = arg("max") ? BigInt(arg("max")!) * G : last ? BigInt(last.max) : 10_000n * G;
if (max < min) throw new Error("max must be at least 800 G$");
const spans = await cohortSpans(ids);
const have = new Set([...spans.values()].map((s) => `${s.start}:${Math.round((s.end - s.start) / 86400)}`));

const day0 = Math.floor(Date.now() / 86400_000) * 86400 + 86400; // tomorrow 00:00 UTC (a start must be in the future)
const method = (name: string, inputs: { name: string; type: string }[]) => ({ inputs: inputs.map((i) => ({ ...i, internalType: i.type })), name, payable: false });
const txs: object[] = [];

for (const pair of (arg("bonus") ?? "").split(",").filter(Boolean)) {
  const [len, bps] = pair.split("=");
  txs.push({ to: ADDR.streakVault, value: "0", data: null, contractMethod: method("setBonusBps", [{ name: "lengthDays", type: "uint32" }, { name: "bps", type: "uint16" }]), contractInputsValues: { lengthDays: len, bps } });
}
for (let d = 0; d < days; d++) for (const len of lengths) {
  const start = day0 + d * 86400;
  if (have.has(`${start}:${len}`)) continue;
  txs.push({ to: ADDR.streakVault, value: "0", data: null, contractMethod: method("createCohort", [{ name: "start", type: "uint64" }, { name: "lengthDays", type: "uint32" }, { name: "min", type: "uint128" }, { name: "max", type: "uint128" }]), contractInputsValues: { start: String(start), lengthDays: String(len), min: min.toString(), max: max.toString() } });
}

const file = `rolling-cohorts-${new Date().toISOString().slice(0, 10)}.json`;
writeFileSync(file, JSON.stringify({ version: "1.0", chainId: String(CHAIN_ID), createdAt: Date.now(), meta: { name: "LearnIt open challenge cohorts", description: `${days} days of daily cohorts, lengths ${lengths.join("/")}, min 800 G$` }, transactions: txs }, null, 2));
console.log(`${txs.length} transaction(s) written to ${file}. Stake limits 800 to ${max / G} G$. Import it in the Safe app (Transaction Builder).`);
