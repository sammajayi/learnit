import { describe, it, expect } from "vitest";
import { CONTEST_DAYS, DEFAULT_SHARES, PRIZE_RANKS, addDays, closedDates, contestWindow, joinedOn, missedADay, prizeAmounts, rankContest } from "../src/contestRules";

const A = "2026-11-30"; // the anchor

describe("contestWindow: back to back 14 day contests from the anchor", () => {
  it("is the first contest, live, on its first day", () => {
    const w = contestWindow("2026-11-30", A);
    expect(w).toMatchObject({ index: 0, start: "2026-11-30", end: "2026-12-13", status: "live" });
    expect(w.dates).toHaveLength(CONTEST_DAYS);
  });
  it("is still the first contest on its last day, and the second starts the day after", () => {
    expect(contestWindow("2026-12-13", A).index).toBe(0);
    expect(contestWindow("2026-12-14", A)).toMatchObject({ index: 1, start: "2026-12-14", end: "2026-12-27" });
  });
  it("shows the first contest as upcoming before it starts", () => {
    expect(contestWindow("2026-11-27", A)).toMatchObject({ index: 0, start: "2026-11-30", status: "upcoming" });
  });
  it("says when the contest is over", () => {
    expect(contestWindow("2026-12-01", A).endsAt).toBe("2026-12-14T00:00:00.000Z");
  });
});

describe("showing up every day", () => {
  const w = contestWindow("2026-12-03", A);
  const days = (n: number) => new Set(w.dates.slice(0, n));
  it("only counts a day as missed once it is over everywhere (two UTC days behind)", () => {
    expect(closedDates(w.dates, "2026-12-03")).toEqual(["2026-11-30", "2026-12-01"]);
    expect(closedDates(w.dates, "2026-11-30")).toEqual([]);
  });
  it("is not missed while every closed day has a pass, even if later days are not here yet", () => {
    expect(missedADay(w.dates, days(2), "2026-12-03")).toBe(false);
  });
  it("is missed when a closed day since joining has no pass", () => {
    expect(missedADay(w.dates, new Set(["2026-11-30"]), "2026-12-03")).toBe(true); // joined day 1, nothing on day 2
    expect(missedADay(w.dates, new Set(["2026-11-30", "2026-12-02"]), "2026-12-05")).toBe(true); // a gap on 12-01
  });
  it("anyone can join anytime: days before you joined are not missed", () => {
    expect(missedADay(w.dates, new Set(["2026-12-01"]), "2026-12-03")).toBe(false); // joined on day 2, so day 1 was never theirs
    expect(missedADay(w.dates, new Set(["2026-12-03", "2026-12-04", "2026-12-05"]), "2026-12-07")).toBe(false);
  });
  it("but once you have joined, every closed day after counts", () => {
    expect(missedADay(w.dates, new Set(["2026-12-03", "2026-12-05"]), "2026-12-07")).toBe(true); // joined day 4, nothing on day 5 (12-04)
  });
  it("someone who has not joined has missed nothing", () => {
    expect(missedADay(w.dates, new Set(), "2026-12-10")).toBe(false);
    expect(joinedOn(w.dates, new Set())).toBeNull();
    expect(joinedOn(w.dates, new Set(["2026-12-02", "2026-12-04"]))).toBe("2026-12-02");
  });
  it("a whole contest needs every day from the day you joined to the last day", () => {
    const done = contestWindow("2026-12-13", A);
    const end = addDays("2026-12-13", 2);
    expect(missedADay(done.dates, new Set(done.dates.slice(0, 13)), end)).toBe(true);  // joined on day 1, missed the last
    expect(missedADay(done.dates, new Set(done.dates), end)).toBe(false);
    expect(missedADay(done.dates, new Set(done.dates.slice(5)), end)).toBe(false);     // joined on day 6 and never missed after
  });
});

describe("rankContest", () => {
  const e = (userId: string, points: number, days: number, missed = false) => ({ userId, points, days, missed });
  it("ranks the people still in by points, then days, and puts anyone who missed a day after, without a rank", () => {
    const r = rankContest([e("c", 50, 3), e("a", 90, 3, true), e("b", 50, 4), e("d", 10, 2)]);
    expect(r.map((x) => [x.userId, x.rank])).toEqual([["b", 1], ["c", 2], ["d", 3], ["a", null]]);
  });
  it("never flips the order between two equal people", () => {
    const one = rankContest([e("x", 20, 2), e("y", 20, 2)]).map((x) => x.userId);
    const two = rankContest([e("y", 20, 2), e("x", 20, 2)]).map((x) => x.userId);
    expect(one).toEqual(two);
  });
});

describe("prizeAmounts", () => {
  it("splits the pool across the top 10 by the shares and never goes over", () => {
    const p = prizeAmounts(1000);
    expect(p).toHaveLength(PRIZE_RANKS);
    expect(p[0]).toBe(250);
    expect(p.reduce((s, x) => s + x, 0)).toBeLessThanOrEqual(1000);
    expect(p.reduce((s, x) => s + x, 0)).toBeGreaterThan(999.8);
  });
  it("pays rank 1 the most and every rank less than the one before", () => {
    const p = prizeAmounts(500);
    for (let i = 1; i < p.length; i++) expect(p[i]).toBeLessThanOrEqual(p[i - 1]);
  });
  it("the default shares add up to 100", () => {
    expect(DEFAULT_SHARES.reduce((s, x) => s + x, 0)).toBe(100);
  });
  it("is all zeros with no pool", () => {
    expect(prizeAmounts(0).every((x) => x === 0)).toBe(true);
  });
});
