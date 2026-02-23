"use client";

import { useState } from "react";
import type { Timeframe } from "@/types/api";

export interface TimeframePickerProps {
  value: Timeframe;
  onChange: (value: Timeframe) => void;
}

const RELATIVE_PRESETS: { label: string; value: string }[] = [
  { label: "Last 7 days", value: "last_7_days" },
  { label: "Last 14 days", value: "last_14_days" },
  { label: "Last 30 days", value: "last_30_days" },
  { label: "Last 90 days", value: "last_90_days" },
  { label: "This month", value: "this_month" },
  { label: "Last month", value: "last_month" },
];

const styles = {
  container: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: "0.875rem",
  } as React.CSSProperties,
  label: {
    display: "block",
    fontWeight: 600,
    marginBottom: 8,
    color: "#3c4858",
  } as React.CSSProperties,
  radioGroup: {
    display: "flex",
    gap: 12,
    marginBottom: 10,
  } as React.CSSProperties,
  radioLabel: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    cursor: "pointer",
  } as React.CSSProperties,
  select: {
    width: "100%",
    padding: "6px 10px",
    borderRadius: 7.2,
    border: "1px solid #eff0f6",
    fontSize: "0.875rem",
    fontFamily: "'Roboto', sans-serif",
    background: "#fff",
  } as React.CSSProperties,
  dateRow: {
    display: "flex",
    gap: 8,
    marginTop: 8,
  } as React.CSSProperties,
  dateInput: {
    flex: 1,
    padding: "6px 10px",
    borderRadius: 7.2,
    border: "1px solid #eff0f6",
    fontSize: "0.875rem",
    fontFamily: "'Roboto', sans-serif",
  } as React.CSSProperties,
};

function epochToDateString(epoch?: number): string {
  if (!epoch) return "";
  const d = new Date(epoch);
  return d.toISOString().slice(0, 10);
}

function dateStringToEpoch(dateStr: string): number | undefined {
  if (!dateStr) return undefined;
  return new Date(dateStr).getTime();
}

export function TimeframePicker({ value, onChange }: TimeframePickerProps) {
  const [mode, setMode] = useState<"relative" | "absolute">(value.type);

  const handleModeChange = (newMode: "relative" | "absolute") => {
    setMode(newMode);
    if (newMode === "relative") {
      onChange({ type: "relative", relative: "last_7_days" });
    } else {
      onChange({ type: "absolute", start: undefined, end: undefined });
    }
  };

  return (
    <div style={styles.container}>
      <span style={styles.label}>Timeframe</span>

      <div style={styles.radioGroup}>
        <label style={styles.radioLabel}>
          <input
            type="radio"
            name="timeframe-mode"
            checked={mode === "relative"}
            onChange={() => handleModeChange("relative")}
          />
          Relative
        </label>
        <label style={styles.radioLabel}>
          <input
            type="radio"
            name="timeframe-mode"
            checked={mode === "absolute"}
            onChange={() => handleModeChange("absolute")}
          />
          Absolute
        </label>
      </div>

      {mode === "relative" ? (
        <select
          value={value.relative || "last_7_days"}
          onChange={(e) =>
            onChange({ type: "relative", relative: e.target.value })
          }
          style={styles.select}
          aria-label="Relative timeframe preset"
        >
          {RELATIVE_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      ) : (
        <div style={styles.dateRow}>
          <input
            type="date"
            value={epochToDateString(value.start)}
            onChange={(e) =>
              onChange({
                ...value,
                type: "absolute",
                start: dateStringToEpoch(e.target.value),
              })
            }
            style={styles.dateInput}
            aria-label="Start date"
          />
          <input
            type="date"
            value={epochToDateString(value.end)}
            onChange={(e) =>
              onChange({
                ...value,
                type: "absolute",
                end: dateStringToEpoch(e.target.value),
              })
            }
            style={styles.dateInput}
            aria-label="End date"
          />
        </div>
      )}
    </div>
  );
}
