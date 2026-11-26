import { describe, it, expect } from "vitest";
import { joinableByLength } from "../src/cohorts";

const DAY = 86400;
const t0 = Date.UTC(2026, 10, 23) / 1000; // 23 Nov 2026 00:00 UTC
const span = (startDay: number, len: number) => ({ start: t0 + startDay * DAY, end: t0 + (startDay + len) * DAY });

describe("open challenge, one cohort per length", () => {
  it("picks the cohort that started today, not a later one", () => {
    const spans = new Map([[1, span(0, 7)], [2, span(1, 7)], [3, span(2, 7)]]);
    expect([...joinableByLength(spans, t0 + 3600)]).toEqual([[7, 1]]);
  });

  it("skips a cohort whose first day is over and takes the next", () => {
    const spans = new Map([[1, span(-1, 7)], [2, span(0, 7)]]);
    expect(joinableByLength(spans, t0 + 3600).get(7)).toBe(2);
    expect(joinableByLength(spans, t0 + 3600 - DAY).get(7)).toBe(1);
  });

  it("keeps 7, 14 and 30 day goals apart", () => {
    const spans = new Map([[1, span(0, 7)], [2, span(0, 14)], [3, span(0, 30)], [4, span(1, 30)]]);
    const m = joinableByLength(spans, t0 + 3600);
    expect([m.get(7), m.get(14), m.get(30)]).toEqual([1, 2, 3]);
  });

  it("has nothing to join once every cohort has passed its first day", () => {
    expect(joinableByLength(new Map([[1, span(-3, 7)]]), t0).size).toBe(0);
  });
});
