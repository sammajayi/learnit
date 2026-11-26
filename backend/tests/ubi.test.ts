import { describe, it, expect } from "vitest";
import { nextUbiDay, withLocalClaim, type UbiStatus } from "../src/ubi";

const DAY = 86400;
const end = 1_800_000_000;                      // when the current UBI day ends
const open: UbiStatus = { claimable: "12000000000000000000", canClaim: true, nextClaimAt: null, dayEndsAt: end };
const done: UbiStatus = { claimable: "0", canClaim: false, nextClaimAt: end, dayEndsAt: end };

describe("withLocalClaim: a claim we recorded beats a node that is a block behind", () => {
  it("says claimed when the node still shows the old entitlement right after our own claim", () => {
    expect(withLocalClaim(open, end - DAY + 120)).toEqual(done);
  });
  it("keeps the next claim at the end of the UBI day", () => {
    expect(withLocalClaim(open, end - 5).nextClaimAt).toBe(end);
  });
  it("still offers the claim when the last one was on an earlier UBI day", () => {
    expect(withLocalClaim(open, end - DAY - 60)).toEqual(open);
  });
  it("offers the claim to someone who has never claimed", () => {
    expect(withLocalClaim(open, null)).toEqual(open);
  });
  it("leaves an already-claimed status alone", () => {
    expect(withLocalClaim(done, end - 100)).toEqual(done);
  });
  it("counts a claim made in the very first second of the day", () => {
    expect(withLocalClaim(open, end - DAY)).toEqual(done);
  });
});

describe("nextUbiDay: the day boundary comes from the clock, never from a node that may be behind", () => {
  const start = 1_700_000_000; // the scheme's start time
  it("is always in the future, so the card can never say the next claim is now", () => {
    for (const now of [start, start + 1, start + 86399, start + 86400, start + 5 * 86400 + 4000]) expect(nextUbiDay(start, now)).toBeGreaterThan(now);
  });
  it("is at most one day away and lands on a day boundary", () => {
    const now = start + 3 * 86400 + 4321;
    expect(nextUbiDay(start, now) - now).toBeLessThanOrEqual(86400);
    expect((nextUbiDay(start, now) - start) % 86400).toBe(0);
  });
  it("rolls over exactly at the boundary", () => {
    expect(nextUbiDay(start, start + 86400 - 1)).toBe(start + 86400);
    expect(nextUbiDay(start, start + 86400)).toBe(start + 2 * 86400);
  });
});
