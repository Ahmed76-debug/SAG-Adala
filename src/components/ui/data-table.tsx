import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, ArrowUpDown, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { EmptyState, Input, IconButton, Badge } from "./primitives";
import type { LucideIcon } from "lucide-react";

/* =============================================================
   جدول بيانات ذكي — فرز + بحث + ترقيم + عرض بطاقات على الجوال
   ============================================================= */

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
  /** كيف يُعرض العمود على الشاشات الصغيرة */
  mobile?: "primary" | "secondary" | "row" | "hidden";
  align?: "start" | "center" | "end";
  width?: string;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFn?: (row: T, q: string) => boolean;
  pageSize?: number;
  toolbar?: React.ReactNode;
  dense?: boolean;
  className?: string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectChange?: (ids: string[]) => void;
  rowActions?: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  empty,
  emptyIcon,
  emptyTitle = "لا توجد بيانات",
  emptyDescription,
  searchable = true,
  searchPlaceholder = "بحث…",
  searchFn,
  pageSize = 12,
  toolbar,
  dense = false,
  className,
  selectable = false,
  selectedIds = [],
  onSelectChange,
  rowActions,
}: DataTableProps<T>) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let out = rows;
    if (q.trim() && searchFn) out = out.filter((r) => searchFn(r, q.trim().toLowerCase()));
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        out = [...out].sort((a, b) => {
          const va = col.sortValue!(a);
          const vb = col.sortValue!(b);
          if (typeof va === "number" && typeof vb === "number")
            return sort.dir === "asc" ? va - vb : vb - va;
          const sa = String(va).localeCompare(String(vb), "ar");
          return sort.dir === "asc" ? sa : -sa;
        });
      }
    }
    return out;
  }, [rows, q, sort, columns, searchFn]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const view = filtered.slice(current * pageSize, current * pageSize + pageSize);

  const toggleSort = (key: string) => {
    setPage(0);
    setSort((s) =>
      s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  };

  const allSelected = view.length > 0 && view.every((r) => selectedIds.includes(rowKey(r)));
  const toggleAll = () => {
    if (!onSelectChange) return;
    if (allSelected) onSelectChange(selectedIds.filter((id) => !view.some((r) => rowKey(r) === id)));
    else onSelectChange([...new Set([...selectedIds, ...view.map(rowKey)])]);
  };

  const pad = dense ? "px-3 py-2" : "px-4 py-3";

  return (
    <div className={cn("flex flex-col", className)}>
      {(searchable || toolbar) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          {searchable && (
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                className="ps-9 pe-8"
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-faint hover:text-ink"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          )}
          <div className="ms-auto flex flex-wrap items-center gap-2">{toolbar}</div>
        </div>
      )}

      {view.length === 0 ? (
        empty ?? (
          <EmptyState
            icon={emptyIcon}
            title={q ? "لا توجد نتائج مطابقة" : emptyTitle}
            description={q ? `لم نعثر على نتائج لـ "${q}"` : emptyDescription}
          />
        )
      ) : (
        <>
          {/* جدول — الشاشات المتوسطة فأكبر */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line bg-surface-2/60">
                  {selectable && (
                    <th className={cn(pad, "w-10 text-start")}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="size-4 accent-[var(--accent)]"
                      />
                    </th>
                  )}
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className={cn(
                        pad,
                        "text-start font-semibold text-muted",
                        c.align === "center" && "text-center",
                        c.align === "end" && "text-end",
                        c.headerClassName,
                      )}
                      style={c.width ? { width: c.width } : undefined}
                    >
                      {c.sortValue ? (
                        <button
                          onClick={() => toggleSort(c.key)}
                          className="inline-flex items-center gap-1 transition-colors hover:text-ink"
                        >
                          {c.header}
                          {sort?.key === c.key ? (
                            sort.dir === "asc" ? (
                              <ChevronLeft className="size-3 rotate-90" />
                            ) : (
                              <ChevronRight className="size-3 -rotate-90" />
                            )
                          ) : (
                            <ArrowUpDown className="size-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  ))}
                  {rowActions && <th className={cn(pad, "w-12")} />}
                </tr>
              </thead>
              <tbody>
                {view.map((row) => {
                  const id = rowKey(row);
                  return (
                    <tr
                      key={id}
                      onClick={() => onRowClick?.(row)}
                      className={cn(
                        "border-b border-line-soft transition-colors last:border-0",
                        onRowClick && "cursor-pointer hover:bg-surface-2",
                        selectedIds.includes(id) && "bg-accent-soft/40",
                      )}
                    >
                      {selectable && (
                        <td className={pad} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(id)}
                            onChange={() =>
                              onSelectChange?.(
                                selectedIds.includes(id)
                                  ? selectedIds.filter((x) => x !== id)
                                  : [...selectedIds, id],
                              )
                            }
                            className="size-4 accent-[var(--accent)]"
                          />
                        </td>
                      )}
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className={cn(
                            pad,
                            "align-middle text-ink-soft",
                            c.align === "center" && "text-center",
                            c.align === "end" && "text-end",
                            c.className,
                          )}
                        >
                          {c.render(row)}
                        </td>
                      ))}
                      {rowActions && (
                        <td className={pad} onClick={(e) => e.stopPropagation()}>
                          {rowActions(row)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* بطاقات — الجوال */}
          <div className="divide-y divide-line-soft md:hidden">
            {view.map((row) => {
              const primary = columns.filter((c) => c.mobile === "primary");
              const secondary = columns.filter((c) => c.mobile === "secondary");
              const rowCells = columns.filter((c) => c.mobile === "row");
              return (
                <div
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "p-4 transition-colors",
                    onRowClick && "cursor-pointer active:bg-surface-2",
                  )}
                >
                  <div className="space-y-1.5">
                    {primary.map((c) => (
                      <div key={c.key} className={cn("font-semibold text-ink", c.className)}>
                        {c.render(row)}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {secondary.map((c) => (
                      <div key={c.key} className={cn("text-[12px] text-muted", c.className)}>
                        {c.render(row)}
                      </div>
                    ))}
                  </div>
                  {rowCells.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-line-soft pt-2">
                      {rowCells.map((c) => (
                        <div key={c.key} className={cn("text-[12px] text-muted", c.className)}>
                          {c.render(row)}
                        </div>
                      ))}
                    </div>
                  )}
                  {rowActions && (
                    <div className="mt-2.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {rowActions(row)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-[12.5px] text-muted">
              <span>
                عرض <span className="num">{current * pageSize + 1}</span>–
                <span className="num">{Math.min(filtered.length, (current + 1) * pageSize)}</span> من{" "}
                <span className="num">{filtered.length}</span>
              </span>
              <div className="flex items-center gap-1">
                <IconButton
                  icon={ChevronRight}
                  label="السابق"
                  size="sm"
                  variant="subtle"
                  disabled={current === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                />
                <Badge tone="muted">
                  <span className="num">
                    {current + 1} / {pages}
                  </span>
                </Badge>
                <IconButton
                  icon={ChevronLeft}
                  label="التالي"
                  size="sm"
                  variant="subtle"
                  disabled={current >= pages - 1}
                  onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
