import { describe, it, expect } from "vitest";
import { flowClaimMessage, checkClaimBody, FLOW_COUNCIL, FLOW_CHAIN } from "../src/flowClaim";

const wallet = "0x7a3F0000000000000000000000000000000c91E1";
const sig = "0x" + "ab".repeat(65);
const now = Date.UTC(2026, 10, 25, 12, 0, 0);

describe("Flow Council claim message", () => {
  it("is the exact text Flow State asks a wallet to sign", () => {
    expect(flowClaimMessage(wallet, now + 123)).toBe(
      ["Claim voting rights in this Flow Council.", "", `Council: ${FLOW_COUNCIL}`, `Chain: ${FLOW_CHAIN}`, `Wallet: ${wallet.toLowerCase()}`, "Issued at: 2026-11-25T12:00:00Z"].join("\n"),
    );
  });
});

describe("claim request check", () => {
  it("accepts a fresh claim for the signed-in wallet", () => {
    const r = checkClaimBody({ address: wallet, issuedAt: now - 1000, signature: sig }, wallet, now);
    expect(r.ok).toBe(true);
  });
  it("matches the wallet whatever the letter case", () => {
    expect(checkClaimBody({ address: wallet.toLowerCase(), issuedAt: now, signature: sig }, wallet, now).ok).toBe(true);
  });
  it("refuses a claim for someone else's wallet", () => {
    const r = checkClaimBody({ address: "0x1111111111111111111111111111111111111111", issuedAt: now, signature: sig }, wallet, now);
    expect(r.ok).toBe(false);
  });
  it("refuses a stale or future-dated claim", () => {
    expect(checkClaimBody({ address: wallet, issuedAt: now - 200_000, signature: sig }, wallet, now).ok).toBe(false);
    expect(checkClaimBody({ address: wallet, issuedAt: now + 200_000, signature: sig }, wallet, now).ok).toBe(false);
  });
  it("refuses bad shapes", () => {
    for (const body of [null, {}, { address: "nope", issuedAt: now, signature: sig }, { address: wallet, issuedAt: "x", signature: sig }, { address: wallet, issuedAt: now, signature: "0x12" }]) {
      expect(checkClaimBody(body, wallet, now).ok).toBe(false);
    }
  });
});
