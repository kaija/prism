import { create } from "zustand";
import type {
  Timeframe,
  EventSelection,
  ConditionGroup,
  Aggregation,
  ReportRequest,
  JobStatus,
  IntervalUnit,
  MeasureMetric,
} from "@/types/api";

export type ReportType = "trend" | "attribution" | "cohort";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ReportState {
  // Filter state
  reportType: ReportType;
  timeframe: Timeframe;
  eventSelection: EventSelection;
  conditions: ConditionGroup;
  aggregation: Aggregation;

  // New filter state
  segments: string[];
  interval: IntervalUnit;
  compareBy: string[];
  measureBy: MeasureMetric[];
  comparisonEnabled: boolean;
  comparisonTimeframe: Timeframe | null;

  // Job state
  jobId: string | null;
  jobStatus: JobStatus | null;
  isSubmitting: boolean;
  error: string | null;

  // Actions
  setReportType: (type: ReportType) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  setEventSelection: (selection: EventSelection) => void;
  setConditions: (conditions: ConditionGroup) => void;
  setAggregation: (aggregation: Aggregation) => void;
  setSegments: (segments: string[]) => void;
  setInterval: (interval: IntervalUnit) => void;
  setCompareBy: (dimensions: string[]) => void;
  setMeasureBy: (metrics: MeasureMetric[]) => void;
  setComparisonEnabled: (enabled: boolean) => void;
  setComparisonTimeframe: (timeframe: Timeframe | null) => void;
  setJobId: (jobId: string | null) => void;
  setJobStatus: (status: JobStatus | null) => void;
  setIsSubmitting: (submitting: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  buildRequest: () => ReportRequest;
  restoreFromRequest: (request: ReportRequest) => void;
  validateRequest: () => ValidationError[];
}

const VALID_INTERVALS: IntervalUnit[] = ["hour", "day", "week", "month"];

const initialFilterState = {
  reportType: "trend" as ReportType,
  timeframe: { type: "relative" as const, relative: "last_7_days" },
  eventSelection: { type: "all" as const } as EventSelection,
  conditions: { logic: "and" as const, conditions: [] } as ConditionGroup,
  aggregation: { function: "count" as const } as Aggregation,
  segments: [] as string[],
  interval: "day" as IntervalUnit,
  compareBy: [] as string[],
  measureBy: [{ key: "people", label: "People" }] as MeasureMetric[],
  comparisonEnabled: false,
  comparisonTimeframe: null as Timeframe | null,
  jobId: null as string | null,
  jobStatus: null as JobStatus | null,
  isSubmitting: false,
  error: null as string | null,
};

export const useReportStore = create<ReportState>((set, get) => ({
  ...initialFilterState,

  setReportType: (reportType) => set({ reportType }),
  setTimeframe: (timeframe) => set({ timeframe }),
  setEventSelection: (eventSelection) => set({ eventSelection }),
  setConditions: (conditions) => set({ conditions }),
  setAggregation: (aggregation) => set({ aggregation }),
  setSegments: (segments) => set({ segments }),
  setInterval: (interval) => set({ interval }),
  setCompareBy: (compareBy) => set({ compareBy }),
  setMeasureBy: (measureBy) => set({ measureBy }),
  setComparisonEnabled: (comparisonEnabled) => set({ comparisonEnabled }),
  setComparisonTimeframe: (comparisonTimeframe) => set({ comparisonTimeframe }),
  setJobId: (jobId) => set({ jobId }),
  setJobStatus: (jobStatus) => set({ jobStatus }),
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
  setError: (error) => set({ error }),

  reset: () => set(initialFilterState),

  buildRequest: () => {
    const state = get();
    const errors = validateState(state);
    if (errors.length > 0) {
      throw new ValidationRequestError(errors);
    }

    const request: ReportRequest = {
      report_type: state.reportType,
      timeframe: state.timeframe,
      event_selection: state.eventSelection,
      aggregation: state.aggregation,
      interval: state.interval,
      measure_by: state.measureBy.map((m) => m.key),
    };

    if (state.conditions.conditions.length > 0) {
      request.filters = state.conditions;
    }
    if (state.segments.length > 0) {
      request.segments = state.segments;
    }
    if (state.compareBy.length > 0) {
      request.compare_by = state.compareBy;
    }
    if (state.comparisonEnabled && state.comparisonTimeframe) {
      request.comparison_timeframe = state.comparisonTimeframe;
    }

    return request;
  },

  restoreFromRequest: (request) => {
    set({
      reportType: request.report_type as ReportType,
      timeframe: request.timeframe,
      eventSelection: request.event_selection,
      aggregation: request.aggregation,
      conditions: request.filters ?? { logic: "and", conditions: [] },
      segments: request.segments ?? [],
      interval: request.interval ?? "day",
      compareBy: request.compare_by ?? [],
      measureBy: request.measure_by
        ? request.measure_by.map((key) => ({
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
          }))
        : [{ key: "people", label: "People" }],
      comparisonEnabled: !!request.comparison_timeframe,
      comparisonTimeframe: request.comparison_timeframe ?? null,
    });
  },

  validateRequest: () => {
    return validateState(get());
  },
}));

// ─── Exported helpers for testability ────────────────────────

function validateState(state: Pick<ReportState, "measureBy" | "interval" | "timeframe">): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!state.measureBy || state.measureBy.length === 0) {
    errors.push({ field: "measureBy", message: "At least one metric must be selected" });
  }

  if (!VALID_INTERVALS.includes(state.interval)) {
    errors.push({ field: "interval", message: `Invalid interval: ${state.interval}. Must be one of: ${VALID_INTERVALS.join(", ")}` });
  }

  if (state.timeframe.type === "absolute") {
    if (state.timeframe.start != null && state.timeframe.end != null && state.timeframe.start > state.timeframe.end) {
      errors.push({ field: "timeframe", message: "Start date must be before end date" });
    }
  }

  return errors;
}

export class ValidationRequestError extends Error {
  public readonly errors: ValidationError[];
  constructor(errors: ValidationError[]) {
    super(errors.map((e) => `${e.field}: ${e.message}`).join("; "));
    this.name = "ValidationRequestError";
    this.errors = errors;
  }
}

/** Exported for testing — validates store state without side effects. */
export { validateState };
