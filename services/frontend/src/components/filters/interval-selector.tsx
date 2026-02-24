"use client";

import type { IntervalUnit } from "@/types/api";

export interface IntervalSelectorProps {
  value: IntervalUnit;
  onChange: (interval: IntervalUnit) => void;
}

const options: { value: IntervalUnit; label: string }[] = [
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const styles = {
  container: {
    fontFamily: "var(--font-family)",
    fontSize: "var(--font-base)",
  } as React.CSSProperties,
  label: {
    display: "block",
    fontWeight: 600,
    marginBottom: 8,
    color: "var(--text-default)",
  } as React.CSSProperties,
  select: {
    padding: "8px 16px",
    fontSize: "var(--font-base)",
    fontFamily: "var(--font-family)",
    color: "var(--text-default)",
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
  } as React.CSSProperties,
};

export function IntervalSelector({ value, onChange }: IntervalSelectorProps) {
  return (
    <div style={styles.container}>
      <label style={styles.label} htmlFor="interval-select">
        Interval
      </label>
      <select
        id="interval-select"
        value={value}
        onChange={(e) => onChange(e.target.value as IntervalUnit)}
        style={styles.select}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
