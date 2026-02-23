"use client";

import type { CohortResult } from "@/types/api";

const PRIMARY = "#4a77f0";

/** Map a retention percentage (0–100) to a background color intensity. */
function cellColor(value: number | null): string {
  if (value === null) return "transparent";
  const alpha = Math.min(value / 100, 1);
  // Convert PRIMARY hex to rgb for alpha blending
  return `rgba(74, 119, 240, ${(alpha * 0.55 + 0.05).toFixed(2)})`;
}

function cellTextColor(value: number | null): string {
  if (value === null) return "#8e99a4";
  return value > 50 ? "#fff" : "#3c4858";
}

const styles = {
  wrapper: {
    overflowX: "auto" as const,
    fontFamily: "'Roboto', sans-serif",
    fontSize: 13,
  },
  table: {
    borderCollapse: "collapse" as const,
    width: "100%",
    minWidth: 480,
  },
  th: {
    padding: "8px 12px",
    textAlign: "center" as const,
    fontWeight: 600,
    fontSize: 12,
    color: "#8e99a4",
    borderBottom: "1px solid #eff0f6",
    whiteSpace: "nowrap" as const,
  },
  labelTh: {
    padding: "8px 12px",
    textAlign: "left" as const,
    fontWeight: 600,
    fontSize: 12,
    color: "#8e99a4",
    borderBottom: "1px solid #eff0f6",
  },
  labelTd: {
    padding: "8px 12px",
    fontWeight: 500,
    color: "#3c4858",
    whiteSpace: "nowrap" as const,
    borderBottom: "1px solid #eff0f6",
  },
  sizeTd: {
    padding: "8px 12px",
    textAlign: "center" as const,
    color: "#3c4858",
    borderBottom: "1px solid #eff0f6",
  },
};

export function CohortTable({ data }: { data: CohortResult }) {
  if (!data.cohorts.length) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#8e99a4", fontFamily: "'Roboto', sans-serif" }}>
        No cohort data available.
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.labelTh}>Cohort</th>
            <th style={styles.th}>Users</th>
            {data.periods.map((p) => (
              <th key={p} style={styles.th}>{p}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.cohorts.map((row) => (
            <tr key={row.label}>
              <td style={styles.labelTd}>{row.label}</td>
              <td style={styles.sizeTd}>{row.size.toLocaleString()}</td>
              {row.values.map((v, i) => (
                <td
                  key={i}
                  style={{
                    padding: "8px 12px",
                    textAlign: "center",
                    backgroundColor: cellColor(v),
                    color: cellTextColor(v),
                    borderBottom: "1px solid #eff0f6",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {v !== null ? `${v.toFixed(1)}%` : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
