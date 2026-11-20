"use client";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Download, Search } from "@/components/icons";
import { Button, fieldClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import { sortRows, toCsv, type Dir, type Sortable } from "./tableLogic";

export type Col<T> = {
  key: string;
  header: string;
  /** What the column sorts by. null sorts last. Also what the CSV holds, unless `exportValue` says otherwise. */
  value: (row: T) => Sortable;
  render?: (row: T) => ReactNode;
  exportValue?: (row: T) => Sortable;
  align?: "right";
  /** Leave the column out of the CSV, for buttons. */
  noExport?: boolean;
};

type Props<T> = {
  /** Names the table for screen readers. */
  label: string;
  rows: readonly T[];
  cols: Col<T>[];
  rowKey: (row: T) => string;
  initialSort?: { key: string; dir: Dir };
  pageSize?: number;
  /** Turns on the search box. Return all the text a row should be found by. */
  searchText?: (row: T) => string;
  /** Extra controls beside the search box, such as filters. */
  filters?: ReactNode;
  /** Turns on the CSV button; the file is named after this. */
  exportName?: string;
  empty?: ReactNode;
};

/** A small spreadsheet: click a heading to sort, search, page through, and export what you see. */
export function DataTable<T>({ label, rows, cols, rowKey, initialSort, pageSize = 25, searchText, filters, exportName, empty = "Nothing matches." }: Props<T>) {
  const [sort, setSort] = useState<{ key: string; dir: Dir } | null>(initialSort ?? null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const found = needle && searchText ? rows.filter((r) => searchText(r).toLowerCase().includes(needle)) : rows;
    const col = sort ? cols.find((c) => c.key === sort.key) : undefined;
    return col && sort ? sortRows(found, col.value, sort.dir) : [...found];
  }, [rows, q, sort, cols, searchText]);

  const pages = Math.max(1, Math.ceil(shown.length / pageSize));
  const at = Math.min(page, pages - 1);
  const slice = shown.slice(at * pageSize, at * pageSize + pageSize);

  const toggle = (c: Col<T>) => {
    setPage(0);
    setSort((prev) => {
      if (prev?.key === c.key) return { key: c.key, dir: prev.dir === "asc" ? "desc" : "asc" };
      const first = rows.map(c.value).find((v) => v !== null);
      return { key: c.key, dir: typeof first === "number" ? "desc" : "asc" };
    });
  };

  const download = () => {
    const out = cols.filter((c) => !c.noExport);
    const csv = toCsv(out.map((c) => c.header), shown.map((r) => out.map((c) => (c.exportValue ?? c.value)(r))));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${exportName}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const from = shown.length ? at * pageSize + 1 : 0;
  const to = Math.min(shown.length, (at + 1) * pageSize);

  return (
    <div>
      {(searchText || filters || exportName) && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {searchText && (
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} aria-label={`Search ${label.toLowerCase()}`} placeholder="Search" className={cn(fieldClass, "h-10 py-0 pl-10")} />
            </div>
          )}
          {filters}
          {exportName && <Button variant="outline" size="sm" icon={Download} className="ml-auto" onClick={download} disabled={!shown.length}>Export CSV</Button>}
        </div>
      )}

      {/* The wrapper scrolls sideways on a narrow screen, and is a keyboard stop so it can be scrolled without a mouse. */}
      <div role="region" aria-label={label} tabIndex={0} className="overflow-x-auto rounded-input border border-line outline-none focus-visible:ring-2 focus-visible:ring-sage-500">
        <table className="w-full min-w-max border-collapse text-left">
          <caption className="sr-only">{label}. Use the column headings to sort.</caption>
          <thead className="bg-sunken">
            <tr>
              {cols.map((c) => {
                const on = sort?.key === c.key;
                return (
                  <th key={c.key} scope="col" aria-sort={on ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"} className={cn("whitespace-nowrap px-4 py-2.5 text-[13px] font-medium text-muted", c.align === "right" && "text-right")}>
                    <button type="button" onClick={() => toggle(c)} className={cn("inline-flex items-center gap-1.5 rounded-md py-0.5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500", on && "text-ink", c.align === "right" && "flex-row-reverse")}>
                      {c.header}
                      {on ? (sort!.dir === "asc" ? <ArrowUp size={13} aria-hidden /> : <ArrowDown size={13} aria-hidden />) : <ChevronsUpDown size={13} aria-hidden className="opacity-50" />}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {slice.length ? slice.map((r) => (
              <tr key={rowKey(r)} className="border-t border-line align-top">
                {cols.map((c) => <td key={c.key} className={cn("tabular px-4 py-3 text-sm text-ink", c.align === "right" && "text-right")}>{c.render ? c.render(r) : (c.value(r) ?? <span className="text-muted">n/a</span>)}</td>)}
              </tr>
            )) : (
              <tr><td colSpan={cols.length} className="px-4 py-10 text-center text-sm text-muted">{empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p aria-live="polite" className="tabular">{shown.length ? `${from} to ${to} of ${shown.length.toLocaleString("en")}` : "No rows"}{shown.length !== rows.length && ` (filtered from ${rows.length.toLocaleString("en")})`}</p>
        {pages > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" icon={ChevronLeft} disabled={at === 0} onClick={() => setPage(at - 1)} aria-label="Previous page" />
            <span className="tabular px-2">Page {at + 1} of {pages}</span>
            <Button variant="ghost" size="sm" icon={ChevronRight} disabled={at >= pages - 1} onClick={() => setPage(at + 1)} aria-label="Next page" />
          </div>
        )}
      </div>
    </div>
  );
}
