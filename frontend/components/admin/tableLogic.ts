/** Pure helpers behind DataTable: sorting and CSV. Kept free of React so they can be tested on their own. */
export type Sortable = string | number | null;
export type Dir = "asc" | "desc";

/** Numbers compare as numbers, text compares naturally ("Challenge 2" before "Challenge 10"). Empty values always sort last. */
export function compareValues(a: Sortable, b: Sortable, dir: Dir): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const r = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "en", { numeric: true, sensitivity: "base" });
  return dir === "asc" ? r : -r;
}

/** A stable sort: rows that tie keep their original order. */
export function sortRows<T>(rows: readonly T[], value: (row: T) => Sortable, dir: Dir): T[] {
  return rows.map((r, i) => [r, i] as const).sort(([a, i], [b, j]) => compareValues(value(a), value(b), dir) || i - j).map(([r]) => r);
}

/**
 * One CSV cell. Text that starts with = + - @ is prefixed with an apostrophe so a spreadsheet never runs it as a formula
 * (usernames are typed by users, so this matters). Numbers are left alone.
 */
export function csvCell(v: Sortable): string {
  if (v === null) return "";
  let s = String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: Sortable[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}
