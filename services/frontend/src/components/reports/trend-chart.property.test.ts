// Feature: trend-report-filter, Property 8 & 9: Chart series generation

import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";

// Mock echarts before importing the module under test
vi.mock("echarts/core", () => {
  const graphic = {
    LinearGradient: class {
      constructor() {}
    },
  };
  return {
    use: vi.fn(),
    graphic,
    default: { use: vi.fn(), graphic },
  };
});

vi.mock("echarts/charts", () => ({ LineChart: {} }));
vi.mock("echarts/components", () => ({
  GridComponent: {},
  TooltipComponent: {},
  LegendComponent: {},
}));
vi.mock("echarts/renderers", () => ({ CanvasRenderer: {} }));

import { buildChartOption, isComparisonLabel } from "./trend-chart";
import type { ChartSeries } from "./trend-chart";
import type { TrendResult, TrendDataPoint } from "@/types/api";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates a valid timestamp in a reasonable range. */
const timestampArb: fc.Arbitrary<number> = fc.integer({
  min: 1_600_000_000_000,
  max: 2_000_000_000_000,
});

/** Generates a numeric value for a data point. */
const valueArb: fc.Arbitrary<number> = fc.integer({ min: 0, max: 10_000 });

/** Generates a non-comparison label (no "comparison" substring). */
const primaryLabelArb: fc.Arbitrary<string> = fc
  .stringMatching(/^[A-Z][a-z]{1,12}$/)
  .filter((s) => !s.toLowerCase().includes("comparison"));

/**
 * Generates a TrendResult with N distinct primary labels (N >= 1).
 * Each label gets 1–3 data points so the series is non-empty.
 */
const trendResultWithNLabelsArb: fc.Arbitrary<{
  data: TrendResult;
  labels: string[];
}> = fc
  .uniqueArray(primaryLabelArb, { minLength: 1, maxLength: 8 })
  .chain((labels) =>
    fc
      .tuple(
        ...labels.map((label) =>
          fc
            .array(fc.tuple(timestampArb, valueArb), { minLength: 1, maxLength: 3 })
            .map((points): TrendDataPoint[] =>
              points.map(([ts, v]) => ({ timestamp: ts, value: v, label })),
            ),
        ),
      )
      .map((seriesArrays) => ({
        data: { series: seriesArrays.flat() } as TrendResult,
        labels,
      })),
  );

/**
 * Generates a TrendResult that includes both primary and comparison labels.
 * At least one primary label and at least one comparison label.
 */
const trendResultWithComparisonArb: fc.Arbitrary<{
  data: TrendResult;
  primaryLabels: string[];
  comparisonLabels: string[];
}> = fc
  .uniqueArray(primaryLabelArb, { minLength: 1, maxLength: 4 })
  .chain((primaryLabels) => {
    const comparisonLabels = primaryLabels.map((l: string) => `${l} (comparison)`);
    const allLabels = [...primaryLabels, ...comparisonLabels];

    return fc
      .tuple(
        ...allLabels.map((label) =>
          fc
            .array(fc.tuple(timestampArb, valueArb), { minLength: 1, maxLength: 3 })
            .map((points): TrendDataPoint[] =>
              points.map(([ts, v]) => ({ timestamp: ts, value: v, label })),
            ),
        ),
      )
      .map((seriesArrays) => ({
        data: { series: seriesArrays.flat() } as TrendResult,
        primaryLabels,
        comparisonLabels,
      }));
  });

// ---------------------------------------------------------------------------
// Property 8: Chart series count matches data labels
// ---------------------------------------------------------------------------

/**
 * **Validates: Requirements 1.4, 5.5, 6.4, 8.1, 8.2, 8.4**
 *
 * For any TrendResult with N distinct series labels, the generated ECharts
 * option should contain exactly N series entries, and each series `name`
 * should match one of the labels from the data.
 */
describe("Feature: trend-report-filter, Property 8: Chart series count matches data labels", () => {
  it(
    "for any TrendResult with N distinct labels, buildChartOption produces exactly N series " +
      "and each series name matches one of the labels",
    () => {
      fc.assert(
        fc.property(trendResultWithNLabelsArb, ({ data, labels }) => {
          const option = buildChartOption(data);

          // Non-empty data should always produce an option
          expect(option).not.toBeNull();

          const series = option!.series as ChartSeries[];

          // Exactly N series for N distinct labels
          expect(series).toHaveLength(labels.length);

          // Each series name must be one of the input labels
          const seriesNames = series.map((s) => s.name);
          for (const name of seriesNames) {
            expect(labels).toContain(name);
          }

          // Every input label must appear as a series name
          for (const label of labels) {
            expect(seriesNames).toContain(label);
          }
        }),
        { numRuns: 100 },
      );
    },
  );
});

// ---------------------------------------------------------------------------
// Property 9: Comparison series visual distinction
// ---------------------------------------------------------------------------

/**
 * **Validates: Requirements 1.4, 5.5, 6.4, 8.1, 8.2, 8.4**
 *
 * For any TrendResult that includes comparison period data (labels containing
 * "comparison"), the comparison series should have a dashed lineStyle and
 * primary series should have a solid lineStyle.
 */
describe("Feature: trend-report-filter, Property 9: Comparison series visual distinction", () => {
  it(
    "comparison series have dashed lineStyle.type and primary series have solid lineStyle.type",
    () => {
      fc.assert(
        fc.property(trendResultWithComparisonArb, ({ data, primaryLabels, comparisonLabels }) => {
          const option = buildChartOption(data);
          expect(option).not.toBeNull();

          const series = option!.series as ChartSeries[];

          for (const s of series) {
            if (isComparisonLabel(s.name)) {
              expect(s.lineStyle.type).toBe("dashed");
            } else {
              expect(s.lineStyle.type).toBe("solid");
            }
          }

          // Verify that comparison labels are actually present in the series
          const seriesNames = new Set(series.map((s) => s.name));
          for (const cl of comparisonLabels) {
            expect(seriesNames.has(cl)).toBe(true);
          }
          for (const pl of primaryLabels) {
            expect(seriesNames.has(pl)).toBe(true);
          }
        }),
        { numRuns: 100 },
      );
    },
  );
});
