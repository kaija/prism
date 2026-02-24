import { describe, it, expect, beforeEach } from "vitest";
import { useReportStore, ValidationRequestError } from "./report-store";
import type { Timeframe, EventSelection, ConditionGroup, Aggregation, ReportRequest } from "@/types/api";

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
    expect(state.segments).toEqual([]);
    expect(state.interval).toBe("day");
    expect(state.compareBy).toEqual([]);
    expect(state.measureBy).toEqual([{ key: "people", label: "People" }]);
    expect(state.comparisonEnabled).toBe(false);
    expect(state.comparisonTimeframe).toBeNull();
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

  // ─── New filter state setters ──────────────────────────────

  it("setSegments updates segments", () => {
    useReportStore.getState().setSegments(["seg-1", "seg-2"]);
    expect(useReportStore.getState().segments).toEqual(["seg-1", "seg-2"]);
  });

  it("setInterval updates interval", () => {
    useReportStore.getState().setInterval("week");
    expect(useReportStore.getState().interval).toBe("week");
  });

  it("setCompareBy updates compareBy", () => {
    useReportStore.getState().setCompareBy(["country", "browser"]);
    expect(useReportStore.getState().compareBy).toEqual(["country", "browser"]);
  });

  it("setMeasureBy updates measureBy", () => {
    useReportStore.getState().setMeasureBy([
      { key: "actions", label: "Actions" },
      { key: "people", label: "People" },
    ]);
    expect(useReportStore.getState().measureBy).toEqual([
      { key: "actions", label: "Actions" },
      { key: "people", label: "People" },
    ]);
  });

  it("setComparisonEnabled updates comparisonEnabled", () => {
    useReportStore.getState().setComparisonEnabled(true);
    expect(useReportStore.getState().comparisonEnabled).toBe(true);
  });

  it("setComparisonTimeframe updates comparisonTimeframe", () => {
    const tf: Timeframe = { type: "relative", relative: "previous_period" };
    useReportStore.getState().setComparisonTimeframe(tf);
    expect(useReportStore.getState().comparisonTimeframe).toEqual(tf);
  });

  // ─── buildRequest serialization ────────────────────────────

  it("buildRequest includes interval and measure_by", () => {
    const req = useReportStore.getState().buildRequest();
    expect(req.interval).toBe("day");
    expect(req.measure_by).toEqual(["people"]);
  });

  it("buildRequest omits segments when empty", () => {
    const req = useReportStore.getState().buildRequest();
    expect(req.segments).toBeUndefined();
  });

  it("buildRequest includes segments when set", () => {
    useReportStore.getState().setSegments(["seg-a"]);
    const req = useReportStore.getState().buildRequest();
    expect(req.segments).toEqual(["seg-a"]);
  });

  it("buildRequest omits compare_by when empty", () => {
    const req = useReportStore.getState().buildRequest();
    expect(req.compare_by).toBeUndefined();
  });

  it("buildRequest includes compare_by when set", () => {
    useReportStore.getState().setCompareBy(["country"]);
    const req = useReportStore.getState().buildRequest();
    expect(req.compare_by).toEqual(["country"]);
  });

  it("buildRequest omits comparison_timeframe when comparison disabled", () => {
    useReportStore.getState().setComparisonTimeframe({ type: "relative", relative: "previous_period" });
    // comparisonEnabled is still false
    const req = useReportStore.getState().buildRequest();
    expect(req.comparison_timeframe).toBeUndefined();
  });

  it("buildRequest includes comparison_timeframe when comparison enabled", () => {
    const tf: Timeframe = { type: "relative", relative: "previous_period" };
    useReportStore.getState().setComparisonEnabled(true);
    useReportStore.getState().setComparisonTimeframe(tf);
    const req = useReportStore.getState().buildRequest();
    expect(req.comparison_timeframe).toEqual(tf);
  });

  // ─── validateRequest ───────────────────────────────────────

  it("validateRequest returns no errors for valid default state", () => {
    const errors = useReportStore.getState().validateRequest();
    expect(errors).toEqual([]);
  });

  it("validateRequest returns error when measureBy is empty", () => {
    useReportStore.getState().setMeasureBy([]);
    const errors = useReportStore.getState().validateRequest();
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "measureBy" }),
    );
  });

  it("buildRequest throws ValidationRequestError when measureBy is empty", () => {
    useReportStore.getState().setMeasureBy([]);
    expect(() => useReportStore.getState().buildRequest()).toThrow(ValidationRequestError);
  });

  it("validateRequest returns error for invalid absolute timeframe", () => {
    useReportStore.getState().setTimeframe({ type: "absolute", start: 2000, end: 1000 });
    const errors = useReportStore.getState().validateRequest();
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "timeframe" }),
    );
  });

  // ─── restoreFromRequest ────────────────────────────────────

  it("restoreFromRequest sets all fields from a ReportRequest", () => {
    const request: ReportRequest = {
      report_type: "trend",
      timeframe: { type: "absolute", start: 1000, end: 2000 },
      event_selection: { type: "specific", event_names: ["click"] },
      aggregation: { function: "sum", attribute: "revenue" },
      filters: { logic: "or", conditions: [{ attribute: "os", operator: "is", value: "iOS" }] },
      segments: ["seg-1"],
      interval: "week",
      compare_by: ["country"],
      measure_by: ["actions", "people"],
      comparison_timeframe: { type: "relative", relative: "previous_period" },
    };

    useReportStore.getState().restoreFromRequest(request);
    const state = useReportStore.getState();

    expect(state.reportType).toBe("trend");
    expect(state.timeframe).toEqual({ type: "absolute", start: 1000, end: 2000 });
    expect(state.eventSelection).toEqual({ type: "specific", event_names: ["click"] });
    expect(state.aggregation).toEqual({ function: "sum", attribute: "revenue" });
    expect(state.conditions).toEqual({ logic: "or", conditions: [{ attribute: "os", operator: "is", value: "iOS" }] });
    expect(state.segments).toEqual(["seg-1"]);
    expect(state.interval).toBe("week");
    expect(state.compareBy).toEqual(["country"]);
    expect(state.measureBy).toEqual([
      { key: "actions", label: "Actions" },
      { key: "people", label: "People" },
    ]);
    expect(state.comparisonEnabled).toBe(true);
    expect(state.comparisonTimeframe).toEqual({ type: "relative", relative: "previous_period" });
  });

  it("restoreFromRequest uses defaults for omitted optional fields", () => {
    const request: ReportRequest = {
      report_type: "attribution",
      timeframe: { type: "relative", relative: "last_30_days" },
      event_selection: { type: "all" },
      aggregation: { function: "count" },
    };

    useReportStore.getState().restoreFromRequest(request);
    const state = useReportStore.getState();

    expect(state.segments).toEqual([]);
    expect(state.interval).toBe("day");
    expect(state.compareBy).toEqual([]);
    expect(state.measureBy).toEqual([{ key: "people", label: "People" }]);
    expect(state.comparisonEnabled).toBe(false);
    expect(state.comparisonTimeframe).toBeNull();
  });

  it("reset restores new filter fields to defaults", () => {
    useReportStore.getState().setSegments(["seg-1"]);
    useReportStore.getState().setInterval("month");
    useReportStore.getState().setCompareBy(["browser"]);
    useReportStore.getState().setMeasureBy([{ key: "actions", label: "Actions" }]);
    useReportStore.getState().setComparisonEnabled(true);
    useReportStore.getState().setComparisonTimeframe({ type: "relative", relative: "previous_period" });

    useReportStore.getState().reset();
    const state = useReportStore.getState();

    expect(state.segments).toEqual([]);
    expect(state.interval).toBe("day");
    expect(state.compareBy).toEqual([]);
    expect(state.measureBy).toEqual([{ key: "people", label: "People" }]);
    expect(state.comparisonEnabled).toBe(false);
    expect(state.comparisonTimeframe).toBeNull();
  });
});
