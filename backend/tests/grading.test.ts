import { describe, it, expect } from "vitest";
import { gradeAll, isPass } from "../src/grading";
import { streakCount, localDate } from "../src/streak";
import { COURSES, seededDraw } from "../src/lessons";

describe("grading", () => {
  const ex = COURSES.fr[0].lessons[0].exercises;
  const perfect = Object.fromEntries(ex.map((e) => [e.id, e.type === "mc" ? e.answer : e.type === "translate" ? e.answer : e.pairs.map((p) => ({ target: p.target, english: p.english }))]));
  it("scores a perfect lesson at 100%", () => { expect(gradeAll(ex, perfect as never).accuracy).toBe(1); });
  it("scores empty answers at 0 and lists missed words", () => { const g = gradeAll(ex, {}); expect(g.accuracy).toBe(0); expect(g.missedWordIds.length).toBeGreaterThan(0); });
  it("needs 80% accuracy", () => { expect(isPass(0.8)).toBe(true); expect(isPass(0.79)).toBe(false); });
  it("draws a stable 20 from the checkpoint pool", () => {
    const a = seededDraw(COURSES.es[0].checkpoint.pool, 42, 20).map((e) => e.id), b = seededDraw(COURSES.es[0].checkpoint.pool, 42, 20).map((e) => e.id);
    expect(a).toEqual(b); expect(new Set(a).size).toBe(20);
  });
});
describe("streak", () => {
  it("counts consecutive days", () => { expect(streakCount(["2026-11-01", "2026-11-02", "2026-11-03"], "2026-11-03")).toBe(3); });
  it("keeps the streak alive until the day ends", () => { expect(streakCount(["2026-11-01", "2026-11-02"], "2026-11-03")).toBe(2); });
  it("breaks after a missed day", () => { expect(streakCount(["2026-10-30"], "2026-11-03")).toBe(0); });
  it("uses the user's timezone for the local date", () => { expect(localDate(new Date("2026-11-03T23:30:00Z"), "Africa/Lagos")).toBe("2026-11-04"); });
});

import { outcomeFor } from "../src/grading";

describe("outcomeFor", () => {
  it("counts a lesson as done at any score", () => {
    for (const accuracy of [0, 0.1, 0.5, 0.67, 0.79, 1]) expect(outcomeFor("lesson", accuracy).passed).toBe(true);
  });
  it("pays rewards only from the pass mark", () => {
    expect(outcomeFor("lesson", 0.79).rewardEligible).toBe(false);
    expect(outcomeFor("lesson", 0.8).rewardEligible).toBe(true);
    expect(outcomeFor("lesson", 0.1)).toEqual({ passed: true, rewardEligible: false });
  });
  it("keeps the pass mark for checkpoints", () => {
    expect(outcomeFor("checkpoint", 0.79)).toEqual({ passed: false, rewardEligible: false });
    expect(outcomeFor("checkpoint", 0.9)).toEqual({ passed: true, rewardEligible: true });
  });
});

describe("accuracy in a 6 question lesson", () => {
  const ex = Array.from({ length: 6 }, (_, i) => ({ id: `q${i}`, type: "mc" as const, prompt: "", options: ["a", "b"], answer: 0, wordId: `w${i}` }));
  const score = (wrong: number) => gradeAll(ex as never, Object.fromEntries(ex.map((e, i) => [e.id, i < wrong ? 1 : 0]))).accuracy;
  it("drops with every first-try miss", () => {
    expect(score(0)).toBe(1);
    expect(score(1)).toBeCloseTo(5 / 6);
    expect(score(2)).toBeCloseTo(4 / 6);
    expect(score(3)).toBeCloseTo(3 / 6);
  });
});
