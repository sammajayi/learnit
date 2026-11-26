import { parseAbi, parseEventLogs, erc20Abi } from "viem";
import { publicClient } from "./identity";
import { ADDR } from "./chain";

const ubiAbi = parseAbi([
  "function checkEntitlement(address _member) view returns (uint256)",
  "function periodStart() view returns (uint256)",
]);

/** `dayEndsAt` is when the current UBI day ends, so the next claim opens then. It is always set, claimed or not. */
export type UbiStatus = { claimable: string; canClaim: boolean; nextClaimAt: number | null; dayEndsAt: number };

/**
 * When the current UBI day ends. The days are fixed 24-hour blocks counted from the scheme's start time, which never changes, so this comes from the
 * clock. Asking a node for the current day instead returned an old day from a node that was behind, and the card said the next claim was "now".
 */
export function nextUbiDay(periodStart: number, nowSec: number) {
  return periodStart + (Math.floor((nowSec - periodStart) / 86400) + 1) * 86400;
}

/** Entitlement is 0 once claimed today. The next claim opens when the UBI day ends. */
export async function readUbiStatus(address: `0x${string}`): Promise<UbiStatus> {
  const [entitlement, periodStart] = await Promise.all([
    publicClient.readContract({ address: ADDR.ubiScheme, abi: ubiAbi, functionName: "checkEntitlement", args: [address] }),
    publicClient.readContract({ address: ADDR.ubiScheme, abi: ubiAbi, functionName: "periodStart" }),
  ]);
  const next = nextUbiDay(Number(periodStart), Math.floor(Date.now() / 1000));
  return { claimable: entitlement.toString(), canClaim: entitlement > 0n, nextClaimAt: entitlement > 0n ? null : next, dayEndsAt: next };
}

/**
 * A claim we have already checked on the chain and recorded counts for the rest of its UBI day. Right after a claim, the node we ask can be a
 * block or two behind and still report the old entitlement, which brought the Claim button back. Our own record is the better witness.
 */
export function withLocalClaim(status: UbiStatus, lastClaimedAtSec: number | null): UbiStatus {
  if (!status.canClaim || lastClaimedAtSec === null) return status;
  if (lastClaimedAtSec < status.dayEndsAt - 86400) return status; // claimed on an earlier UBI day
  return { ...status, claimable: "0", canClaim: false, nextClaimAt: status.dayEndsAt };
}

/** Confirms a claim tx succeeded for this wallet and returns the G$ received (sum of Transfer logs to the wallet). */
export async function verifyClaimTx(txHash: `0x${string}`, wallet: `0x${string}`) {
  // The wallet has the receipt the moment the claim lands, but the node we ask may not yet. Wait for it instead of failing on the first miss.
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 15_000, pollingInterval: 1_000 });
  if (receipt.status !== "success") throw new Error("Transaction failed");
  if (receipt.from.toLowerCase() !== wallet.toLowerCase()) throw new Error("Transaction is not from this wallet");
  const logs = parseEventLogs({ abi: erc20Abi, eventName: "Transfer", logs: receipt.logs.filter((l) => l.address.toLowerCase() === ADDR.gd.toLowerCase()) });
  const received = logs.filter((l) => l.args.to.toLowerCase() === wallet.toLowerCase()).reduce((s, l) => s + l.args.value, 0n);
  return { amount: received.toString(), blockTime: Number((await publicClient.getBlock({ blockNumber: receipt.blockNumber })).timestamp) };
}
