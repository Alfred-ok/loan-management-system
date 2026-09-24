import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { EmptyState, cx } from "./index";

/**
 * Lightweight table with sorting and pagination.
 * columns: [{ key, header, render?(row), align?, sortValue?(row), sortable?, className? }]
 */
export default function DataTable({ columns, rows, pageSize = 10, emptyTitle, emptyMessage, footer, rowKey = "id", onRowClick, compact }) {
    const [page, setPage] = useState(0);
    const [sort, setSort] = useState(null);

    useEffect(() => setPage(0), [rows.length]);

    const sorted = useMemo(() => {
        if (!sort) return rows;
        const col = columns.find((c) => c.key === sort.key);
        const get = col?.sortValue || ((r) => r[sort.key]);
        return [...rows].sort((a, b) => {
            const va = get(a);
            const vb = get(b);
            if (va === vb) return 0;
            const res = va > vb ? 1 : -1;
            return sort.dir === "asc" ? res : -res;
        });
    }, [rows, sort, columns]);

    const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const visible = sorted.slice(page * pageSize, page * pageSize + pageSize);
    const align = (a) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");
    const pad = compact ? "px-3 py-2" : "px-4 py-3";

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-800 text-white">
                        <tr>
                            {columns.map((c) => (
                                <th key={c.key} className={cx(pad, "font-semibold text-xs uppercase tracking-wide whitespace-nowrap", align(c.align))}>
                                    {c.sortable === false ? (
                                        c.header
                                    ) : (
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1 uppercase cursor-pointer hover:text-indigo-200"
                                            onClick={() =>
                                                setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: "asc" }))
                                            }
                                        >
                                            {c.header}
                                            <ArrowUpDown className={cx("w-3 h-3", sort?.key === c.key ? "opacity-100" : "opacity-40")} />
                                        </button>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {visible.map((row, i) => (
                            <tr
                                key={row[rowKey] ?? i}
                                className={cx("hover:bg-indigo-50/50", onRowClick && "cursor-pointer")}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                            >
                                {columns.map((c) => (
                                    <td key={c.key} className={cx(pad, align(c.align), c.className)}>
                                        {c.render ? c.render(row) : row[c.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                    {footer && visible.length > 0 && <tfoot className="bg-gray-50 font-semibold border-t border-gray-200">{footer}</tfoot>}
                </table>
            </div>
            {rows.length === 0 && <EmptyState title={emptyTitle} message={emptyMessage} />}
            {rows.length > pageSize && (
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 text-sm text-gray-600">
                    <span>
                        {page * pageSize + 1}–{Math.min(rows.length, (page + 1) * pageSize)} of {rows.length}
                    </span>
                    <div className="flex items-center gap-1">
                        <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 cursor-pointer" aria-label="Previous page">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-2 tabular-nums">
                            {page + 1} / {pages}
                        </span>
                        <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 cursor-pointer" aria-label="Next page">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
