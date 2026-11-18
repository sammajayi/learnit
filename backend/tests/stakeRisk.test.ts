import { describe, it, expect } from "vitest";
import { riskEmail } from "../src/stakeRisk";

describe("stake-at-risk email copy", () => {
  it("names the language and the days left", () => {
    const r = riskEmail(3, "es");
    expect(r.subject).toContain("at risk");
    expect(r.html).toContain("Spanish");
    expect(r.html).toContain("3 days left");
  });
  it("uses singular 'day' for exactly one day left", () => {
    expect(riskEmail(1, "fr").html).toContain("1 day left");
  });
  it("drops the days-left clause when the challenge is already over", () => {
    expect(riskEmail(0, "fr").html).not.toContain("left on the clock");
  });
  it("links to /learn", () => { expect(riskEmail(2, "fr").html).toContain("/learn"); });
  it("uses no em dashes", () => { expect(riskEmail(2, "fr").html).not.toContain("—"); });
});
