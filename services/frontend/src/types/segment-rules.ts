// types/segment-rules.ts — UI rule model types for Segment editor

/** 比較運算子 — 對應 DSL 的 EQ/NEQ/GT/LT/GTE/LTE */
export type ComparisonOp = "EQ" | "NEQ" | "GT" | "LT" | "GTE" | "LTE";

/** 字串運算子 — 對應 DSL 的 CONTAINS/STARTS_WITH/ENDS_WITH/REGEX_MATCH */
export type StringOp = "CONTAINS" | "STARTS_WITH" | "ENDS_WITH" | "REGEX_MATCH";

/** 布林運算子 */
export type BooleanOp = "IS_TRUE" | "IS_FALSE";

/** 日期運算子 */
export type DateOp = "EQ" | "GT" | "LT" | "GTE" | "LTE" | "IN_RECENT_DAYS";

/** 聚合函式 — 對應 DSL 的 COUNT/SUM/AVG/MIN/MAX/UNIQUE */
export type AggregationFn = "COUNT" | "SUM" | "AVG" | "MIN" | "MAX" | "UNIQUE";

/** Event 規則的比較運算子 */
export type EventComparisonOp = "EQ" | "GT" | "LT" | "GTE" | "LTE";

/** 邏輯運算子 */
export type LogicOp = "AND" | "OR";

/** Profile 篩選規則 */
export interface ProfileRuleModel {
  type: "profile";
  id: string;
  property: string;
  propertyDataType: string;
  operator: ComparisonOp | StringOp | BooleanOp | DateOp;
  value: string | number | boolean;
}

/** Event 約束條件 */
export interface EventConstraint {
  id: string;
  property: string;
  propertyDataType: string;
  operator: ComparisonOp | StringOp;
  value: string | number;
}

/** Event 篩選規則 */
export interface EventRuleModel {
  type: "event";
  id: string;
  eventName: string;
  aggregation: AggregationFn;
  aggregationProperty?: string;
  comparisonOp: EventComparisonOp;
  comparisonValue: number;
  constraints: EventConstraint[];
}

/** 規則群組 */
export interface RuleGroupModel {
  logic: LogicOp;
  rules: (ProfileRuleModel | EventRuleModel)[];
}

/** Segment 編輯器完整模型 */
export interface SegmentFormModel {
  name: string;
  description: string;
  ruleGroup: RuleGroupModel;
  timeframe: import("./api").SegmentTimeframe;
}
