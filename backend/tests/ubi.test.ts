import { describe, it, expect } from "vitest";
import { withLocalClaim, type UbiStatus } from "../src/ubi";

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
