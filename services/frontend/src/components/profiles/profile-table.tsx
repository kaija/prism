"use client";

import { useState, useEffect, useCallback } from "react";
import { BackendAPIClient } from "@/lib/api-client";
import type { Profile, ConditionGroup } from "@/types/api";

export interface ProfileTableProps {
  projectId: string;
  filters?: ConditionGroup;
  onSelectionChange?: (profileIds: string[]) => void;
}

const DEFAULT_COLUMNS = ["profile_id"];
const PAGE_SIZE = 10;

const styles = {
  container: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: "0.875rem",
  } as React.CSSProperties,
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  } as React.CSSProperties,
  columnToggle: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap" as const,
    marginBottom: 12,
  } as React.CSSProperties,
  chip: (active: boolean) =>
    ({
      padding: "4px 10px",
      borderRadius: 7.2,
      border: `1px solid ${active ? "#4a77f0" : "#eff0f6"}`,
      background: active ? "#eef2ff" : "#fff",
      color: active ? "#4a77f0" : "#3c4858",
      cursor: "pointer",
      fontSize: "0.8rem",
      fontFamily: "'Roboto', sans-serif",
    }) as React.CSSProperties,
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
    fontWeight: 600,
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
  rowSelected: {
    background: "#eef2ff",
  } as React.CSSProperties,
  checkbox: {
    cursor: "pointer",
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
  loading: {
    padding: 32,
    textAlign: "center" as const,
    color: "#8e99a4",
  } as React.CSSProperties,
};

export function ProfileTable({ projectId, filters, onSelectionChange }: ProfileTableProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_COLUMNS);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const api = new BackendAPIClient();
      const result = await api.queryProfiles(projectId, {
        filters,
        columns: visibleColumns,
        page,
        page_size: PAGE_SIZE,
      });
      setProfiles(result.items);
      setTotal(result.total);

      // Discover attribute columns from results
      const attrKeys = new Set<string>();
      for (const p of result.items) {
        for (const key of Object.keys(p.attributes)) {
          attrKeys.add(key);
        }
      }
      setAvailableColumns((prev) => {
        const merged = new Set([...prev, ...attrKeys]);
        return [...merged].sort();
      });
    } catch {
      setProfiles([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, filters, visibleColumns, page]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    onSelectionChange?.([...selectedIds]);
  }, [selectedIds, onSelectionChange]);

  const toggleColumn = (col: string) => {
    setVisibleColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allOnPage = profiles.map((p) => p.profile_id);
    const allSelected = allOnPage.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of allOnPage) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  if (loading) {
    return <div style={styles.loading}>Loading profiles…</div>;
  }

  if (!profiles.length) {
    return <div style={styles.empty}>No profiles found.</div>;
  }

  const displayColumns = ["profile_id", ...visibleColumns.filter((c) => c !== "profile_id")];

  return (
    <div style={styles.container}>
      {/* Column selector */}
      {availableColumns.length > 0 && (
        <div style={styles.columnToggle}>
          {availableColumns.map((col) => (
            <button
              key={col}
              type="button"
              style={styles.chip(visibleColumns.includes(col))}
              onClick={() => toggleColumn(col)}
            >
              {col}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>
              <input
                type="checkbox"
                onChange={toggleSelectAll}
                checked={profiles.every((p) => selectedIds.has(p.profile_id))}
                style={styles.checkbox}
                aria-label="Select all profiles"
              />
            </th>
            {displayColumns.map((col) => (
              <th key={col} style={styles.th}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile) => (
            <tr
              key={profile.profile_id}
              style={selectedIds.has(profile.profile_id) ? styles.rowSelected : undefined}
            >
              <td style={styles.td}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(profile.profile_id)}
                  onChange={() => toggleSelect(profile.profile_id)}
                  style={styles.checkbox}
                  aria-label={`Select profile ${profile.profile_id}`}
                />
              </td>
              {displayColumns.map((col) => (
                <td key={col} style={styles.td}>
                  {col === "profile_id"
                    ? profile.profile_id
                    : String(profile.attributes[col] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div style={styles.pagination}>
        <span>
          Page {page} of {totalPages} ({total} total)
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            style={styles.pageButton(page <= 1)}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            style={styles.pageButton(page >= totalPages)}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
