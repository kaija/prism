"use client";

import { useState } from "react";
import type { TrendTableColumn, TrendTableRow } from "@/types/api";

// ─── Exported pagination helper (testable) ───────────────────

export interface PageSlice<T> {
  items: T[];
  page: number;
  totalPages: number;
}

/**
 * Return the slice of `data` for the given 1-based `page` and `pageSize`.
 * Clamps page to valid range [1, totalPages].
 */
export function getPageSlice<T>(data: T[], page: number, pageSize: number): PageSlice<T> {
  if (data.length === 0) {
    return { items: [], page: 1, totalPages: 0 };
  }
  const size = Math.max(1, pageSize);
  const totalPages = Math.ceil(data.length / size);
  const clamped = Math.max(1, Math.min(page, totalPages));
  const start = (clamped - 1) * size;
  const end = Math.min(start + size, data.length);
  return { items: data.slice(start, end), page: clamped, totalPages };
}

// ─── Props ───────────────────────────────────────────────────

export interface TrendDataTableProps {
  data: TrendTableRow[];
  columns: TrendTableColumn[];
  pageSize?: number;
}

// ─── Styles (matches existing inline-style pattern) ──────────

const styles = {
  container: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: "0.875rem",
  } as React.CSSProperties,
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    borderRadius: 7.2,
    overflow: "hidden",
  } as React.CSSProperties,
  th: {
    textAlign: "left" as const,
    padding: "10px 12px",
    borderBottom: "2px solid #eff0f6",
    fontWeight: 700,
    color: "#3c4858",
    fontSize: "0.8rem",
  } as React.CSSProperties,
  td: {
    padding: "8px 12px",
    borderBottom: "1px solid #eff0f6",
    color: "#3c4858",
    fontSize: "0.8rem",
    maxWidth: 200,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,
  pagination: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    fontSize: "0.8rem",
    color: "#8e99a4",
  } as React.CSSProperties,
  pageButton: (disabled: boolean) =>
    ({
      padding: "6px 14px",
      borderRadius: 7.2,
      border: "1px solid #eff0f6",
      background: disabled ? "#f5f5f5" : "#fff",
      color: disabled ? "#ccc" : "#4a77f0",
      cursor: disabled ? "not-allowed" : "pointer",
      fontSize: "0.8rem",
      fontFamily: "'Roboto', sans-serif",
    }) as React.CSSProperties,
  empty: {
    padding: 32,
    textAlign: "center" as const,
    color: "#8e99a4",
  } as React.CSSProperties,
};

// ─── Component ───────────────────────────────────────────────

export function TrendDataTable({ data, columns, pageSize = 10 }: TrendDataTableProps) {
  const [page, setPage] = useState(1);

  if (data.length === 0) {
    return <div style={styles.empty}>No data</div>;
  }

  const { items, page: currentPage, totalPages } = getPageSlice(data, page, pageSize);

  return (
    <div style={styles.container}>
      <table style={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={styles.th}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((row, idx) => (
            <tr key={`${row.dimensionValue}-${idx}`}>
              {columns.map((col, colIdx) => (
                <td key={col.key} style={styles.td}>
                  {colIdx === 0 ? row.dimensionValue : (row.values[col.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={styles.pagination}>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              style={styles.pageButton(currentPage <= 1)}
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              style={styles.pageButton(currentPage >= totalPages)}
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
