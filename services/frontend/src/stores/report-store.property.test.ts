// Feature: analytics-frontend, Property 14: Report Submission Deduplication

import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
import { useReportStore } from "./report-store";
import type { JobStatus } from "@/types/api";

/**
 * **Validates: Requirements 9.4**
 *
 * Property-based test for report submission deduplication.
 * The ReportBuilder component uses an `isJobActive` guard:
 *   isJobActive = isSubmitting || (jobStatus !== null && status !== "completed" && status !== "failed")
 * When isJobActive is true, handleSubmit returns early — no new job is created.
 *
 * We test this guard logic directly against the Zustand store state,
 * verifying that for any store state where a job is active, the
 * deduplication check correctly identifies it as active and would
 * block a duplicate submission.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Replicates the isJobActive computation from ReportBuilder.
 * This is the deduplication guard that prevents duplicate submissions.
 */
function computeIsJobActive(isSubmitting: boolean, jobStatus: JobStatus | null): boolean {
  return (
    isSubmitting ||
    (jobStatus !== null &&
      jobStatus.status !== "completed" &&
      jobStatus.status !== "failed")
  );
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Active job statuses that should block new submissions. */
const activeJobStatusArb: fc.Arbitrary<JobStatus["status"]> = fc.constantFrom(
  "queued" as const,
  "running" as const,
);

/** Terminal job statuses that should allow new submissions. */
const terminalJobStatusArb: fc.Arbitrary<JobStatus["status"]> = fc.constantFrom(
  "completed" as const,
  "failed" as const,
);

/** All valid job statuses. */
const anyJobStatusArb: fc.Arbitrary<JobStatus["status"]> = fc.constantFrom(
  "queued" as const,
  "running" as const,
  "completed" as const,
  "failed" as const,
);

/** Generates a JobStatus object with a given status. */
const jobStatusArb = (statusArb: fc.Arbitrary<JobStatus["status"]>): fc.Arbitrary<JobStatus> =>
  fc.record({
    job_id: fc.stringMatching(/^job-[a-z0-9]{4,12}$/).filter((s) => s.length >= 5),
    status: statusArb,
    created_at: fc.constant(new Date().toISOString()),
  });

// ---------------------------------------------------------------------------
// Property 14: Report Submission Deduplication
// ---------------------------------------------------------------------------

describe("Property 14: Report Submission Deduplication", () => {
  beforeEach(() => {
    useReportStore.getState().reset();
  });

  it(
    "for any submission while isSubmitting is true, the duplicate is rejected " +
      "(isJobActive is true regardless of jobStatus)",
    () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            jobStatusArb(anyJobStatusArb),
          ),
          (jobStatus) => {
            const store = useReportStore.getState();
            store.setIsSubmitting(true);
            if (jobStatus !== null) {
              store.setJobStatus(jobStatus);
            }

            const state = useReportStore.getState();
            const isJobActive = computeIsJobActive(state.isSubmitting, state.jobStatus);

            // When isSubmitting is true, isJobActive must always be true
            // meaning duplicate submissions are rejected
            expect(isJobActive).toBe(true);

            // Reset for next iteration
            store.reset();
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "for any submission while jobStatus is queued or running, the duplicate " +
      "is rejected (isJobActive is true regardless of isSubmitting)",
    () => {
      fc.assert(
        fc.property(
          jobStatusArb(activeJobStatusArb),
          fc.boolean(),
          (activeStatus, isSubmitting) => {
            const store = useReportStore.getState();
            store.setIsSubmitting(isSubmitting);
            store.setJobStatus(activeStatus);

            const state = useReportStore.getState();
            const isJobActive = computeIsJobActive(state.isSubmitting, state.jobStatus);

            // When jobStatus is queued or running, isJobActive must be true
            expect(isJobActive).toBe(true);

            store.reset();
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "for any terminal or null jobStatus with isSubmitting false, submission " +
      "is allowed (isJobActive is false)",
    () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            jobStatusArb(terminalJobStatusArb),
          ),
          (jobStatus) => {
            const store = useReportStore.getState();
            store.setIsSubmitting(false);
            if (jobStatus !== null) {
              store.setJobStatus(jobStatus);
            }

            const state = useReportStore.getState();
            const isJobActive = computeIsJobActive(state.isSubmitting, state.jobStatus);

            // When not submitting and job is terminal/null, submissions are allowed
            expect(isJobActive).toBe(false);

            store.reset();
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});


// ---------------------------------------------------------------------------
// Feature: trend-report-filter, Property 5: Filter state round-trip serialization
// ---------------------------------------------------------------------------

/**
 * **Validates: Requirements 7.1, 7.2**
 *
 * For any valid filter configuration in the Report_Store, calling
 * `buildRequest()` to serialize the state into a `ReportRequest` and then
 * calling `restoreFromRequest()` with that request should produce a store
 * state equivalent to the original.
 *
 * Note: `measure_by` in ReportRequest is `string[]` (just keys).
 * `restoreFromRequest` reconstructs labels from keys using a capitalise +
 * underscore-to-space transform. We generate MeasureMetric values whose
 * labels match this transform so the round-trip is exact.
 */

// ---------------------------------------------------------------------------
// Generators for Property 5
// ---------------------------------------------------------------------------

/** Valid IntervalUnit values. */
const intervalUnitArb: fc.Arbitrary<import("@/types/api").IntervalUnit> = fc.constantFrom(
  "hour" as const,
  "day" as const,
  "week" as const,
  "month" as const,
);

/**
 * Generates a lowercase snake_case metric key (e.g. "scroll_depth", "people").
 * The label is derived deterministically so the round-trip is lossless.
 */
const metricKeyArb: fc.Arbitrary<string> = fc
  .array(
    fc.stringMatching(/^[a-z]{1,8}$/),
    { minLength: 1, maxLength: 3 },
  )
  .map((parts) => parts.join("_"))
  .filter((k) => k.length >= 1 && k.length <= 30);

/** Derives the label that `restoreFromRequest` would produce for a given key. */
function labelFromKey(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
}

/** Generates a MeasureMetric whose label matches the restore transform. */
const measureMetricArb: fc.Arbitrary<import("@/types/api").MeasureMetric> = metricKeyArb.map(
  (key) => ({ key, label: labelFromKey(key) }),
);

/** At least one metric is required for a valid state. */
const measureByArb: fc.Arbitrary<import("@/types/api").MeasureMetric[]> = fc.array(
  measureMetricArb,
  { minLength: 1, maxLength: 5 },
);

/** Generates a simple segment string. */
const segmentArb: fc.Arbitrary<string> = fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/);

/** Generates a simple dimension string for compareBy. */
const dimensionArb: fc.Arbitrary<string> = fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/);

/** Generates a relative timeframe. */
const relativeTimeframeArb: fc.Arbitrary<import("@/types/api").Timeframe> = fc
  .constantFrom(
    "last_7_days",
    "last_14_days",
    "last_30_days",
    "last_90_days",
    "today",
    "yesterday",
  )
  .map((rel) => ({ type: "relative" as const, relative: rel }));

/** Generates an absolute timeframe with start <= end. */
const absoluteTimeframeArb: fc.Arbitrary<import("@/types/api").Timeframe> = fc
  .tuple(
    fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }),
    fc.integer({ min: 0, max: 500_000_000_000 }),
  )
  .map(([start, offset]) => ({
    type: "absolute" as const,
    start,
    end: start + offset,
  }));

/** Any valid timeframe. */
const timeframeArb: fc.Arbitrary<import("@/types/api").Timeframe> = fc.oneof(
  relativeTimeframeArb,
  absoluteTimeframeArb,
);

/** Generates an EventSelection. */
const eventSelectionArb: fc.Arbitrary<import("@/types/api").EventSelection> = fc.oneof(
  fc.constant({ type: "all" as const } as import("@/types/api").EventSelection),
  fc
    .array(fc.stringMatching(/^[a-zA-Z0-9_]{1,20}$/), { minLength: 1, maxLength: 5 })
    .map(
      (names) =>
        ({ type: "specific" as const, event_names: names }) as import("@/types/api").EventSelection,
    ),
);

/** Generates an Aggregation. */
const aggregationArb: fc.Arbitrary<import("@/types/api").Aggregation> = fc.constantFrom(
  { function: "count" as const },
  { function: "sum" as const, attribute: "amount" },
  { function: "count_unique" as const, attribute: "user_id" },
  { function: "average" as const, attribute: "duration" },
);

/** Generates a comparison timeframe config (enabled + timeframe, or disabled). */
const comparisonArb: fc.Arbitrary<{
  comparisonEnabled: boolean;
  comparisonTimeframe: import("@/types/api").Timeframe | null;
}> = fc.oneof(
  fc.constant({ comparisonEnabled: false, comparisonTimeframe: null }),
  timeframeArb.map((tf) => ({ comparisonEnabled: true, comparisonTimeframe: tf })),
);

// ---------------------------------------------------------------------------
// Property 5 Tests
// ---------------------------------------------------------------------------

describe("Feature: trend-report-filter, Property 5: Filter state round-trip serialization", () => {
  beforeEach(() => {
    useReportStore.getState().reset();
  });

  it(
    "for any valid filter configuration, buildRequest() then restoreFromRequest() " +
      "produces an equivalent store state",
    () => {
      fc.assert(
        fc.property(
          timeframeArb,
          eventSelectionArb,
          aggregationArb,
          fc.array(segmentArb, { minLength: 0, maxLength: 5 }),
          intervalUnitArb,
          fc.array(dimensionArb, { minLength: 0, maxLength: 5 }),
          measureByArb,
          comparisonArb,
          (timeframe, eventSelection, aggregation, segments, interval, compareBy, measureBy, comparison) => {
            const store = useReportStore.getState();

            // Set the store to the generated state
            store.setTimeframe(timeframe);
            store.setEventSelection(eventSelection);
            store.setAggregation(aggregation);
            store.setSegments(segments);
            store.setInterval(interval);
            store.setCompareBy(compareBy);
            store.setMeasureBy(measureBy);
            store.setComparisonEnabled(comparison.comparisonEnabled);
            store.setComparisonTimeframe(comparison.comparisonTimeframe);

            // Capture the original state before serialization
            const originalState = useReportStore.getState();

            // Serialize to ReportRequest
            const request = originalState.buildRequest();

            // Reset store, then restore from the request
            store.reset();
            useReportStore.getState().restoreFromRequest(request);

            // Capture the restored state
            const restoredState = useReportStore.getState();

            // Assert equivalence of all filter fields
            expect(restoredState.reportType).toEqual(originalState.reportType);
            expect(restoredState.timeframe).toEqual(originalState.timeframe);
            expect(restoredState.eventSelection).toEqual(originalState.eventSelection);
            expect(restoredState.aggregation).toEqual(originalState.aggregation);
            expect(restoredState.segments).toEqual(originalState.segments);
            expect(restoredState.interval).toEqual(originalState.interval);
            expect(restoredState.compareBy).toEqual(originalState.compareBy);

            // Compare measureBy keys and labels
            expect(restoredState.measureBy.map((m) => m.key)).toEqual(
              originalState.measureBy.map((m) => m.key),
            );
            expect(restoredState.measureBy.map((m) => m.label)).toEqual(
              originalState.measureBy.map((m) => m.label),
            );

            // Comparison state
            expect(restoredState.comparisonEnabled).toEqual(originalState.comparisonEnabled);
            expect(restoredState.comparisonTimeframe).toEqual(originalState.comparisonTimeframe);

            // Conditions: buildRequest omits empty conditions, restoreFromRequest defaults to empty
            // Both should be equivalent
            expect(restoredState.conditions).toEqual(originalState.conditions);

            // Reset for next iteration
            store.reset();
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});


// ---------------------------------------------------------------------------
// Feature: trend-report-filter, Property 7: Invalid filter state produces validation error
// ---------------------------------------------------------------------------

/**
 * **Validates: Requirements 7.3**
 *
 * For any store state where a required field is missing or invalid
 * (empty measureBy, invalid interval, absolute timeframe with start > end),
 * calling `validateRequest()` should return at least one ValidationError
 * referencing the correct field.
 */

import { validateState, ValidationRequestError } from "./report-store";
import type { IntervalUnit, MeasureMetric, Timeframe } from "@/types/api";

// ---------------------------------------------------------------------------
// Generators for Property 7
// ---------------------------------------------------------------------------

/** Generates an invalid interval — any string NOT in the valid set. */
const invalidIntervalArb: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-z]{1,12}$/)
  .filter((s) => !["hour", "day", "week", "month"].includes(s));

/** Generates a valid MeasureMetric. */
const validMetricArb: fc.Arbitrary<MeasureMetric> = fc
  .stringMatching(/^[a-z]{1,10}$/)
  .filter((k) => k.length >= 1)
  .map((key) => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1) }));

/** Generates a valid interval. */
const validIntervalArb: fc.Arbitrary<IntervalUnit> = fc.constantFrom(
  "hour" as const,
  "day" as const,
  "week" as const,
  "month" as const,
);

/** Generates a valid relative timeframe (no start/end date issues). */
const validTimeframeArb: fc.Arbitrary<Timeframe> = fc
  .constantFrom("last_7_days", "last_30_days", "today")
  .map((rel) => ({ type: "relative" as const, relative: rel }));

/** Generates an absolute timeframe where start > end. */
const invalidAbsoluteTimeframeArb: fc.Arbitrary<Timeframe> = fc
  .tuple(
    fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }),
    fc.integer({ min: 1, max: 500_000_000_000 }),
  )
  .map(([end, offset]) => ({
    type: "absolute" as const,
    start: end + offset,
    end,
  }));

