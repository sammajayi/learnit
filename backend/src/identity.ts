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

/** Reads GoodDollar Identity on Celo: whitelisted root and the expiry (lastAuthenticated + authenticationPeriod). */
export async function readVerification(address: `0x${string}`): Promise<Verification> {
  const [whitelisted, root, last, period] = await Promise.all([
    publicClient.readContract({ address: ADDR.identity, abi: identityAbi, functionName: "isWhitelisted", args: [address] }),
    publicClient.readContract({ address: ADDR.identity, abi: identityAbi, functionName: "getWhitelistedRoot", args: [address] }),
    publicClient.readContract({ address: ADDR.identity, abi: identityAbi, functionName: "lastAuthenticated", args: [address] }),
    publicClient.readContract({ address: ADDR.identity, abi: identityAbi, functionName: "authenticationPeriod" }),
  ]);
  const hasRoot = root !== ZERO;
  // authenticationPeriod is in days (same as the GoodDollar SDK).
  const verifiedUntil = last > 0n ? new Date((Number(last) + Number(period) * 86400) * 1000) : null;
  return { verified: Boolean(whitelisted) && hasRoot, root: hasRoot ? root : null, verifiedUntil };
}
