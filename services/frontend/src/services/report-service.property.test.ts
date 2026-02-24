// Feature: trend-report-filter, Property 13: Report persistence round-trip

import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
import { useReportStore } from "@/stores/report-store";
import type {
  IntervalUnit,
  MeasureMetric,
  Timeframe,
  EventSelection,
  Aggregation,
} from "@/types/api";

/**
 * **Validates: Requirements 10.1, 10.2, 10.3**
 *
 * For any valid filter configuration, saving the report (serializing to
 * `queryParams` JSON via JSON.stringify) and then loading it back
 * (deserializing via JSON.parse) should produce an equivalent filter
 * configuration when restored through the store.
 *
 * This simulates the full persistence round-trip:
 *   store state → buildRequest() → JSON.stringify (DB write) →
 *   JSON.parse (DB read) → restoreFromRequest() → store state
 */

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const intervalUnitArb: fc.Arbitrary<IntervalUnit> = fc.constantFrom(
  "hour" as const,
  "day" as const,
  "week" as const,
  "month" as const,
);

const metricKeyArb: fc.Arbitrary<string> = fc
  .array(fc.stringMatching(/^[a-z]{1,8}$/), { minLength: 1, maxLength: 3 })
  .map((parts) => parts.join("_"))
  .filter((k) => k.length >= 1 && k.length <= 30);

function labelFromKey(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
}

const measureMetricArb: fc.Arbitrary<MeasureMetric> = metricKeyArb.map((key) => ({
  key,
  label: labelFromKey(key),
}));

const measureByArb: fc.Arbitrary<MeasureMetric[]> = fc.array(measureMetricArb, {
  minLength: 1,
  maxLength: 5,
});

const segmentArb: fc.Arbitrary<string> = fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/);

const dimensionArb: fc.Arbitrary<string> = fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/);

const relativeTimeframeArb: fc.Arbitrary<Timeframe> = fc
  .constantFrom(
    "last_7_days",
    "last_14_days",
    "last_30_days",
    "last_90_days",
    "today",
    "yesterday",
  )
  .map((rel) => ({ type: "relative" as const, relative: rel }));

const absoluteTimeframeArb: fc.Arbitrary<Timeframe> = fc
  .tuple(
    fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }),
    fc.integer({ min: 0, max: 500_000_000_000 }),
  )
  .map(([start, offset]) => ({
    type: "absolute" as const,
    start,
    end: start + offset,
  }));

const timeframeArb: fc.Arbitrary<Timeframe> = fc.oneof(
  relativeTimeframeArb,
  absoluteTimeframeArb,
);

const eventSelectionArb: fc.Arbitrary<EventSelection> = fc.oneof(
  fc.constant({ type: "all" as const } as EventSelection),
  fc
    .array(fc.stringMatching(/^[a-zA-Z0-9_]{1,20}$/), { minLength: 1, maxLength: 5 })
    .map((names) => ({ type: "specific" as const, event_names: names }) as EventSelection),
);

const aggregationArb: fc.Arbitrary<Aggregation> = fc.constantFrom(
  { function: "count" as const },
  { function: "sum" as const, attribute: "amount" },
  { function: "count_unique" as const, attribute: "user_id" },
  { function: "average" as const, attribute: "duration" },
);

const comparisonArb: fc.Arbitrary<{
  comparisonEnabled: boolean;
  comparisonTimeframe: Timeframe | null;
}> = fc.oneof(
  fc.constant({ comparisonEnabled: false, comparisonTimeframe: null }),
  timeframeArb.map((tf) => ({ comparisonEnabled: true, comparisonTimeframe: tf })),
);

// ---------------------------------------------------------------------------
// Property 13: Report persistence round-trip
// ---------------------------------------------------------------------------

describe("Feature: trend-report-filter, Property 13: Report persistence round-trip", () => {
  beforeEach(() => {
    useReportStore.getState().reset();
  });

  it(
    "for any valid filter config, serializing to queryParams JSON and " +
      "deserializing back produces an equivalent filter configuration",
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

            // 1. Set the store to the generated filter state
            store.setTimeframe(timeframe);
            store.setEventSelection(eventSelection);
            store.setAggregation(aggregation);
            store.setSegments(segments);
            store.setInterval(interval);
            store.setCompareBy(compareBy);
            store.setMeasureBy(measureBy);
            store.setComparisonEnabled(comparison.comparisonEnabled);
            store.setComparisonTimeframe(comparison.comparisonTimeframe);

            // 2. Serialize to ReportRequest (what gets saved)
            const request = useReportStore.getState().buildRequest();

            // 3. Simulate DB persistence: JSON.stringify → queryParams column
            const json = JSON.stringify(request);

            // 4. Simulate DB load: JSON.parse ← queryParams column
            const parsed = JSON.parse(json);

            // 5. Reset store and restore from the parsed request
            store.reset();
            useReportStore.getState().restoreFromRequest(parsed);

            const restored = useReportStore.getState();

            // 6. Assert equivalence of all filter fields
            expect(restored.reportType).toEqual("trend");
            expect(restored.timeframe).toEqual(timeframe);
            expect(restored.eventSelection).toEqual(eventSelection);
            expect(restored.aggregation).toEqual(aggregation);
            expect(restored.segments).toEqual(segments);
            expect(restored.interval).toEqual(interval);
            expect(restored.compareBy).toEqual(compareBy);

            // measureBy: keys must match, labels are derived from keys
            expect(restored.measureBy.map((m) => m.key)).toEqual(
              measureBy.map((m) => m.key),
            );
            expect(restored.measureBy.map((m) => m.label)).toEqual(
              measureBy.map((m) => m.label),
            );

            // Comparison state
            expect(restored.comparisonEnabled).toEqual(comparison.comparisonEnabled);
            expect(restored.comparisonTimeframe).toEqual(comparison.comparisonTimeframe);

            // Conditions default to empty when not present in request
            expect(restored.conditions).toEqual({ logic: "and", conditions: [] });

            store.reset();
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "JSON round-trip preserves all ReportRequest fields without data loss",
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

            store.setTimeframe(timeframe);
            store.setEventSelection(eventSelection);
            store.setAggregation(aggregation);
            store.setSegments(segments);
            store.setInterval(interval);
            store.setCompareBy(compareBy);
            store.setMeasureBy(measureBy);
            store.setComparisonEnabled(comparison.comparisonEnabled);
            store.setComparisonTimeframe(comparison.comparisonTimeframe);

            const request = useReportStore.getState().buildRequest();

            // The ReportRequest itself should survive JSON round-trip exactly
            const roundTripped = JSON.parse(JSON.stringify(request));
            expect(roundTripped).toEqual(request);

            store.reset();
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
