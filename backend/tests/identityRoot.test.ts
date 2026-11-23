import { describe, it, expect } from "vitest";
import { verificationFrom } from "../src/identity";

const ZERO = "0x0000000000000000000000000000000000000000";
const ROOT = "0x1111111111111111111111111111111111111111";
const last = BigInt(Math.floor(Date.UTC(2026, 10, 1) / 1000));

describe("who counts as verified", () => {
  it("counts a wallet that resolves to a verified person, including a linked wallet", () => {
    const v = verificationFrom({ root: ROOT, last, period: 180n });
    expect(v.verified).toBe(true);
    expect(v.root).toBe(ROOT);
  });
  it("does not count a wallet with no verified person behind it", () => {
    expect(verificationFrom({ root: ZERO, last: 0n, period: 180n })).toEqual({ verified: false, root: null, verifiedUntil: null });
  });
  it("works out when the face check runs out from the root's last check", () => {
    const v = verificationFrom({ root: ROOT, last, period: 180n });
    expect(v.verifiedUntil?.toISOString()).toBe(new Date((Number(last) + 180 * 86400) * 1000).toISOString());
  });
  it("has no expiry when there is no check on record", () => {
    expect(verificationFrom({ root: ROOT, last: 0n, period: 180n }).verifiedUntil).toBeNull();
  });
});
