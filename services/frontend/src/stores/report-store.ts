import { create } from "zustand";
import type {
  Timeframe,
  EventSelection,
  ConditionGroup,
  Aggregation,
  ReportRequest,
  JobStatus,
} from "@/types/api";

export type ReportType = "trend" | "attribution" | "cohort";

export interface ReportState {
  // Filter state
  reportType: ReportType;
  timeframe: Timeframe;
  eventSelection: EventSelection;
  conditions: ConditionGroup;
  aggregation: Aggregation;

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
  setJobId: (jobId: string | null) => void;
  setJobStatus: (status: JobStatus | null) => void;
  setIsSubmitting: (submitting: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  buildRequest: () => ReportRequest;
}

const initialFilterState = {
  reportType: "trend" as ReportType,
  timeframe: { type: "relative" as const, relative: "last_7_days" },
  eventSelection: { type: "all" as const } as EventSelection,
  conditions: { logic: "and" as const, conditions: [] } as ConditionGroup,
  aggregation: { function: "count" as const } as Aggregation,
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
  setJobId: (jobId) => set({ jobId }),
  setJobStatus: (jobStatus) => set({ jobStatus }),
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
  setError: (error) => set({ error }),

  reset: () => set(initialFilterState),

  buildRequest: () => {
    const state = get();
    const request: ReportRequest = {
      report_type: state.reportType,
      timeframe: state.timeframe,
      event_selection: state.eventSelection,
      aggregation: state.aggregation,
    };
    if (state.conditions.conditions.length > 0) {
      request.filters = state.conditions;
    }
    return request;
  },
}));