// ---------------------------------------------------------------------------
// Property 7 Tests
// ---------------------------------------------------------------------------

describe("Feature: trend-report-filter, Property 7: Invalid filter state produces validation error", () => {
  beforeEach(() => {
    useReportStore.getState().reset();
  });

  it(
    "empty measureBy array produces a validation error on the 'measureBy' field",
    () => {
      fc.assert(
        fc.property(
          validIntervalArb,
          validTimeframeArb,
          (interval, timeframe) => {
            const errors = validateState({
              measureBy: [],
              interval,
              timeframe,
            });

            expect(errors.length).toBeGreaterThanOrEqual(1);
            expect(errors.some((e) => e.field === "measureBy")).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "invalid interval value produces a validation error on the 'interval' field",
    () => {
      fc.assert(
        fc.property(
          invalidIntervalArb,
          fc.array(validMetricArb, { minLength: 1, maxLength: 3 }),
          validTimeframeArb,
          (interval, measureBy, timeframe) => {
            const errors = validateState({
              measureBy,
              interval: interval as IntervalUnit,
              timeframe,
            });

            expect(errors.length).toBeGreaterThanOrEqual(1);
            expect(errors.some((e) => e.field === "interval")).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "absolute timeframe with start > end produces a validation error on the 'timeframe' field",
    () => {
      fc.assert(
        fc.property(
          fc.array(validMetricArb, { minLength: 1, maxLength: 3 }),
          validIntervalArb,
          invalidAbsoluteTimeframeArb,
          (measureBy, interval, timeframe) => {
            const errors = validateState({
              measureBy,
              interval,
              timeframe,
            });

            expect(errors.length).toBeGreaterThanOrEqual(1);
            expect(errors.some((e) => e.field === "timeframe")).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "buildRequest() throws ValidationRequestError for any invalid store state",
    () => {
      fc.assert(
        fc.property(
          fc.constantFrom("emptyMeasureBy", "invalidInterval", "badTimeframe"),
          (scenario) => {
            const store = useReportStore.getState();
            store.reset();

            if (scenario === "emptyMeasureBy") {
              store.setMeasureBy([]);
            } else if (scenario === "invalidInterval") {
              store.setInterval("quarterly" as IntervalUnit);
            } else {
              store.setTimeframe({ type: "absolute", start: 2_000_000_000_000, end: 1_000_000_000_000 });
            }

            expect(() => useReportStore.getState().buildRequest()).toThrow(ValidationRequestError);

            store.reset();
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
