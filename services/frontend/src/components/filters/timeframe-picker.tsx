"use client";

import { useState } from "react";
import type { Timeframe } from "@/types/api";

export interface TimeframePickerProps {
  value: Timeframe;
  onChange: (value: Timeframe) => void;
  comparisonEnabled?: boolean;
  comparisonTimeframe?: Timeframe | null;
  onComparisonChange?: (enabled: boolean, timeframe: Timeframe | null) => void;
}

const RELATIVE_PRESETS: { label: string; value: string }[] = [
  { label: "Last 7 days", value: "last_7_days" },
  { label: "Last 14 days", value: "last_14_days" },
  { label: "Last 30 days", value: "last_30_days" },
  { label: "Last 90 days", value: "last_90_days" },
  { label: "This month", value: "this_month" },
  { label: "Last month", value: "last_month" },
];

export const COMPARISON_PRESETS: { label: string; value: string }[] = [
  { label: "Previous period", value: "previous_period" },
  { label: "Same period last year", value: "same_period_last_year" },
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
  comparisonSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px solid #eff0f6",
  } as React.CSSProperties,
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    fontSize: "0.875rem",
    color: "#3c4858",
  } as React.CSSProperties,
  comparisonSelect: {
    width: "100%",
    padding: "6px 10px",
    borderRadius: 7.2,
    border: "1px solid #eff0f6",
    fontSize: "0.875rem",
    fontFamily: "'Roboto', sans-serif",
    background: "#fff",
    marginTop: 8,
  } as React.CSSProperties,
  errorMessage: {
    color: "#e53e3e",
    fontSize: "0.75rem",
    marginTop: 4,
  } as React.CSSProperties,
  displayText: {
    fontSize: "0.75rem",
    color: "#6b7280",
    marginBottom: 8,
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

/**
 * Validates a timeframe, returning an error string if start > end, or null if valid.
 */
export function validateTimeframe(timeframe: Timeframe): string | null {
  if (
    timeframe.type === "absolute" &&
    timeframe.start != null &&
    timeframe.end != null &&
    timeframe.start > timeframe.end
  ) {
    return "Start date must be before end date";
  }
  return null;
}

const RELATIVE_LABELS: Record<string, string> = {
  last_7_days: "7 days ago → Today",
  last_14_days: "14 days ago → Today",
  last_30_days: "30 days ago → Today",
  last_90_days: "90 days ago → Today",
  this_month: "Start of month → Today",
  last_month: "Last month",
};

/**
 * Returns a human-readable display string for a timeframe.
 */
export function formatTimeframeDisplay(timeframe: Timeframe): string {
  if (timeframe.type === "relative") {
    const preset = timeframe.relative ?? "";
    return RELATIVE_LABELS[preset] ?? preset;
  }

  const startStr = timeframe.start != null
    ? new Date(timeframe.start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "…";
  const endStr = timeframe.end != null
    ? new Date(timeframe.end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "…";
  return `${startStr} → ${endStr}`;
}

export function TimeframePicker({
  value,
  onChange,
  comparisonEnabled,
  comparisonTimeframe,
  onComparisonChange,
}: TimeframePickerProps) {
  const [mode, setMode] = useState<"relative" | "absolute">(value.type);

  const validationError = validateTimeframe(value);

  const handleModeChange = (newMode: "relative" | "absolute") => {
    setMode(newMode);
    if (newMode === "relative") {
      onChange({ type: "relative", relative: "last_7_days" });
    } else {
      onChange({ type: "absolute", start: undefined, end: undefined });
    }
  };

  const handleDateChange = (field: "start" | "end", dateStr: string) => {
    const epoch = dateStringToEpoch(dateStr);
    const next: Timeframe = { ...value, type: "absolute", [field]: epoch };
    const error = validateTimeframe(next);
    if (error) {
      // Still update the UI so the user sees the value, but the error will show
      onChange(next);
      return;
    }
    onChange(next);
  };

  const handleComparisonToggle = () => {
    if (!onComparisonChange) return;
    const newEnabled = !comparisonEnabled;
    if (newEnabled) {
      onComparisonChange(true, {
        type: "relative",
        relative: "previous_period",
      });
    } else {
      onComparisonChange(false, null);
    }
  };

  const handleComparisonPresetChange = (preset: string) => {
    if (!onComparisonChange) return;
    onComparisonChange(true, { type: "relative", relative: preset });
  };

  return (
    <div style={styles.container}>
      <span style={styles.label}>Timeframe</span>

      <div style={styles.displayText} data-testid="timeframe-display">
        {formatTimeframeDisplay(value)}
      </div>

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
        <>
          <div style={styles.dateRow}>
            <input
              type="date"
              value={epochToDateString(value.start)}
              onChange={(e) => handleDateChange("start", e.target.value)}
              style={styles.dateInput}
              aria-label="Start date"
            />
            <input
              type="date"
              value={epochToDateString(value.end)}
              onChange={(e) => handleDateChange("end", e.target.value)}
              style={styles.dateInput}
              aria-label="End date"
            />
          </div>
          {validationError && (
            <div style={styles.errorMessage} role="alert">
              {validationError}
            </div>
          )}
        </>
      )}

      {onComparisonChange && (
        <div style={styles.comparisonSection}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={!!comparisonEnabled}
              onChange={handleComparisonToggle}
            />
            Compare to previous timeframe
          </label>

          {comparisonEnabled && (
            <select
              value={comparisonTimeframe?.relative || "previous_period"}
              onChange={(e) => handleComparisonPresetChange(e.target.value)}
              style={styles.comparisonSelect}
              aria-label="Comparison timeframe preset"
            >
              {COMPARISON_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
