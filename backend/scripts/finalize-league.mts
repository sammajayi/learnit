// After a league week ends: rank each group, pay the top 3 a G$ bonus. The weekly job (.github/workflows/league.yml) does this
// on its own; this script is for a dry run or a catch-up by hand. Safe to run again: nobody is paid twice.
//   npx tsx --env-file=.env scripts/finalize-league.mts <weekKey>          (dry run, prints the plan)
//   npx tsx --env-file=.env scripts/finalize-league.mts <weekKey> --send   (signs and records bonus vouchers)
// weekKey is the Monday the week started, e.g. 2026-10-27. Defaults to last week if omitted.
// SIGNER_PRIVATE_KEY must be set (same key that signs lesson/checkpoint vouchers).
import { db } from "../src/db";
import { weekKey } from "../src/streak";
import { finalizeWeek } from "../src/leagueFinalize";

const send = process.argv.includes("--send");
const argKey = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
const key = argKey ?? weekKey(new Date(Date.now() - 7 * 86400_000));

const r = await finalizeWeek(key, send, console.log);
console.log(`\n${r.winners} winner(s) across ${r.groups} group(s). Paid now: ${r.issued}. Already paid: ${r.alreadyPaid}. Skipped: ${r.skipped.length}. Failed: ${r.failed}.`);
if (!send) console.log("Dry run. Add --send to issue vouchers.");
await db.$disconnect();
