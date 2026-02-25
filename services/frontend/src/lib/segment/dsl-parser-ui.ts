// lib/segment/dsl-parser-ui.ts — Parses DSL strings back into UI rule models

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

let idCounter = 0;
function generateId(): string {
  return `parsed-${++idCounter}`;
}

/** Reset ID counter (useful for testing) */
export function resetParserId(): void {
  idCounter = 0;
}

// ─── Tokenizer ───────────────────────────────────────────────

type Token =
  | { type: "IDENT"; value: string }
  | { type: "STRING"; value: string }
  | { type: "NUMBER"; value: number }
  | { type: "BOOLEAN"; value: boolean }
  | { type: "LPAREN" }
  | { type: "RPAREN" }
  | { type: "COMMA" };

function tokenize(dsl: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < dsl.length) {
    const ch = dsl[i];

    // Skip whitespace
    if (/\s/.test(ch)) { i++; continue; }

    // String literal
    if (ch === '"') {
      i++; // skip opening quote
      let str = "";
      while (i < dsl.length && dsl[i] !== '"') {
        if (dsl[i] === "\\" && i + 1 < dsl.length) {
          str += dsl[++i];
        } else {
          str += dsl[i];
        }
        i++;
      }
      i++; // skip closing quote
      tokens.push({ type: "STRING", value: str });
      continue;
    }

    if (ch === "(") { tokens.push({ type: "LPAREN" }); i++; continue; }
    if (ch === ")") { tokens.push({ type: "RPAREN" }); i++; continue; }
    if (ch === ",") { tokens.push({ type: "COMMA" }); i++; continue; }

    // Number (including negative)
    if (/[\d\-]/.test(ch) && (ch !== "-" || (i + 1 < dsl.length && /\d/.test(dsl[i + 1])))) {
      let num = "";
      if (ch === "-") { num += ch; i++; }
      while (i < dsl.length && /[\d.]/.test(dsl[i])) { num += dsl[i]; i++; }
      tokens.push({ type: "NUMBER", value: Number(num) });
      continue;
    }

    // Identifier (including true/false)
    if (/[A-Za-z_]/.test(ch)) {
      let ident = "";
      while (i < dsl.length && /[A-Za-z_0-9]/.test(dsl[i])) { ident += dsl[i]; i++; }
      if (ident === "true") tokens.push({ type: "BOOLEAN", value: true });
      else if (ident === "false") tokens.push({ type: "BOOLEAN", value: false });
      else tokens.push({ type: "IDENT", value: ident });
      continue;
    }

    // Unknown character — skip
    i++;
  }

  return tokens;
}

// ─── Parser ──────────────────────────────────────────────────

interface ParseContext {
  tokens: Token[];
  pos: number;
}

function peek(ctx: ParseContext): Token | undefined {
  return ctx.tokens[ctx.pos];
}

function consume(ctx: ParseContext): Token {
  return ctx.tokens[ctx.pos++];
}

function expect(ctx: ParseContext, type: Token["type"]): Token {
  const tok = consume(ctx);
  if (tok.type !== type) throw new Error(`Expected ${type} but got ${tok.type}`);
  return tok;
}

/** Parse a function call: IDENT(arg1, arg2, ...) */
interface FnCall {
  name: string;
  args: AstNode[];
}

type AstNode =
  | { type: "fn"; call: FnCall }
  | { type: "string"; value: string }
  | { type: "number"; value: number }
  | { type: "boolean"; value: boolean };

function parseNode(ctx: ParseContext): AstNode {
  const tok = peek(ctx);
  if (!tok) throw new Error("Unexpected end of input");

  if (tok.type === "STRING") { consume(ctx); return { type: "string", value: tok.value }; }
  if (tok.type === "NUMBER") { consume(ctx); return { type: "number", value: tok.value }; }
  if (tok.type === "BOOLEAN") { consume(ctx); return { type: "boolean", value: tok.value }; }

  if (tok.type === "IDENT") {
    const name = tok.value;
    consume(ctx); // consume IDENT
    expect(ctx, "LPAREN");

    const args: AstNode[] = [];
    while (peek(ctx)?.type !== "RPAREN") {
      if (args.length > 0) expect(ctx, "COMMA");
      args.push(parseNode(ctx));
    }
    expect(ctx, "RPAREN");

    return { type: "fn", call: { name, args } };
  }

  throw new Error(`Unexpected token: ${tok.type}`);
}

