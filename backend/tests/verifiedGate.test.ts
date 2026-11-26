import { describe, it, expect } from "vitest";
import { isVerifiedNow } from "../src/verifiedGate";

const now = new Date("2026-11-23T12:00:00Z");
const day = 86400_000;

describe("lesson gate", () => {
  it("lets in someone verified whose verification has not expired", () => {
    expect(isVerifiedNow({ verified: true, verifiedUntil: new Date(now.getTime() + day) }, now)).toBe(true);
  });
  it("lets in a verified learner with no expiry on record", () => {
    expect(isVerifiedNow({ verified: true, verifiedUntil: null }, now)).toBe(true);
  });
  it("keeps out someone who is not verified", () => {
    expect(isVerifiedNow({ verified: false, verifiedUntil: null }, now)).toBe(false);
    expect(isVerifiedNow({ verified: false, verifiedUntil: new Date(now.getTime() + day) }, now)).toBe(false);
  });
  it("keeps out someone whose verification has run out", () => {
    expect(isVerifiedNow({ verified: true, verifiedUntil: new Date(now.getTime() - 1000) }, now)).toBe(false);
  });
});
