// Feature: segment-management-ui, Property 13: DSL 往返一致性

import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
import { buildDsl, buildProfileRuleDsl, buildEventRuleDsl } from "./dsl-builder";
import { parseDslToRuleGroup, resetParserId } from "./dsl-parser-ui";
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
 * **Validates: Requirements 8.5, 8.6**
 *
 * Property 13: For any valid RuleGroupModel, building DSL then parsing it back
 * should produce a semantically equivalent RuleGroupModel (logic, rule types,
 * properties, operators, and values all match).
 */

// ─── Generators ──────────────────────────────────────────────

const propertyNameArb = fc.stringMatching(/^[a-z][a-z_]{0,19}$/).filter((s) => s.length >= 1);

const stringValueArb = fc.stringMatching(/^[a-zA-Z0-9_]{1,20}$/);

// Profile rules that round-trip cleanly
const stringProfileRuleArb: fc.Arbitrary<ProfileRuleModel> = fc.record({
  type: fc.constant("profile" as const),
  id: fc.uuid(),
  property: propertyNameArb,
  propertyDataType: fc.constant("string"),
  operator: fc.constantFrom<(ComparisonOp | StringOp)[]>(
    "EQ", "NEQ", "CONTAINS", "STARTS_WITH", "ENDS_WITH", "REGEX_MATCH",
  ),
  value: stringValueArb,
});

const numericProfileRuleArb: fc.Arbitrary<ProfileRuleModel> = fc.record({
  type: fc.constant("profile" as const),
  id: fc.uuid(),
  property: propertyNameArb,
  propertyDataType: fc.constantFrom("integer", "float"),
  operator: fc.constantFrom<ComparisonOp[]>("EQ", "NEQ", "GT", "LT", "GTE", "LTE"),
  value: fc.integer({ min: 0, max: 10000 }),
});

const booleanProfileRuleArb: fc.Arbitrary<ProfileRuleModel> = fc.oneof(
  fc.record({
    type: fc.constant("profile" as const),
    id: fc.uuid(),
    property: propertyNameArb,
    propertyDataType: fc.constant("boolean"),
    operator: fc.constant<BooleanOp>("IS_TRUE"),
    value: fc.constant(true),
  }),
  fc.record({
    type: fc.constant("profile" as const),
    id: fc.uuid(),
    property: propertyNameArb,
    propertyDataType: fc.constant("boolean"),
    operator: fc.constant<BooleanOp>("IS_FALSE"),
    value: fc.constant(false),
  }),
);

const dateProfileRuleArb: fc.Arbitrary<ProfileRuleModel> = fc.record({
  type: fc.constant("profile" as const),
  id: fc.uuid(),
  property: propertyNameArb,
  propertyDataType: fc.constant("date"),
  operator: fc.constant<DateOp>("IN_RECENT_DAYS"),
  value: fc.integer({ min: 1, max: 365 }),
});

const profileRuleArb = fc.oneof(
  stringProfileRuleArb,
  numericProfileRuleArb,
  booleanProfileRuleArb,
  dateProfileRuleArb,
);

const constraintArb: fc.Arbitrary<EventConstraint> = fc.record({
  id: fc.uuid(),
  property: propertyNameArb,
  propertyDataType: fc.constantFrom("string", "integer"),
  operator: fc.constantFrom<(ComparisonOp | StringOp)[]>("EQ", "NEQ", "GT", "LT"),
  value: fc.oneof(stringValueArb, fc.integer({ min: 0, max: 10000 })),
});

// COUNT event rules (event name in EVENT())
const countEventRuleArb: fc.Arbitrary<EventRuleModel> = fc.record({
  type: fc.constant("event" as const),
  id: fc.uuid(),
  eventName: fc.constantFrom("page_view", "purchase", "signup", "*"),
  aggregation: fc.constant<AggregationFn>("COUNT"),
  comparisonOp: fc.constantFrom<EventComparisonOp[]>("EQ", "GT", "LT", "GTE", "LTE"),
  comparisonValue: fc.nat({ max: 10000 }),
  constraints: fc.array(constraintArb, { maxLength: 2 }),
});

// Non-COUNT event rules (aggregation property in EVENT())
const aggEventRuleArb: fc.Arbitrary<EventRuleModel> = fc.record({
  type: fc.constant("event" as const),
  id: fc.uuid(),
  eventName: fc.constantFrom("page_view", "purchase", "signup"),
  aggregation: fc.constantFrom<AggregationFn[]>("SUM", "AVG", "MIN", "MAX", "UNIQUE"),
  aggregationProperty: propertyNameArb,
  comparisonOp: fc.constantFrom<EventComparisonOp[]>("EQ", "GT", "LT", "GTE", "LTE"),
  comparisonValue: fc.nat({ max: 10000 }),
  constraints: fc.constant<EventConstraint[]>([]), // no constraints for simpler round-trip
});

