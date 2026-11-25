import { isAddress } from "viem";

/** GoodDollar's GoodBuilders Flow Council on Celo. A verified wallet gets voting power by signing a free claim message. */
export const FLOW_COUNCIL = "0x889e0aadaa3f8b28a794ef70da147827c620a590";
export const FLOW_CHAIN = 42220;
const MAX_AGE_MS = 180_000;

/** The exact message Flow State asks a wallet to sign to claim voting rights. It claims membership only; voting is a separate transaction. */
export function flowClaimMessage(address: string, issuedAt: number) {
  const timestamp = new Date(Math.floor(issuedAt / 1000) * 1000).toISOString().replace(/\.\d+Z$/, "Z");
  return ["Claim voting rights in this Flow Council.", "", `Council: ${FLOW_COUNCIL}`, `Chain: ${FLOW_CHAIN}`, `Wallet: ${address.toLowerCase()}`, `Issued at: ${timestamp}`].join("\n");
}

export type ClaimBody = { address: `0x${string}`; issuedAt: number; signature: `0x${string}` };

/** The claim must be for the learner's own wallet, recent, and shaped like a signature. */
export function checkClaimBody(raw: unknown, ownWallet: string, now = Date.now()): { ok: true; body: ClaimBody } | { ok: false; error: string } {
  const b = (raw ?? {}) as { address?: unknown; issuedAt?: unknown; signature?: unknown };
  if (typeof b.address !== "string" || !isAddress(b.address, { strict: false })) return { ok: false, error: "Invalid request." };
  if (b.address.toLowerCase() !== ownWallet.toLowerCase()) return { ok: false, error: "This claim is for a different wallet." };
  if (typeof b.issuedAt !== "number" || !Number.isSafeInteger(b.issuedAt) || Math.abs(now - b.issuedAt) > MAX_AGE_MS) return { ok: false, error: "The signature expired. Try again." };
  if (typeof b.signature !== "string" || !/^0x[0-9a-fA-F]{130,}$/.test(b.signature)) return { ok: false, error: "Invalid request." };
  return { ok: true, body: { address: b.address, issuedAt: b.issuedAt, signature: b.signature as `0x${string}` } };
}
