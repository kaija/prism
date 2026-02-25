// Feature: segment-management-ui, Property 12: DSL Builder 產生有效 DSL

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { buildDsl, buildProfileRuleDsl, buildEventRuleDsl } from "./dsl-builder";
import type {
  ProfileRuleModel,
  EventRuleModel,
  EventConstraint,
  RuleGroupModel,
  ComparisonOp,
  StringOp,
  BooleanOp,
  DateOp,
  AggregationFn,
  EventComparisonOp,
  LogicOp,
} from "@/types/segment-rules";

/**
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
 *
 * Property 12: For any valid RuleGroupModel (with at least one fully configured rule),
 * the DSL Builder should produce a non-empty string, and the top-level function name
 * should match the RuleGroupModel's logic operator (no wrapper for single rules).
 */

// ─── Generators ──────────────────────────────────────────────

const propertyNameArb = fc.stringMatching(/^[a-z][a-z_]{0,19}$/).filter((s) => s.length >= 1);

const stringValueArb = fc.stringMatching(/^[a-zA-Z0-9_ ]{1,20}$/);

const profileRuleArb: fc.Arbitrary<ProfileRuleModel> = fc.oneof(
  // String operators
  fc.record({
    type: fc.constant("profile" as const),
    id: fc.uuid(),
    property: propertyNameArb,
    propertyDataType: fc.constant("string"),
    operator: fc.constantFrom<(ComparisonOp | StringOp)[]>("EQ", "NEQ", "CONTAINS", "STARTS_WITH", "ENDS_WITH", "REGEX_MATCH"),
    value: stringValueArb,
  }),
  // Numeric operators
  fc.record({
    type: fc.constant("profile" as const),
    id: fc.uuid(),
    property: propertyNameArb,
    propertyDataType: fc.constantFrom("integer", "float"),
    operator: fc.constantFrom<ComparisonOp[]>("EQ", "NEQ", "GT", "LT", "GTE", "LTE"),
    value: fc.integer({ min: -10000, max: 10000 }),
  }),
  // Boolean operators
  fc.record({
    type: fc.constant("profile" as const),
    id: fc.uuid(),
    property: propertyNameArb,
    propertyDataType: fc.constant("boolean"),
    operator: fc.constantFrom<BooleanOp[]>("IS_TRUE", "IS_FALSE"),
    value: fc.boolean(),
  }),
  // Date operators
  fc.record({
    type: fc.constant("profile" as const),
    id: fc.uuid(),
    property: propertyNameArb,
    propertyDataType: fc.constant("date"),
    operator: fc.constantFrom<(ComparisonOp | DateOp)[]>("EQ", "GT", "LT", "GTE", "LTE", "IN_RECENT_DAYS"),
    value: fc.oneof(stringValueArb, fc.nat({ max: 365 })),
  }),
);

const constraintArb: fc.Arbitrary<EventConstraint> = fc.record({
  id: fc.uuid(),
  property: propertyNameArb,
  propertyDataType: fc.constantFrom("string", "integer", "float"),
  operator: fc.constantFrom<(ComparisonOp | StringOp)[]>("EQ", "NEQ", "GT", "LT", "GTE", "LTE", "CONTAINS"),
  value: fc.oneof(stringValueArb, fc.integer({ min: 0, max: 10000 })),
});

const eventRuleArb: fc.Arbitrary<EventRuleModel> = fc.record({
  type: fc.constant("event" as const),
  id: fc.uuid(),
  eventName: fc.constantFrom("page_view", "purchase", "signup", "*"),
  aggregation: fc.constantFrom<AggregationFn[]>("COUNT", "SUM", "AVG", "MIN", "MAX", "UNIQUE"),
  aggregationProperty: fc.option(propertyNameArb, { nil: undefined }),
  comparisonOp: fc.constantFrom<EventComparisonOp[]>("EQ", "GT", "LT", "GTE", "LTE"),
  comparisonValue: fc.nat({ max: 10000 }),
  constraints: fc.array(constraintArb, { maxLength: 3 }),
});

const ruleArb = fc.oneof(profileRuleArb, eventRuleArb);

const ruleGroupArb: fc.Arbitrary<RuleGroupModel> = fc.record({
  logic: fc.constantFrom<LogicOp[]>("AND", "OR"),
  rules: fc.array(ruleArb, { minLength: 1, maxLength: 5 }),
});

// ─── Property Tests ──────────────────────────────────────────

describe("Property 12: DSL Builder 產生有效 DSL", () => {
  it("buildDsl produces a non-empty string for any valid RuleGroupModel", () => {
    fc.assert(
      fc.property(ruleGroupArb, (ruleGroup) => {
        const dsl = buildDsl(ruleGroup);
        expect(dsl).toBeTruthy();
        expect(typeof dsl).toBe("string");
        expect(dsl.length).toBeGreaterThan(0);
      }),
      { numRuns: 200 },
    );
  });

  it("single rule produces DSL without AND/OR wrapper", () => {
    fc.assert(
      fc.property(fc.constantFrom<LogicOp[]>("AND", "OR"), ruleArb, (logic, rule) => {
        const ruleGroup: RuleGroupModel = { logic, rules: [rule] };
        const dsl = buildDsl(ruleGroup);
        // Single rule should NOT start with AND( or OR(
        expect(dsl).not.toMatch(/^AND\(/);
        expect(dsl).not.toMatch(/^OR\(/);
      }),
      { numRuns: 200 },
    );
  });

  it("multiple rules produce DSL with matching logic wrapper", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<LogicOp[]>("AND", "OR"),
        fc.array(ruleArb, { minLength: 2, maxLength: 5 }),
        (logic, rules) => {
          const ruleGroup: RuleGroupModel = { logic, rules };
          const dsl = buildDsl(ruleGroup);
          // Multiple rules should start with the logic operator
          expect(dsl).toMatch(new RegExp(`^${logic}\\(`));
        },
      ),
      { numRuns: 200 },
    );
  });

  it("profile rule DSL contains PROFILE wrapper", () => {
    fc.assert(
      fc.property(profileRuleArb, (rule) => {
        const dsl = buildProfileRuleDsl(rule);
        expect(dsl).toContain("PROFILE(");
        expect(dsl).toContain(`"${rule.property}"`);
      }),
      { numRuns: 200 },
    );
  });

  it("event rule DSL contains EVENT wrapper and aggregation function", () => {
    fc.assert(
      fc.property(eventRuleArb, (rule) => {
        const dsl = buildEventRuleDsl(rule);
        expect(dsl).toContain("EVENT(");
        // The aggregation function should appear in the DSL
        expect(dsl).toContain(`${rule.aggregation}(`);
        // The comparison value should appear
        expect(dsl).toContain(String(rule.comparisonValue));
      }),
      { numRuns: 200 },
    );
  });

  it("event rule with constraints includes WHERE in DSL", () => {
    const eventWithConstraints = eventRuleArb.filter((r) => r.constraints.length > 0);
    fc.assert(
      fc.property(eventWithConstraints, (rule) => {
        const dsl = buildEventRuleDsl(rule);
        expect(dsl).toContain("WHERE(");
      }),
      { numRuns: 100 },
    );
  });
});
