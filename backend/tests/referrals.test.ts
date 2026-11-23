import { describe, it, expect, afterEach } from "vitest";
import { cleanSource, referralsEnabled } from "../src/referrals";

describe("referral helpers", () => {
  afterEach(() => { delete process.env.NEXT_PUBLIC_REFERRALS_ENABLED; });

  it("accepts a simple community tag and lowercases it", () => {
    expect(cleanSource("Celo")).toBe("celo");
    expect(cleanSource("gooddollar-dao_1")).toBe("gooddollar-dao_1");
  });

  it("rejects tags that are empty, too long or contain odd characters", () => {
    expect(cleanSource("")).toBeNull();
    expect(cleanSource("a".repeat(33))).toBeNull();
    expect(cleanSource("celo community")).toBeNull();
    expect(cleanSource("<script>")).toBeNull();
    expect(cleanSource(undefined)).toBeNull();
  });

  it("is off unless explicitly switched on", () => {
    expect(referralsEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_REFERRALS_ENABLED = "true";
    expect(referralsEnabled()).toBe(true);
    process.env.NEXT_PUBLIC_REFERRALS_ENABLED = "yes";
    expect(referralsEnabled()).toBe(false);
  });
});

import { referralCounts, MIN_REFERRAL_STAKE } from "../src/referrals";

describe("when a referral counts", () => {
  const all = { verified: true, learned: true, engaged: true, staked: true };
  it("needs verification, a passed lesson, a confirmed engagement reward and a 1,000 G$ stake", () => {
    expect(referralCounts(all)).toBe(true);
  });
  it("does not count while any one of the four is missing", () => {
    for (const k of Object.keys(all) as (keyof typeof all)[]) expect(referralCounts({ ...all, [k]: false })).toBe(false);
  });
  it("sets the stake bar at 1,000 G$", () => {
    expect(MIN_REFERRAL_STAKE).toBe(1000n * 10n ** 18n);
  });
});
