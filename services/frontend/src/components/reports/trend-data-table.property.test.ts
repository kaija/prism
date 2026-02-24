// Feature: trend-report-filter, Property 10 & 11: Data table pagination

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { getPageSlice } from "./trend-data-table";
import type { TrendTableRow } from "@/types/api";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates a non-empty string for dimension values. */
const dimensionValueArb: fc.Arbitrary<string> = fc.stringMatching(/^[A-Za-z0-9 _-]{1,20}$/);

/** Generates a single TrendTableRow with a random dimensionValue and 0–4 value entries. */
const trendTableRowArb: fc.Arbitrary<TrendTableRow> = fc
  .tuple(
    dimensionValueArb,
    fc.dictionary(
      fc.stringMatching(/^[a-z0-9_-]{1,10}$/),
      fc.oneof(fc.integer({ min: 0, max: 100_000 }), fc.stringMatching(/^[A-Za-z0-9]{0,10}$/)),
      { minKeys: 0, maxKeys: 4 },
    ),
  )
  .map(([dim, vals]) => ({ dimensionValue: dim, values: vals }));

/** Generates a non-empty array of TrendTableRows (1–50 rows). */
const trendTableDataArb: fc.Arbitrary<TrendTableRow[]> = fc.array(trendTableRowArb, {
  minLength: 1,
  maxLength: 50,
});

/** Generates a valid page size (1–20). */
const pageSizeArb: fc.Arbitrary<number> = fc.integer({ min: 1, max: 20 });

// ---------------------------------------------------------------------------
// Property 10: Table pagination displays correct slice
// ---------------------------------------------------------------------------

/**
 * **Validates: Requirements 9.1, 9.2, 9.4, 9.5**
 *
 * For any data set of N rows (N >= 1) and for any valid page number P
 * (given a fixed page size S), getPageSlice should return rows from index
 * (P-1)*S to min(P*S, N)-1. When N > S, totalPages should be > 1.
 */
describe("Feature: trend-report-filter, Property 10: Table pagination displays correct slice", () => {
  it("returns the correct slice of rows for any data, page, and pageSize", () => {
    fc.assert(
      fc.property(
        trendTableDataArb,
        pageSizeArb,
        fc.integer({ min: 1, max: 100 }),
        (data, pageSize, rawPage) => {
          const N = data.length;
          const totalPages = Math.ceil(N / pageSize);
          // Clamp page to valid range like the function does
          const page = Math.max(1, Math.min(rawPage, totalPages));

          const result = getPageSlice(data, rawPage, pageSize);

          // Page is clamped to valid range
          expect(result.page).toBe(page);
          expect(result.totalPages).toBe(totalPages);

          // Correct slice indices
          const expectedStart = (page - 1) * pageSize;
          const expectedEnd = Math.min(page * pageSize, N);
          const expectedItems = data.slice(expectedStart, expectedEnd);

          expect(result.items).toEqual(expectedItems);
          expect(result.items.length).toBeLessThanOrEqual(pageSize);

          // When N > S, pagination should be present (totalPages > 1)
          if (N > pageSize) {
            expect(result.totalPages).toBeGreaterThan(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: Table first column is compare-by dimension
// ---------------------------------------------------------------------------

/**
 * **Validates: Requirements 9.1, 9.2, 9.4, 9.5**
 *
 * For any TrendTableRow array, the first column value for each row should
 * be the dimensionValue field. For any row in the page slice, the
 * dimensionValue is preserved.
 */
describe("Feature: trend-report-filter, Property 11: Table first column is compare-by dimension", () => {
  it("every row in the page slice preserves its dimensionValue from the source data", () => {
    fc.assert(
      fc.property(
        trendTableDataArb,
        pageSizeArb,
        fc.integer({ min: 1, max: 100 }),
        (data, pageSize, rawPage) => {
          const result = getPageSlice(data, rawPage, pageSize);

          const N = data.length;
          const totalPages = Math.ceil(N / pageSize);
          const page = Math.max(1, Math.min(rawPage, totalPages));
          const expectedStart = (page - 1) * pageSize;

          // Each item in the slice should have the same dimensionValue
          // as the corresponding item in the original data array
          for (let i = 0; i < result.items.length; i++) {
            const row = result.items[i];
            const sourceRow = data[expectedStart + i];

            // The dimensionValue (first column) is preserved
            expect(row.dimensionValue).toBe(sourceRow.dimensionValue);

            // dimensionValue is a string (the compare-by dimension value)
            expect(typeof row.dimensionValue).toBe("string");
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
