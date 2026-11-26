import { describe, it, expect } from "vitest";
import { countedSeconds, LEARNING_CAP_SECONDS } from "../src/learningTime";

describe("countedSeconds", () => {
  it("counts a normal lesson as it took", () => expect(countedSeconds(95)).toBe(95));
  it("caps a lesson that was left open", () => {
    expect(countedSeconds(6 * 3600)).toBe(LEARNING_CAP_SECONDS);
    expect(LEARNING_CAP_SECONDS).toBe(1800);
  });
  it("never counts less than nothing or garbage", () => {
    expect(countedSeconds(-5)).toBe(0);
    expect(countedSeconds(Number.NaN)).toBe(0);
  });
});
