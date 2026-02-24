// Feature: trend-report-filter, Property 1: Tag list addition displays pill
// Feature: trend-report-filter, Property 2: Tag list removal preserves others
// Feature: trend-report-filter, Property 3: Duplicate event rejection (idempotence)
// Feature: trend-report-filter, Property 4: Minimum one metric invariant

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { addTag, removeTag, enforceMinimum } from "./tag-list";

/**
 * **Validates: Requirements 2.2, 2.4, 3.2, 3.4, 3.5, 5.2, 5.3, 6.2, 6.3, 6.5**
 *
 * Property-based tests for tag list utility functions used by all
 * tag-based selectors (Segment, Event, CompareBy, MeasureBy).
 */

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates a reasonable tag string (non-empty, printable). */
const tagArb = fc.stringMatching(/^[a-zA-Z0-9_ -]{1,30}$/);

/** Generates a unique-element tag list of at least `minLength` items. */
const uniqueTagListArb = (minLength: number) =>
  fc.uniqueArray(tagArb, { minLength, maxLength: 20 });

// ---------------------------------------------------------------------------
// Property 1: Tag list addition displays pill
// ---------------------------------------------------------------------------

describe("Property 1: Tag list addition displays pill", () => {
  it(
    "for any valid string item, addTag produces a list that includes the item",
    () => {
      fc.assert(
        fc.property(uniqueTagListArb(0), tagArb, (list, item) => {
          const result = addTag(list, item);
          expect(result).toContain(item);
        }),
        { numRuns: 100 },
      );
    },
  );
});

// ---------------------------------------------------------------------------
// Property 2: Tag list removal preserves others
// ---------------------------------------------------------------------------

describe("Property 2: Tag list removal preserves others", () => {
  it(
    "for any list of length >= 2 and any item in the list, removeTag removes only that item and preserves order",
    () => {
      fc.assert(
        fc.property(
          uniqueTagListArb(2).chain((list) =>
            fc.record({
              list: fc.constant(list),
              index: fc.integer({ min: 0, max: list.length - 1 }),
            }),
          ),
          ({ list, index }) => {
            const target = list[index];
            const result = removeTag(list, target);

            // Target is not in the result
            expect(result).not.toContain(target);

            // All other items are preserved in order
            const expected = list.filter((t) => t !== target);
            expect(result).toEqual(expected);
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});

// ---------------------------------------------------------------------------
// Property 3: Duplicate event rejection (idempotence)
// ---------------------------------------------------------------------------

describe("Property 3: Duplicate event rejection (idempotence)", () => {
  it(
    "for any list and any item already in the list, addTag returns the exact same list reference",
    () => {
      fc.assert(
        fc.property(
          uniqueTagListArb(1).chain((list) =>
            fc.record({
              list: fc.constant(list),
              index: fc.integer({ min: 0, max: list.length - 1 }),
            }),
          ),
          ({ list, index }) => {
            const existingItem = list[index];
            const result = addTag(list, existingItem);

            // Same reference — no new array created
            expect(result).toBe(list);
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});

// ---------------------------------------------------------------------------
// Property 4: Minimum one metric invariant
// ---------------------------------------------------------------------------

describe("Property 4: Minimum one metric invariant", () => {
  it(
    "for any list of exactly length 1, enforceMinimum(list, item, 1) returns the same list reference",
    () => {
      fc.assert(
        fc.property(uniqueTagListArb(1).filter((l) => l.length === 1), (list) => {
          const item = list[0];
          const result = enforceMinimum(list, item, 1);

          // List is unchanged — same reference
          expect(result).toBe(list);
        }),
        { numRuns: 100 },
      );
    },
  );
});
