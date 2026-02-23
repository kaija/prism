import { describe, it, expect, beforeEach } from "vitest";
import { useReportStore } from "./report-store";
import type { Timeframe, EventSelection, ConditionGroup, Aggregation } from "@/types/api";

describe("useReportStore", () => {
  beforeEach(() => {
    useReportStore.getState().reset();
  });

  it("has correct initial state", () => {
    const state = useReportStore.getState();
    expect(state.reportType).toBe("trend");
    expect(state.timeframe).toEqual({ type: "relative", relative: "last_7_days" });
    expect(state.eventSelection).toEqual({ type: "all" });
    expect(state.conditions).toEqual({ logic: "and", conditions: [] });
    expect(state.aggregation).toEqual({ function: "count" });
    expect(state.jobId).toBeNull();
    expect(state.jobStatus).toBeNull();
    expect(state.isSubmitting).toBe(false);
    expect(state.error).toBeNull();
  });

  it("setReportType updates report type", () => {
    useReportStore.getState().setReportType("cohort");
    expect(useReportStore.getState().reportType).toBe("cohort");
  });

  it("setTimeframe updates timeframe", () => {
    const tf: Timeframe = { type: "absolute", start: 1000, end: 2000 };
    useReportStore.getState().setTimeframe(tf);
    expect(useReportStore.getState().timeframe).toEqual(tf);
  });

  it("setEventSelection updates event selection", () => {
    const es: EventSelection = { type: "specific", event_names: ["click"] };
    useReportStore.getState().setEventSelection(es);
    expect(useReportStore.getState().eventSelection).toEqual(es);
  });

  it("setConditions updates conditions", () => {
    const cg: ConditionGroup = {
      logic: "or",
      conditions: [{ attribute: "country", operator: "is", value: "US" }],
    };
    useReportStore.getState().setConditions(cg);
    expect(useReportStore.getState().conditions).toEqual(cg);
  });

  it("setAggregation updates aggregation", () => {
    const agg: Aggregation = { function: "sum", attribute: "revenue" };
    useReportStore.getState().setAggregation(agg);
    expect(useReportStore.getState().aggregation).toEqual(agg);
  });

  it("buildRequest produces correct ReportRequest without filters when conditions empty", () => {
    const req = useReportStore.getState().buildRequest();
    expect(req.report_type).toBe("trend");
    expect(req.filters).toBeUndefined();
  });

  it("buildRequest includes filters when conditions are present", () => {
    useReportStore.getState().setConditions({
      logic: "and",
      conditions: [{ attribute: "os", operator: "is", value: "iOS" }],
    });
    const req = useReportStore.getState().buildRequest();
    expect(req.filters).toBeDefined();
    expect(req.filters!.conditions).toHaveLength(1);
  });

  it("reset restores initial state", () => {
    useReportStore.getState().setReportType("attribution");
    useReportStore.getState().setIsSubmitting(true);
    useReportStore.getState().setError("some error");
    useReportStore.getState().reset();

    const state = useReportStore.getState();
    expect(state.reportType).toBe("trend");
    expect(state.isSubmitting).toBe(false);
    expect(state.error).toBeNull();
  });

  it("setJobId and setJobStatus update job state", () => {
    useReportStore.getState().setJobId("job-123");
    expect(useReportStore.getState().jobId).toBe("job-123");

    useReportStore.getState().setJobStatus({
      job_id: "job-123",
      status: "running",
      created_at: "2024-01-01T00:00:00Z",
    });
    expect(useReportStore.getState().jobStatus?.status).toBe("running");
  });
});
