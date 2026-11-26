import { createPublicClient, fallback, http } from "viem";
import { CHAIN, ADDR, RPC_URL, RPC_FALLBACK_URLS, identityAbi } from "./chain";

// The public RPC sometimes stalls. Give each endpoint 6 seconds and one retry, then move to the next, so one slow server never fails a page.
export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: fallback([RPC_URL, ...RPC_FALLBACK_URLS.filter((u) => u !== RPC_URL)].map((u) => http(u, { timeout: 6_000, retryCount: 1 }))),
});

const ZERO = "0x0000000000000000000000000000000000000000";

export type Verification = { verified: boolean; root: `0x${string}` | null; verifiedUntil: Date | null };

const vCache = new Map<string, { at: number; v: Verification }>();

/** Verified results are cached for 60s (4 RPC reads each). Negatives are never cached so a fresh face check shows up at once. */
export async function readVerificationCached(address: `0x${string}`): Promise<Verification> {
  const hit = vCache.get(address);
  if (hit && Date.now() - hit.at < 60_000) return hit.v;
  const v = await readVerification(address);
  if (v.verified) vCache.set(address, { at: Date.now(), v });
  return v;
}

/**
 * What the Identity contract told us about one address. A wallet counts as verified when it resolves to a verified person (its
 * "root"): the person's own wallet, or any wallet they have linked to their identity. A linked wallet is not itself whitelisted,
 * so asking isWhitelisted about it would say no. `last` is the root's last face check, in seconds; `period` is how many days one lasts.
 */
export function verificationFrom(o: { root: string; last: bigint; period: bigint }): Verification {
  const hasRoot = o.root !== ZERO;
  // authenticationPeriod is in days (same as the GoodDollar SDK).
  const verifiedUntil = hasRoot && o.last > 0n ? new Date((Number(o.last) + Number(o.period) * 86400) * 1000) : null;
  return { verified: hasRoot, root: hasRoot ? (o.root as `0x${string}`) : null, verifiedUntil };
}

/** Reads GoodDollar Identity on Celo: the verified person behind this wallet and when their face check runs out. */
export async function readVerification(address: `0x${string}`): Promise<Verification> {
  const root = await publicClient.readContract({ address: ADDR.identity, abi: identityAbi, functionName: "getWhitelistedRoot", args: [address] });
  if (root === ZERO) return verificationFrom({ root, last: 0n, period: 0n });
  // The face check belongs to the root, so that is where the date is read, even when the wallet asked about is a linked one.
  const [last, period] = await Promise.all([
    publicClient.readContract({ address: ADDR.identity, abi: identityAbi, functionName: "lastAuthenticated", args: [root] }),
    publicClient.readContract({ address: ADDR.identity, abi: identityAbi, functionName: "authenticationPeriod" }),
  ]);
  return verificationFrom({ root, last, period });
}
