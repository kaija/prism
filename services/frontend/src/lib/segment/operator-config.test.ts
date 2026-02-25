// Feature: segment-management-ui, Property 8: 運算子集合與資料型別對應

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  getOperatorsForDataType,
  PROFILE_OPERATORS_BY_TYPE,
  PROFILE_OPERATOR_LABELS,
  type ProfileOperator,
} from "./operator-config";

/**
 * **Validates: Requirements 6.2, 6.3, 6.4, 6.5, 6.6, 6.7**
 *
 * Property 8: For any SchemaProperty data_type (string, integer, float, boolean, date),
 * the operator set returned by getOperatorsForDataType should exactly match the
 * defined operator set for that data_type.
 */

// ─── Expected operator sets from the design doc ──────────────

const EXPECTED_OPERATORS: Record<string, readonly string[]> = {
  string: ["EQ", "NEQ", "CONTAINS", "STARTS_WITH", "ENDS_WITH", "REGEX_MATCH"],
  integer: ["EQ", "NEQ", "GT", "LT", "GTE", "LTE"],
  float: ["EQ", "NEQ", "GT", "LT", "GTE", "LTE"],
  boolean: ["IS_TRUE", "IS_FALSE"],
  date: ["EQ", "GT", "LT", "GTE", "LTE", "IN_RECENT_DAYS"],
};

const ALL_DATA_TYPES = Object.keys(EXPECTED_OPERATORS);

// ─── Property Tests ──────────────────────────────────────────

describe("Property 8: 運算子集合與資料型別對應", () => {
  it("each data_type returns exactly the expected operator set", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_DATA_TYPES),
        (dataType) => {
          const operators = getOperatorsForDataType(dataType);
          const expected = EXPECTED_OPERATORS[dataType];

          // Same length
          expect(operators).toHaveLength(expected.length);

          // Same elements (order matters per design doc)
          expect([...operators]).toEqual([...expected]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("every operator in every data_type has a UI label defined", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_DATA_TYPES),
        (dataType) => {
          const operators = getOperatorsForDataType(dataType);
          for (const op of operators) {
            expect(PROFILE_OPERATOR_LABELS[op as ProfileOperator]).toBeDefined();
            expect(typeof PROFILE_OPERATOR_LABELS[op as ProfileOperator]).toBe("string");
            expect(PROFILE_OPERATOR_LABELS[op as ProfileOperator].length).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("unknown data_type returns empty operator set", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z]{1,10}$/).filter((s) => !ALL_DATA_TYPES.includes(s)),
        (unknownType) => {
          const operators = getOperatorsForDataType(unknownType);
          expect(operators).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("integer and float share the same operator set", () => {
    const intOps = getOperatorsForDataType("integer");
    const floatOps = getOperatorsForDataType("float");
    expect([...intOps]).toEqual([...floatOps]);
  });

  it("boolean operators are exactly IS_TRUE and IS_FALSE", () => {
    const ops = getOperatorsForDataType("boolean");
    expect(ops).toContain("IS_TRUE");
    expect(ops).toContain("IS_FALSE");
    expect(ops).toHaveLength(2);
  });

  it("date operators include IN_RECENT_DAYS", () => {
    const ops = getOperatorsForDataType("date");
    expect(ops).toContain("IN_RECENT_DAYS");
  });
});
