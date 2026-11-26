import { describe, it, expect } from "vitest";
import { validateGoal, REASON_MAX } from "../src/goal";

describe("goal note", () => {
  it("accepts a 7, 14 or 30 day goal with a reason", () => {
    for (const d of [7, 14, 30]) expect(validateGoal({ goalDays: d, reason: "To talk to my gran." })).toEqual({ ok: true, reason: "To talk to my gran.", goalDays: d });
  });
  it("rejects any other length", () => {
    for (const d of [0, 3, 10, 365, "7", null, undefined]) expect(validateGoal({ goalDays: d, reason: "Because." }).ok).toBe(false);
  });
  it("needs a few words of reason", () => {
    expect(validateGoal({ goalDays: 7, reason: "" }).ok).toBe(false);
    expect(validateGoal({ goalDays: 7, reason: "  a " }).ok).toBe(false);
    expect(validateGoal({ goalDays: 7, reason: undefined }).ok).toBe(false);
  });
  it("tidies whitespace and keeps the reason to 200 characters", () => {
    const r = validateGoal({ goalDays: 14, reason: "  For   my\ttrip  " });
    expect(r.ok && r.reason).toBe("For my trip");
    const long = validateGoal({ goalDays: 14, reason: "a".repeat(500) });
    expect(long.ok && long.reason.length).toBe(REASON_MAX);
  });
});
