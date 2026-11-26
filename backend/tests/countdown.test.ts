import { describe, it, expect } from "vitest";
import { nextClaimText } from "../../frontend/lib/countdown";

describe("next claim wording", () => {
  it("says hours and minutes", () => {
    expect(nextClaimText(14 * 3600 + 22 * 60)).toBe("next in 14h 22m");
    expect(nextClaimText(3600)).toBe("next in 1h 0m");
  });
  it("says only minutes under an hour", () => {
    expect(nextClaimText(45 * 60)).toBe("next in 45m");
  });
  it("rounds a part minute up, so it never reads 0m", () => {
    expect(nextClaimText(61)).toBe("next in 2m");
    expect(nextClaimText(30)).toBe("next in under 1m");
  });
  it("never shows 00:00:00 when the time is zero or unknown", () => {
    expect(nextClaimText(0)).toBe("next claim now");
    expect(nextClaimText(null)).toBe("next claim soon");
    expect(nextClaimText(Number.NaN)).toBe("next claim soon");
    for (const v of [0, null, 1, 59, 60]) expect(nextClaimText(v)).not.toContain("00:00");
  });
});
