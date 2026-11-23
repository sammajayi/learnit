import { describe, it, expect, afterEach } from "vitest";
import { claimTypedData, eligibility, engagementEnabled, engagementContract } from "../src/engagement";

const APP = "0x1111111111111111111111111111111111111111" as const;
const NOBODY = "0x0000000000000000000000000000000000000000" as const;

describe("engagement reward", () => {
  afterEach(() => { delete process.env.NEXT_PUBLIC_ENGAGEMENT_ENABLED; delete process.env.ENGAGEMENT_REWARDS_ADDRESS; });

  it("is off unless explicitly switched on", () => {
    expect(engagementEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_ENGAGEMENT_ENABLED = "true";
    expect(engagementEnabled()).toBe(true);
    process.env.NEXT_PUBLIC_ENGAGEMENT_ENABLED = "1";
    expect(engagementEnabled()).toBe(false);
  });

  it("uses the development contract until a production address is set", () => {
    expect(engagementContract()).toBe("0xb44fC3A592aDaA257AECe1Ae8956019EA53d0465");
    process.env.ENGAGEMENT_REWARDS_ADDRESS = "0x25db74CF4E7BA120526fd87e159CF656d94bAE43";
    expect(engagementContract()).toBe("0x25db74CF4E7BA120526fd87e159CF656d94bAE43");
  });

  it("needs GoodDollar verification and a passed lesson, and only once", () => {
    expect(eligibility({ verified: false, passedLesson: true, alreadyClaimed: false })).toBe("not_verified");
    expect(eligibility({ verified: true, passedLesson: false, alreadyClaimed: false })).toBe("no_lesson");
    expect(eligibility({ verified: true, passedLesson: true, alreadyClaimed: true })).toBe("already_claimed");
    expect(eligibility({ verified: true, passedLesson: true, alreadyClaimed: false })).toBeNull();
  });

  it("builds the claim message the contract checks", () => {
    const t = claimTypedData({ app: APP, inviter: NOBODY, validUntilBlock: 123n, description: "Learn French or Spanish" });
    expect(t.domain.name).toBe("EngagementRewards");
    expect(t.domain.version).toBe("1.0");
    expect(t.primaryType).toBe("Claim");
    expect(t.types.Claim.map((f) => `${f.type} ${f.name}`)).toEqual(["address app", "address inviter", "uint256 validUntilBlock", "string description"]);
    expect(t.message).toEqual({ app: APP, inviter: NOBODY, validUntilBlock: 123n, description: "Learn French or Spanish" });
  });
});
