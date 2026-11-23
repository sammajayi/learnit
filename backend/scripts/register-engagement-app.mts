// Registers LearnIt with GoodDollar's EngagementRewards contract, and on the DEVELOPMENT contract approves it too.
//   npx tsx --env-file=.env scripts/register-engagement-app.mts            (dry run, prints what it would send)
//   npx tsx --env-file=.env scripts/register-engagement-app.mts --send     (sends the transactions)
// Needs ENGAGEMENT_APP_PRIVATE_KEY (this wallet becomes the app and pays the network fee, so it needs a little CELO).
// On production the approval is GoodDollar's to give: this script only applies. Percentages: 74 of the reward goes to
// the user and inviter together, and 57 of that is the user's share. Per 5,000 G$: the app keeps 1,300, the learner gets 2,109
// and the inviter 1,591 (whole-number percentages only, so this is the closest to moving 300 G$ from the learner to LearnIt).
import { createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CHAIN, RPC_URL } from "../src/chain";
import { publicClient } from "../src/identity";
import { engagementContract } from "../src/engagement";

const send = process.argv.includes("--send");
const key = process.env.ENGAGEMENT_APP_PRIVATE_KEY as `0x${string}` | undefined;
if (!key) throw new Error("ENGAGEMENT_APP_PRIVATE_KEY is not set");
const account = privateKeyToAccount(key);
const contract = engagementContract();
const dev = contract.toLowerCase() === "0xb44fc3a592adaa257aece1ae8956019ea53d0465";

const abi = parseAbi([
  "function applyApp(address app, address rewardReceiver, uint8 userAndInviterPercentage, uint8 userPercentage, string description, string url, string email)",
  "function approve(address app)",
]);
const args = [account.address, account.address, 74, 57,
  "LearnIt teaches French and Spanish in short daily lessons, and rewards verified learners with GoodDollar.",
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.uselearnit.xyz",
  process.env.ENGAGEMENT_APP_EMAIL || "hello@uselearnit.xyz"] as const;

console.log(`Contract ${contract}${dev ? " (development)" : " (production)"}\nApp wallet ${account.address}`);
if (!send) { console.log("Dry run. Add --send to apply" + (dev ? " and approve." : ". GoodDollar approves on production.")); process.exit(0); }

const wallet = createWalletClient({ account, chain: CHAIN, transport: http(RPC_URL) });
const a = await wallet.writeContract({ address: contract, abi, functionName: "applyApp", args });
await publicClient.waitForTransactionReceipt({ hash: a });
console.log("Applied:", a);
if (dev) {
  const p = await wallet.writeContract({ address: contract, abi, functionName: "approve", args: [account.address] });
  await publicClient.waitForTransactionReceipt({ hash: p });
  console.log("Approved:", p);
}
