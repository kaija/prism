// lib/segment/operator-config.ts — Operator sets and UI labels per data_type

import type {
  ComparisonOp,
  StringOp,
  BooleanOp,
  DateOp,
  AggregationFn,
  EventComparisonOp,
} from "@/types/segment-rules";

// ─── Profile Operator Sets by data_type ──────────────────────

export type ProfileOperator = ComparisonOp | StringOp | BooleanOp | DateOp;

export const PROFILE_OPERATORS_BY_TYPE: Record<string, readonly ProfileOperator[]> = {
  string: ["EQ", "NEQ", "CONTAINS", "STARTS_WITH", "ENDS_WITH", "REGEX_MATCH"] as const,
  integer: ["EQ", "NEQ", "GT", "LT", "GTE", "LTE"] as const,
  float: ["EQ", "NEQ", "GT", "LT", "GTE", "LTE"] as const,
  boolean: ["IS_TRUE", "IS_FALSE"] as const,
  date: ["EQ", "GT", "LT", "GTE", "LTE", "IN_RECENT_DAYS"] as const,
};

/** Get the valid operator set for a given data_type */
export function getOperatorsForDataType(dataType: string): readonly ProfileOperator[] {
  return PROFILE_OPERATORS_BY_TYPE[dataType] ?? [];
}

// ─── Profile Operator UI Labels ──────────────────────────────

export const PROFILE_OPERATOR_LABELS: Record<ProfileOperator, string> = {
  EQ: "equals",
  NEQ: "not equals",
  GT: "greater than",
  LT: "less than",
  GTE: "at least",
  LTE: "at most",
  CONTAINS: "contains",
  STARTS_WITH: "starts with",
  ENDS_WITH: "ends with",
  REGEX_MATCH: "matches regex",
  IS_TRUE: "is true",
  IS_FALSE: "is false",
  IN_RECENT_DAYS: "in recent N days",
};

// ─── Event Comparison Operator Labels ────────────────────────

export const EVENT_COMPARISON_LABELS: Record<EventComparisonOp, string> = {
  EQ: "exactly",
  GT: "greater than",
  LT: "less than",
  GTE: "at least",
  LTE: "at most",
};

export const EVENT_COMPARISON_OPS: readonly EventComparisonOp[] = [
  "EQ", "GT", "LT", "GTE", "LTE",
] as const;

// ─── Aggregation Function Config ─────────────────────────────

export interface AggregationConfig {
  label: string;
  requiresProperty: boolean;
}

export const AGGREGATION_CONFIG: Record<AggregationFn, AggregationConfig> = {
  COUNT: { label: "Count Events", requiresProperty: false },
  SUM: { label: "Sum of", requiresProperty: true },
  AVG: { label: "Average of", requiresProperty: true },
  MIN: { label: "Min of", requiresProperty: true },
  MAX: { label: "Max of", requiresProperty: true },
  UNIQUE: { label: "Count Unique of", requiresProperty: true },
};

export const AGGREGATION_FNS: readonly AggregationFn[] = [
  "COUNT", "SUM", "AVG", "MIN", "MAX", "UNIQUE",
] as const;

// ─── Date-specific labels (override for date context) ────────

export const DATE_OPERATOR_LABELS: Partial<Record<DateOp, string>> = {
  EQ: "equals",
  GT: "after",
  LT: "before",
  GTE: "on or after",
  LTE: "on or before",
  IN_RECENT_DAYS: "in recent N days",
};
