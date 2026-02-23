// types/api.ts — Shared TypeScript types matching Backend API contracts

// ─── Report Types ────────────────────────────────────────────

export interface ReportRequest {
  report_type: "trend" | "attribution" | "cohort";
  timeframe: Timeframe;
  event_selection: EventSelection;
  filters?: ConditionGroup;
  aggregation: Aggregation;
  group_by?: string[];
}

export interface Timeframe {
  type: "absolute" | "relative";
  start?: number; // epoch ms
  end?: number; // epoch ms
  relative?: string; // e.g. "last_7_days"
}

export interface EventSelection {
  type: "all" | "specific";
  event_names?: string[];
}

// ─── Condition / Filter Types ────────────────────────────────

export interface ConditionFilter {
  attribute: string;
  operator: ConditionOperator;
  value?: string | number | boolean;
}

export type ConditionOperator =
  | "is"
  | "is_not"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "not_starts_with"
  | "ends_with"
  | "not_ends_with"
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "true"
  | "false";

export interface ConditionGroup {
  logic: "and" | "or";
  conditions: (ConditionFilter | ConditionGroup)[];
}


// ─── Aggregation Types ───────────────────────────────────────

export interface Aggregation {
  function: AggregationFunction;
  attribute?: string;
}

export type AggregationFunction =
  | "count"
  | "sum"
  | "count_unique"
  | "last_event"
  | "first_event"
  | "min"
  | "max"
  | "mean"
  | "average"
  | "tops";

// ─── Job Types ───────────────────────────────────────────────

export interface JobResponse {
  job_id: string;
  status: string;
}

export interface JobStatus {
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  result?: Record<string, unknown>;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

// ─── Profile Types ───────────────────────────────────────────

export interface ProfileSummaryRequest {
  filters?: ConditionGroup;
  columns: string[];
  page: number;
  page_size: number;
}

export interface Profile {
  profile_id: string;
  attributes: Record<string, unknown>;
}

export interface EventSummaryItem {
  event_name: string;
  count: number;
}

// ─── Timeline Types ──────────────────────────────────────────

export interface TimelineRequest {
  profile_ids: string[];
  timeframe: Timeframe;
  event_selection?: EventSelection;
  filters?: ConditionGroup;
  bucket_size: "hour" | "day" | "week" | "month";
}

export interface TimelineBucket {
  bucket: string; // ISO timestamp for the bucket start
  event_name: string;
  count: number;
}

// ─── Pagination ──────────────────────────────────────────────

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ─── Trigger Types ───────────────────────────────────────────

export interface TriggerSetting {
  rule_id: string;
  project_id: string;
  name: string;
  description?: string;
  event_name: string;
  conditions?: ConditionGroup;
  action: TriggerAction;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface TriggerAction {
  type: "webhook" | "email" | "slack";
  config: Record<string, string>;
}

export interface TriggerCreate {
  name: string;
  description?: string;
  event_name: string;
  conditions?: ConditionGroup;
  action: TriggerAction;
  enabled?: boolean;
}

export interface TriggerUpdate {
  name?: string;
  description?: string;
  event_name?: string;
  conditions?: ConditionGroup;
  action?: TriggerAction;
  enabled?: boolean;
}

// ─── Report Result Types ─────────────────────────────────────

export interface TrendDataPoint {
  timestamp: number; // epoch ms
  value: number;
  label?: string; // optional series label for multi-series
}

export interface TrendResult {
  series: TrendDataPoint[];
}

export interface AttributionItem {
  name: string;
  value: number;
}

export interface AttributionResult {
  items: AttributionItem[];
}

export interface CohortResult {
  periods: string[]; // column headers (e.g. "Week 0", "Week 1", …)
  cohorts: CohortRow[];
}

export interface CohortRow {
  label: string; // row label (e.g. "Jan 1 – Jan 7")
  size: number; // cohort size (users in period)
  values: (number | null)[]; // retention % per period, null if N/A
}

