// Builds the Safe batch that lets the reward pool pay a one-off welcome claim (default 800 G$) on top of normal rewards.
// The pool rejects any voucher that takes one person over dailyCap or weeklyCap, or the whole pool over dailyBudget, and only the
// admin (the Safe) can change them. This reads today's values, adds the welcome amount, and writes a Safe Transaction Builder file.
//   npx tsx --env-file=.env scripts/raise-pool-caps.mts                         (welcome 800, room for 10 signups a day)
//   npx tsx --env-file=.env scripts/raise-pool-caps.mts --welcome 800 --signups 25
//   npx tsx --env-file=.env scripts/raise-pool-caps.mts --daily 950 --weekly 1400 --budget 9000   (set exact values)
// Also set DAILY_CAP_G in .env to the new daily cap: the backend never signs a voucher above it.
import { writeFileSync } from "node:fs";
import { parseAbi, formatUnits } from "viem";
import { ADDR, CHAIN_ID } from "../src/chain";
import { publicClient } from "../src/identity";

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : undefined; };
const G = 10n ** 18n;
const g = (n: string | undefined, d: bigint) => (n === undefined ? d : BigInt(Math.round(Number(n) * 1000)) * G / 1000n);
if (!ADDR.rewardsPool) throw new Error("NEXT_PUBLIC_REWARDS_POOL_ADDRESS is not set");

const abi = parseAbi(["function dailyCap() view returns (uint256)", "function weeklyCap() view returns (uint256)", "function dailyBudget() view returns (uint256)"]);
const [dCap, wCap, budget] = await Promise.all(["dailyCap", "weeklyCap", "dailyBudget"].map((functionName) => publicClient.readContract({ address: ADDR.rewardsPool, abi, functionName: functionName as "dailyCap" })));

const welcome = g(arg("welcome"), 800n * G);
const signups = BigInt(arg("signups") ?? 10);
const nDaily = g(arg("daily"), dCap + welcome);          // a welcome claim and a normal day's rewards in the same day
const nWeekly = g(arg("weekly"), wCap + welcome);
const nBudget = g(arg("budget"), budget + welcome * signups);

const f = (x: bigint) => `${Number(formatUnits(x, 18)).toLocaleString("en")} G$`;
console.log(`Pool ${ADDR.rewardsPool}`);
console.log(`  dailyCap     ${f(dCap)} -> ${f(nDaily)}`);
console.log(`  weeklyCap    ${f(wCap)} -> ${f(nWeekly)}`);
console.log(`  dailyBudget  ${f(budget)} -> ${f(nBudget)}   (room for about ${signups} welcome claims a day)`);

const m = (name: string, inputs: { name: string; type: string }[]) => ({ inputs: inputs.map((i) => ({ ...i, internalType: i.type })), name, payable: false });
const file = arg("out") ?? `pool-caps-${new Date().toISOString().slice(0, 10)}.json`;
writeFileSync(file, JSON.stringify({
  version: "1.0", chainId: String(CHAIN_ID), createdAt: Date.now(),
  meta: { name: "Raise reward pool limits for the welcome claim", description: `dailyCap ${f(nDaily)}, weeklyCap ${f(nWeekly)}, dailyBudget ${f(nBudget)}` },
  transactions: [
    { to: ADDR.rewardsPool, value: "0", data: null, contractMethod: m("setCaps", [{ name: "daily", type: "uint256" }, { name: "weekly_", type: "uint256" }]), contractInputsValues: { daily: nDaily.toString(), weekly_: nWeekly.toString() } },
    { to: ADDR.rewardsPool, value: "0", data: null, contractMethod: m("setDailyBudget", [{ name: "budget", type: "uint256" }]), contractInputsValues: { budget: nBudget.toString() } },
  ],
}, null, 2));
console.log(`Written to ${file}. Import it in the Safe app (Transaction Builder). Then set DAILY_CAP_G=${Number(formatUnits(nDaily, 18))} in .env.`);
