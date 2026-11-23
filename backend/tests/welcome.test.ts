import { describe, it, expect, afterEach } from "vitest";
import { welcomeEligibility, welcomeEnabled, welcomeFrom, welcomeAmount } from "../src/welcome";

const from = new Date("2026-11-24T00:00:00Z");
const ok = { createdAt: new Date("2026-11-25T10:00:00Z"), from, verified: true, passedLesson: true, claimed: false, flagged: false };

describe("one-time welcome G$", () => {
  afterEach(() => { for (const k of ["NEXT_PUBLIC_WELCOME_ENABLED", "WELCOME_FROM", "WELCOME_G"]) delete process.env[k]; });

  it("is off unless switched on, and nobody is eligible without a launch date", () => {
    expect(welcomeEnabled()).toBe(false);
    expect(welcomeFrom()).toBeNull();
    expect(welcomeEligibility({ ...ok, from: null })).toBe("off");
  });
  it("reads the launch date and the amount (800 G$ by default)", () => {
    process.env.WELCOME_FROM = "2026-11-24T00:00:00Z";
    expect(welcomeFrom()?.toISOString()).toBe("2026-11-24T00:00:00.000Z");
    expect(welcomeAmount()).toBe(800n * 10n ** 18n);
    process.env.WELCOME_G = "500";
    expect(welcomeAmount()).toBe(500n * 10n ** 18n);
  });
  it("ignores a launch date that is not a date", () => {
    process.env.WELCOME_FROM = "soon";
    expect(welcomeFrom()).toBeNull();
  });
  it("is for new accounts only", () => {
    expect(welcomeEligibility({ ...ok, createdAt: new Date("2026-11-20T00:00:00Z") })).toBe("not_new");
    expect(welcomeEligibility({ ...ok, createdAt: from })).toBeNull();
  });
  it("needs verification and a passed lesson", () => {
    expect(welcomeEligibility({ ...ok, verified: false })).toBe("not_verified");
    expect(welcomeEligibility({ ...ok, passedLesson: false })).toBe("no_lesson");
  });
  it("is once only, and not for flagged accounts", () => {
    expect(welcomeEligibility({ ...ok, claimed: true })).toBe("claimed");
    expect(welcomeEligibility({ ...ok, flagged: true })).toBe("flagged");
  });
  it("lets a new, verified learner who passed a lesson claim", () => {
    expect(welcomeEligibility(ok)).toBeNull();
  });
});