// ─── AST → Rule Model Conversion ────────────────────────────

const PROFILE_OPS = new Set([
  "EQ", "NEQ", "GT", "LT", "GTE", "LTE",
  "CONTAINS", "STARTS_WITH", "ENDS_WITH", "REGEX_MATCH",
  "IN_RECENT_DAYS",
]);

const AGGREGATION_FNS = new Set(["COUNT", "SUM", "AVG", "MIN", "MAX", "UNIQUE"]);

function getStringValue(node: AstNode): string {
  if (node.type === "string") return node.value;
  throw new Error("Expected string node");
}

function getNumericValue(node: AstNode): number {
  if (node.type === "number") return node.value;
  throw new Error("Expected number node");
}

function getLiteralValue(node: AstNode): string | number | boolean {
  if (node.type === "string") return node.value;
  if (node.type === "number") return node.value;
  if (node.type === "boolean") return node.value;
  throw new Error("Expected literal node");
}

/** Check if an AST node is a PROFILE() function call */
function isProfileCall(node: AstNode): boolean {
  return node.type === "fn" && node.call.name === "PROFILE";
}

/** Check if an AST node contains an aggregation function (COUNT/SUM/etc) */
function isAggregationCall(node: AstNode): boolean {
  return node.type === "fn" && AGGREGATION_FNS.has(node.call.name);
}

/** Extract the event name from EVENT("name") or WHERE(EVENT("name"), ...) */
function extractEventName(node: AstNode): string {
  if (node.type === "fn") {
    if (node.call.name === "EVENT") return getStringValue(node.call.args[0]);
    if (node.call.name === "WHERE") return extractEventName(node.call.args[0]);
  }
  throw new Error("Cannot extract event name");
}

/** Extract WHERE constraints from a WHERE(...) node */
function extractConstraints(node: AstNode): EventConstraint[] {
  if (node.type !== "fn" || node.call.name !== "WHERE") return [];

  // WHERE(EVENT("name"), constraint1, constraint2, ...)
  return node.call.args.slice(1).map((constraintNode) => {
    if (constraintNode.type !== "fn") throw new Error("Expected constraint function");
    const op = constraintNode.call.name as ComparisonOp | StringOp;
    // constraint: OP(EVENT("prop"), value)
    const propNode = constraintNode.call.args[0];
    if (propNode.type !== "fn" || propNode.call.name !== "EVENT") {
      throw new Error("Expected EVENT in constraint");
    }
    const property = getStringValue(propNode.call.args[0]);
    const value = getLiteralValue(constraintNode.call.args[1]);

    return {
      id: generateId(),
      property,
      propertyDataType: typeof value === "number" ? "integer" : "string",
      operator: op,
      value: value as string | number,
    };
  });
}

/** Convert an AST node to a ProfileRuleModel */
function astToProfileRule(opName: string, args: AstNode[]): ProfileRuleModel {
  const profileNode = args[0];
  if (profileNode.type !== "fn" || profileNode.call.name !== "PROFILE") {
    throw new Error("Expected PROFILE() in profile rule");
  }
  const property = getStringValue(profileNode.call.args[0]);
  const rawValue = getLiteralValue(args[1]);

  // Detect IS_TRUE / IS_FALSE
  if (opName === "EQ" && typeof rawValue === "boolean") {
    return {
      type: "profile",
      id: generateId(),
      property,
      propertyDataType: "boolean",
      operator: rawValue ? "IS_TRUE" : "IS_FALSE",
      value: rawValue,
    };
  }

  // Infer data type from operator and value
  let propertyDataType = "string";
  if (opName === "IN_RECENT_DAYS") propertyDataType = "date";
  else if (typeof rawValue === "number") propertyDataType = "integer";
  else if (typeof rawValue === "boolean") propertyDataType = "boolean";

  return {
    type: "profile",
    id: generateId(),
    property,
    propertyDataType,
    operator: opName as ComparisonOp | StringOp | BooleanOp | DateOp,
    value: rawValue,
  };
}

