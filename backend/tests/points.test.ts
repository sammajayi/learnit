import { describe, it, expect } from "vitest";
import { pointsFor } from "../src/points";

describe("pointsFor", () => {
  it("gives a lesson up to 10 points, rising with accuracy", () => {
    expect(pointsFor("lesson", 1)).toBe(10);
    expect(pointsFor("lesson", 5 / 6)).toBe(8);
    expect(pointsFor("lesson", 4 / 6)).toBe(7);
    expect(pointsFor("lesson", 0.5)).toBe(5);
  });
  it("gives a checkpoint up to 30 points", () => {
    expect(pointsFor("checkpoint", 1)).toBe(30);
    expect(pointsFor("checkpoint", 0.8)).toBe(24);
  });
  it("never leaves a finished lesson on zero", () => {
    expect(pointsFor("lesson", 0)).toBe(1);
    expect(pointsFor("lesson", 0.04)).toBe(1);
  });
  it("is steady for odd input", () => {
    expect(pointsFor("lesson", 3)).toBe(10);
    expect(pointsFor("lesson", -1)).toBe(1);
    expect(pointsFor("lesson", Number.NaN)).toBe(1);
  });
  it("a better score is never worth fewer points", () => {
    let last = 0;
    for (let i = 0; i <= 100; i++) { const p = pointsFor("lesson", i / 100); expect(p).toBeGreaterThanOrEqual(last); last = p; }
  });
});
