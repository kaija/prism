"use client";

import type { Aggregation, AggregationFunction } from "@/types/api";

export interface AggregationSelectorProps {
  value: Aggregation;
  onChange: (value: Aggregation) => void;
}

const AGGREGATION_FUNCTIONS: { value: AggregationFunction; label: string }[] = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum" },
  { value: "count_unique", label: "Count Unique" },
  { value: "last_event", label: "Last Event" },
  { value: "first_event", label: "First Event" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
  { value: "mean", label: "Mean" },
  { value: "average", label: "Average" },
  { value: "tops", label: "Tops" },
];

const FUNCTIONS_REQUIRING_ATTRIBUTE: AggregationFunction[] = [
  "sum",
  "count_unique",
  "min",
  "max",
  "mean",
  "average",
  "tops",
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
  row: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  } as React.CSSProperties,
  select: {
    padding: "6px 10px",
    borderRadius: 7.2,
    border: "1px solid #eff0f6",
    fontSize: "0.875rem",
    fontFamily: "'Roboto', sans-serif",
    background: "#fff",
  } as React.CSSProperties,
  textInput: {
    flex: 1,
    padding: "6px 10px",
    borderRadius: 7.2,
    border: "1px solid #eff0f6",
    fontSize: "0.875rem",
    fontFamily: "'Roboto', sans-serif",
  } as React.CSSProperties,
};

export function AggregationSelector({
  value,
  onChange,
}: AggregationSelectorProps) {
  const needsAttribute = FUNCTIONS_REQUIRING_ATTRIBUTE.includes(value.function);

  return (
    <div style={styles.container}>
      <span style={styles.label}>Aggregation</span>
      <div style={styles.row}>
        <select
          value={value.function}
          onChange={(e) =>
            onChange({
              function: e.target.value as AggregationFunction,
              attribute: FUNCTIONS_REQUIRING_ATTRIBUTE.includes(
                e.target.value as AggregationFunction
              )
                ? value.attribute
                : undefined,
            })
          }
          style={styles.select}
          aria-label="Aggregation function"
        >
          {AGGREGATION_FUNCTIONS.map((fn) => (
            <option key={fn.value} value={fn.value}>
              {fn.label}
            </option>
          ))}
        </select>
        {needsAttribute && (
          <input
            type="text"
            value={value.attribute || ""}
            onChange={(e) =>
              onChange({
                ...value,
                attribute: e.target.value || undefined,
              })
            }
            placeholder="Attribute name"
            style={styles.textInput}
            aria-label="Aggregation attribute"
          />
        )}
      </div>
    </div>
  );
}
