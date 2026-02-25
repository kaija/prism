// lib/segment/dsl-builder.ts — Converts UI rule models to DSL strings

import type {
  ProfileRuleModel,
  EventRuleModel,
  EventConstraint,
  RuleGroupModel,
} from "@/types/segment-rules";

/**
 * Format a DSL value — strings get quoted, booleans/numbers stay raw.
 */
function formatValue(value: string | number | boolean): string {
  if (typeof value === "string") return `"${value}"`;
  return String(value);
}

/**
 * Build DSL for a single EventConstraint.
 * e.g. GT(EVENT("amount"), 100)
 */
function buildConstraintDsl(constraint: EventConstraint): string {
  return `${constraint.operator}(EVENT("${constraint.property}"), ${formatValue(constraint.value)})`;
}

/**
 * Build DSL for a Profile Rule.
 *
 * Examples:
 *   EQ(PROFILE("age"), 25)
 *   CONTAINS(PROFILE("name"), "john")
 *   EQ(PROFILE("is_active"), true)      — IS_TRUE
 *   EQ(PROFILE("is_active"), false)     — IS_FALSE
 *   IN_RECENT_DAYS(PROFILE("birthday"), 30)
 */
export function buildProfileRuleDsl(rule: ProfileRuleModel): string {
  const { property, operator, value } = rule;

  if (operator === "IS_TRUE") {
    return `EQ(PROFILE("${property}"), true)`;
  }
  if (operator === "IS_FALSE") {
    return `EQ(PROFILE("${property}"), false)`;
  }

  return `${operator}(PROFILE("${property}"), ${formatValue(value)})`;
}

/**
 * Build DSL for an Event Rule.
 *
 * COUNT uses the event name:  GTE(COUNT(EVENT("page_view")), 3)
 * SUM/AVG/MIN/MAX/UNIQUE use the aggregation property:  GT(SUM(EVENT("amount")), 100)
 *
 * With WHERE constraints:
 *   GTE(COUNT(WHERE(EVENT("purchase"), GT(EVENT("amount"), 50))), 5)
 */
export function buildEventRuleDsl(rule: EventRuleModel): string {
  const { eventName, aggregation, aggregationProperty, comparisonOp, comparisonValue, constraints } = rule;

  // Inner EVENT() argument — COUNT uses event name, others use aggregation property
  const eventArg = aggregation === "COUNT" ? eventName : (aggregationProperty ?? eventName);
  const eventExpr = `EVENT("${eventArg}")`;

  let aggregationExpr: string;

  if (constraints.length > 0) {
    const constraintDsls = constraints.map(buildConstraintDsl);
    const whereExpr = `WHERE(EVENT("${eventName}"), ${constraintDsls.join(", ")})`;
    if (aggregation !== "COUNT" && aggregationProperty) {
      // Non-COUNT with constraints: pass aggregation property as second arg
      aggregationExpr = `${aggregation}(${whereExpr}, "${aggregationProperty}")`;
    } else {
      aggregationExpr = `${aggregation}(${whereExpr})`;
    }
  } else {
    aggregationExpr = `${aggregation}(${eventExpr})`;
  }

  return `${comparisonOp}(${aggregationExpr}, ${comparisonValue})`;
}

/**
 * Build DSL for a complete RuleGroup.
 *
 * Single rule: just the rule DSL (no AND/OR wrapper)
 * Multiple rules: AND(dsl1, dsl2) or OR(dsl1, dsl2, dsl3)
 */
export function buildDsl(ruleGroup: RuleGroupModel): string {
  const ruleDsls = ruleGroup.rules.map((rule) => {
    if (rule.type === "profile") return buildProfileRuleDsl(rule);
    return buildEventRuleDsl(rule);
  });

  if (ruleDsls.length === 0) return "";
  if (ruleDsls.length === 1) return ruleDsls[0];

  return `${ruleGroup.logic}(${ruleDsls.join(", ")})`;
}
