"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/admin/search-input";

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Provide to make the column sortable (returns the value to sort by). */
  sort?: (row: T) => string | number;
  className?: string; // applied to each body cell
  headClassName?: string;
};

/**
 * Shared admin data table — same UX as the Clients page:
 * sortable headers, in-table search, pagination.
 * Every admin table should use this so they all look + behave the same.
 */
export function DataTable<T>({
  rows,
  columns,
  getRowId,
  search,
  searchPlaceholder,
  onRowClick,
  rowClassName,
  pageSize = 10,
  defaultSortKey,
  defaultSortDir = "desc",
  emptyText,
  minWidth,
}: {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  search?: (row: T) => string;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  csv?: { filename: string; row: (row: T) => Record<string, string | number> };
  pageSize?: number;
  defaultSortKey?: string;
  defaultSortDir?: "asc" | "desc";
  emptyText?: string;
  minWidth?: string; // e.g. "min-w-[820px]"
}) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);

  const filtered = useMemo(() => {
    let list = rows;
    const s = q.trim().toLowerCase();
    if (s && search) list = list.filter((r) => search(r).toLowerCase().includes(s));
    const col = columns.find((c) => c.key === sortKey);
    if (col?.sort) {
      const dir = sortDir === "asc" ? 1 : -1;
      const get = col.sort;
      list = [...list].sort((a, b) => {
        const av = get(a);
        const bv = get(b);
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }
    return list;
  }, [rows, q, search, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, filtered.length);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }
  const colSpan = columns.length;

  return (
    <div className="space-y-4">
      {search && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full sm:w-80"
          />
        </div>
      )}

      <Card className="gap-0 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table className={minWidth}>
            <TableHeader>
              <TableRow className="text-xs uppercase tracking-wide text-ink-soft">
                {columns.map((c) => (
                  <TableHead key={c.key} className={c.headClassName}>
                    {c.sort ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSort(c.key)}
                        className="-ms-2 h-auto gap-1 px-2 py-0 font-semibold uppercase tracking-wide text-ink-soft hover:bg-transparent hover:text-ink"
                      >
                        {c.header}
                        {sortKey === c.key ? (
                          sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </Button>
                    ) : (
                      c.header
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="py-16 text-center text-ink-soft">
                    {emptyText ?? "—"}
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((r) => {
                  const id = getRowId(r);
                  return (
                    <TableRow
                      key={id}
                      onClick={onRowClick ? () => onRowClick(r) : undefined}
                      className={cn(onRowClick && "cursor-pointer", "hover:bg-muted/50", rowClassName?.(r))}
                    >
                      {columns.map((c) => (
                        <TableCell key={c.key} className={c.className}>
                          {c.cell(r)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
          <span className="font-semibold text-ink-soft">{t("admin.crm.range", { from, to, total: filtered.length })}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="text-ink-soft">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">prev</span>
            </Button>
            <span className="px-2 font-semibold text-ink">{safePage} / {totalPages}</span>
            <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="text-ink-soft">
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">next</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
