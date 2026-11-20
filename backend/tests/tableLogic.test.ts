import { describe, it, expect } from "vitest";
import { compareValues, csvCell, sortRows, toCsv } from "../../frontend/components/admin/tableLogic";

describe("sortRows", () => {
  const rows = [{ n: "Challenge 10", v: 5 }, { n: "Challenge 2", v: null }, { n: "Challenge 1", v: 5 }, { n: "Challenge 3", v: 1 }];
  it("sorts text naturally", () => expect(sortRows(rows, (r) => r.n, "asc").map((r) => r.n)).toEqual(["Challenge 1", "Challenge 2", "Challenge 3", "Challenge 10"]));
  it("keeps empty values last in both directions", () => {
    expect(sortRows(rows, (r) => r.v, "asc").at(-1)?.v).toBeNull();
    expect(sortRows(rows, (r) => r.v, "desc").at(-1)?.v).toBeNull();
  });
  it("keeps tied rows in their original order", () => expect(sortRows(rows, (r) => r.v, "asc").filter((r) => r.v === 5).map((r) => r.n)).toEqual(["Challenge 10", "Challenge 1"]));
  it("compares numbers as numbers", () => expect(compareValues(9, 10, "asc")).toBeLessThan(0));
});

describe("csv", () => {
  it("quotes commas, quotes and new lines", () => expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"'));
  it("defuses spreadsheet formulas in text", () => {
    for (const bad of ["=SUM(A1)", "+1", "-1+2", "@cmd", "\tx"]) expect(csvCell(bad).startsWith("'") || csvCell(bad).startsWith(`"'`)).toBe(true);
  });
  it("leaves negative numbers alone", () => expect(csvCell(-5)).toBe("-5"));
  it("writes empty values as nothing", () => expect(toCsv(["a", "b"], [["x", null]])).toBe("a,b\nx,"));
});
