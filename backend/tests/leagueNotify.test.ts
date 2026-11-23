import { describe, it, expect } from "vitest";
import { leagueNotice, ordinal } from "../src/leagueNotify";

const G = 10n ** 18n;

describe("league result push", () => {
  it("writes ordinals, including the teens", () => {
    expect([1, 2, 3, 4, 7, 11, 12, 13, 21, 22, 101, 111].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "7th", "11th", "12th", "13th", "21st", "22nd", "101st", "111th"]);
  });

  it("tells a winner their bonus is ready when the voucher exists", () => {
    const n = leagueNotice({ rank: 1, points: 40, bonus: 2n * G, claimable: true });
    expect(n.title).toBe("You came 1st this week");
    expect(n.body).toBe("Your 2 G$ bonus is ready to claim.");
    expect(n.url).toBe("/earn");
  });

  it("asks an unverified winner to verify first", () => {
    const n = leagueNotice({ rank: 3, points: 12, bonus: (3n * G) / 2n, claimable: false });
    expect(n.title).toBe("You came 3rd this week");
    expect(n.body).toBe("Verify with GoodDollar to claim your 1.5 G$ bonus.");
  });

  it("tells everyone else where they finished and to start a lesson", () => {
    const n = leagueNotice({ rank: 7, points: 9 });
    expect(n.title).toBe("You finished 7th this week");
    expect(n.body).toBe("Start a lesson to be on the podium this week.");
    expect(n.url).toBe("/learn");
  });

  it("does not rank someone who scored nothing", () => {
    expect(leagueNotice({ rank: 2, points: 0 }).title).toBe("No lessons in the league last week");
  });

  it("keeps copy free of em dashes", () => {
    for (const r of [1, 2, 5]) for (const c of [true, false]) {
      const n = leagueNotice({ rank: r, points: 5, bonus: G, claimable: c });
      expect(`${n.title}${n.body}`).not.toContain("—");
    }
  });
});