const eventRuleArb = fc.oneof(countEventRuleArb, aggEventRuleArb);
const ruleArb = fc.oneof(profileRuleArb, eventRuleArb);

const ruleGroupArb: fc.Arbitrary<RuleGroupModel> = fc.record({
  logic: fc.constantFrom<LogicOp[]>("AND", "OR"),
  rules: fc.array(ruleArb, { minLength: 1, maxLength: 4 }),
});

// ─── Comparison Helpers ──────────────────────────────────────

/** Compare two profile rules for semantic equivalence (ignoring id and propertyDataType) */
function profileRulesEquivalent(a: ProfileRuleModel, b: ProfileRuleModel): boolean {
  return (
    a.type === b.type &&
    a.property === b.property &&
    a.operator === b.operator &&
    a.value === b.value
  );
}

/** Compare two event rules for semantic equivalence (ignoring id, timeframe) */
function eventRulesEquivalent(a: EventRuleModel, b: EventRuleModel): boolean {
  if (a.type !== b.type) return false;
  if (a.aggregation !== b.aggregation) return false;
  if (a.comparisonOp !== b.comparisonOp) return false;
  if (a.comparisonValue !== b.comparisonValue) return false;

  // For COUNT, compare event names
  if (a.aggregation === "COUNT") {
    if (a.eventName !== b.eventName) return false;
  } else {
    // For SUM/AVG etc, compare aggregation property
    const aProp = a.aggregationProperty ?? a.eventName;
    const bProp = b.aggregationProperty ?? b.eventName;
    if (aProp !== bProp) return false;
  }

  // Compare constraints
  if (a.constraints.length !== b.constraints.length) return false;
  for (let i = 0; i < a.constraints.length; i++) {
    const ca = a.constraints[i];
    const cb = b.constraints[i];
    if (ca.property !== cb.property || ca.operator !== cb.operator || ca.value !== cb.value) {
      return false;
    }
  }

  return true;
}

function rulesEquivalent(
  a: ProfileRuleModel | EventRuleModel,
  b: ProfileRuleModel | EventRuleModel,
): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "profile" && b.type === "profile") return profileRulesEquivalent(a, b);
  if (a.type === "event" && b.type === "event") return eventRulesEquivalent(a, b);
  return false;
}

function ruleGroupsEquivalent(a: RuleGroupModel, b: RuleGroupModel): boolean {
  // Single rule: logic doesn't matter (parser defaults to AND)
  if (a.rules.length > 1 && a.logic !== b.logic) return false;
  if (a.rules.length !== b.rules.length) return false;
  return a.rules.every((rule, i) => rulesEquivalent(rule, b.rules[i]));
}

// ─── Property Tests ──────────────────────────────────────────

describe("Property 13: DSL 往返一致性", () => {
  beforeEach(() => {
    resetParserId();
  });

  it("build → parse round-trip preserves profile rules", () => {
    fc.assert(
      fc.property(profileRuleArb, (rule) => {
        resetParserId();
        const dsl = buildProfileRuleDsl(rule);
        const parsed = parseDslToRuleGroup(dsl);

        expect(parsed.rules).toHaveLength(1);
        expect(parsed.rules[0].type).toBe("profile");
        expect(rulesEquivalent(rule, parsed.rules[0])).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it("build → parse round-trip preserves COUNT event rules", () => {
    fc.assert(
      fc.property(countEventRuleArb, (rule) => {
        resetParserId();
        const dsl = buildEventRuleDsl(rule);
        const parsed = parseDslToRuleGroup(dsl);

        expect(parsed.rules).toHaveLength(1);
        expect(parsed.rules[0].type).toBe("event");
        expect(rulesEquivalent(rule, parsed.rules[0])).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it("build → parse round-trip preserves non-COUNT event rules", () => {
    fc.assert(
      fc.property(aggEventRuleArb, (rule) => {
        resetParserId();
        const dsl = buildEventRuleDsl(rule);
        const parsed = parseDslToRuleGroup(dsl);

        expect(parsed.rules).toHaveLength(1);
        expect(parsed.rules[0].type).toBe("event");
        expect(rulesEquivalent(rule, parsed.rules[0])).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it("build → parse round-trip preserves full RuleGroupModel", () => {
    fc.assert(
      fc.property(ruleGroupArb, (ruleGroup) => {
        resetParserId();
        const dsl = buildDsl(ruleGroup);
        const parsed = parseDslToRuleGroup(dsl);

        expect(ruleGroupsEquivalent(ruleGroup, parsed)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
