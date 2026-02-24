// Feature: trend-report-filter, Property 6: Absolute timeframe date validation
// Feature: trend-report-filter, Property 12: Timeframe display formatting

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { validateTimeframe, formatTimeframeDisplay } from "./timeframe-picker";
import type { Timeframe } from "@/types/api";

/**
 * **Validates: Requirements 1.1, 1.5**
 *
 * Property-based tests for timeframe validation and display formatting.
 */

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates a positive epoch-ms timestamp (reasonable range: 2000-01-01 to 2099-12-31). */
const epochMsArb = fc.integer({
  min: 946684800000,  // 2000-01-01
  max: 4102444800000, // 2099-12-31
});

/** Known relative presets that have display labels. */
const KNOWN_PRESETS = [
  "last_7_days",
  "last_14_days",
  "last_30_days",
  "last_90_days",
  "this_month",
  "last_month",
] as const;

const knownPresetArb = fc.constantFrom(...KNOWN_PRESETS);

/** Generates an absolute timeframe where start > end (invalid). */
const invalidAbsoluteTimeframeArb = epochMsArb.chain((end) =>
  fc.record({
    type: fc.constant("absolute" as const),
    start: fc.integer({ min: end + 1, max: end + 365 * 24 * 60 * 60 * 1000 }),
    end: fc.constant(end),
  }),
);

/** Generates a valid absolute timeframe where start <= end. */
const validAbsoluteTimeframeArb = epochMsArb.chain((start) =>
  fc.record({
    type: fc.constant("absolute" as const),
    start: fc.constant(start),
    end: fc.integer({ min: start, max: start + 365 * 24 * 60 * 60 * 1000 }),
  }),
);

/** Generates a valid relative timeframe with a known preset. */
const validRelativeTimeframeArb = knownPresetArb.map(
  (preset): Timeframe => ({
    type: "relative",
    relative: preset,
  }),
);

/** Generates any valid timeframe (relative with known preset, or absolute with start <= end). */
const validTimeframeArb: fc.Arbitrary<Timeframe> = fc.oneof(
  validRelativeTimeframeArb,
  validAbsoluteTimeframeArb,
);

// ---------------------------------------------------------------------------
// Property 6: Absolute timeframe date validation
// ---------------------------------------------------------------------------

describe("Property 6: Absolute timeframe date validation", () => {
  it(
    "for any pair of dates where start > end, validateTimeframe returns a non-null error string",
    () => {
      fc.assert(
        fc.property(invalidAbsoluteTimeframeArb, (timeframe) => {
          const result = validateTimeframe(timeframe);
          expect(result).not.toBeNull();
          expect(typeof result).toBe("string");
          expect(result!.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 },
      );
    },
  );
});

// ---------------------------------------------------------------------------
// Property 12: Timeframe display formatting
// ---------------------------------------------------------------------------

describe("Property 12: Timeframe display formatting", () => {
  it(
    "for any valid timeframe, formatTimeframeDisplay returns a non-empty string",
    () => {
      fc.assert(
        fc.property(validTimeframeArb, (timeframe) => {
          const result = formatTimeframeDisplay(timeframe);
          expect(typeof result).toBe("string");
          expect(result.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 },
      );
    },
  );

  it(
    "for any valid absolute timeframe, the display string contains '→'",
    () => {
      fc.assert(
        fc.property(validAbsoluteTimeframeArb, (timeframe) => {
          const result = formatTimeframeDisplay(timeframe);
          expect(result).toContain("→");
        }),
        { numRuns: 100 },
      );
    },
  );
});