/** Convert an AST node to an EventRuleModel */
function astToEventRule(comparisonOp: string, args: AstNode[]): EventRuleModel {
  const aggNode = args[0];
  const comparisonValue = getNumericValue(args[1]);

  if (aggNode.type !== "fn") throw new Error("Expected aggregation function");

  const aggregation = aggNode.call.name as AggregationFn;
  const innerNode = aggNode.call.args[0];

  // Extract event name and constraints
  let eventName: string;
  let constraints: EventConstraint[] = [];
  let aggregationProperty: string | undefined;

  if (innerNode.type === "fn" && innerNode.call.name === "WHERE") {
    eventName = extractEventName(innerNode);
    constraints = extractConstraints(innerNode);
    // For non-COUNT with constraints, aggregation property is the second arg of the aggregation fn
    if (aggregation !== "COUNT" && aggNode.call.args.length >= 2) {
      aggregationProperty = getStringValue(aggNode.call.args[1]);
    }
  } else if (innerNode.type === "fn" && innerNode.call.name === "EVENT") {
    const argValue = getStringValue(innerNode.call.args[0]);
    if (aggregation === "COUNT") {
      eventName = argValue;
    } else {
      // For SUM/AVG/MIN/MAX/UNIQUE, EVENT wraps the aggregation property
      aggregationProperty = argValue;
      eventName = argValue; // best guess — will be overridden if we have more context
    }
  } else {
    throw new Error("Expected EVENT or WHERE in aggregation");
  }

  return {
    type: "event",
    id: generateId(),
    eventName,
    aggregation,
    ...(aggregationProperty && aggregation !== "COUNT" ? { aggregationProperty } : {}),
    comparisonOp: comparisonOp as EventComparisonOp,
    comparisonValue,
    constraints,
  };
}

/** Convert a single rule AST node to a ProfileRuleModel or EventRuleModel */
function astToRule(node: AstNode): ProfileRuleModel | EventRuleModel {
  if (node.type !== "fn") throw new Error("Expected function call for rule");

  const { name, args } = node.call;

  // Check if first arg is PROFILE() → profile rule
  if (args.length >= 2 && isProfileCall(args[0])) {
    return astToProfileRule(name, args);
  }

  // Check if first arg is an aggregation function → event rule
  if (args.length >= 2 && isAggregationCall(args[0])) {
    return astToEventRule(name, args);
  }

  // Check if the operator itself is a profile op with PROFILE as first arg
  if (PROFILE_OPS.has(name) && args.length >= 2 && isProfileCall(args[0])) {
    return astToProfileRule(name, args);
  }

  throw new Error(`Cannot determine rule type for function: ${name}`);
}

/**
 * Parse a DSL string back into a RuleGroupModel.
 *
 * Handles:
 * - Single rule (no AND/OR wrapper)
 * - AND(rule1, rule2, ...) or OR(rule1, rule2, ...)
 */
export function parseDslToRuleGroup(dsl: string): RuleGroupModel {
  const tokens = tokenize(dsl);
  const ctx: ParseContext = { tokens, pos: 0 };
  const ast = parseNode(ctx);

  if (ast.type !== "fn") throw new Error("Expected function call at top level");

  const { name, args } = ast.call;

  // Top-level AND/OR
  if (name === "AND" || name === "OR") {
    const logic: LogicOp = name;
    const rules = args.map(astToRule);
    return { logic, rules };
  }

  // Single rule — default logic AND
  const rule = astToRule(ast);
  return { logic: "AND", rules: [rule] };
}
