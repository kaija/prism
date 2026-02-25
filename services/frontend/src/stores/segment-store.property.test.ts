// Feature: segment-management-ui, Property 6: 邏輯切換對合性
// Feature: segment-management-ui, Property 7: 新增/移除規則計數不變量
// Feature: segment-management-ui, Property 11: 新增/移除約束條件計數不變量
// Feature: segment-management-ui, Property 10: Event 屬性合併內建屬性

import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
import {
  useSegmentStore,
  mergeEventProperties,
  BUILT_IN_EVENT_PROPERTIES,
  resetStoreIdCounter,
} from "./segment-store";
import type { SchemaProperty } from "@/types/api";
import type { LogicOp } from "@/types/segment-rules";

// ─── Helpers ─────────────────────────────────────────────────

function resetStore() {
  resetStoreIdCounter();
  useSegmentStore.setState({
    segments: [],
    totalSegments: 0,
    listLoading: false,
    listError: null,
    form: {
      name: "",
      description: "",
      ruleGroup: { logic: "AND", rules: [] },
      timeframe: { type: "relative", relative: "last_30_days" },
    },
    saving: false,
    saveError: null,
    dslPreview: "",
    profileProperties: [],
    eventProperties: [],
    propertiesLoading: false,
  });
}

const logicArb = fc.constantFrom<LogicOp[]>("AND", "OR");

// ─── Property 6: 邏輯切換對合性 ─────────────────────────────

/**
 * **Validates: Requirements 5.2**
 *
 * Property 6: For any RuleGroupModel, toggling logic twice
 * (AND→OR→AND or OR→AND→OR) should return to the original state.
 */
describe("Property 6: 邏輯切換對合性", () => {
  beforeEach(resetStore);

  it("toggling logic twice returns to the original logic value", () => {
    fc.assert(
      fc.property(logicArb, (initialLogic) => {
        resetStore();

        // Set initial logic
        useSegmentStore.getState().setForm({
          ruleGroup: { logic: initialLogic, rules: [] },
        });
        expect(useSegmentStore.getState().form.ruleGroup.logic).toBe(initialLogic);

        // Toggle once
        useSegmentStore.getState().toggleLogic();
        const afterFirst = useSegmentStore.getState().form.ruleGroup.logic;
        expect(afterFirst).not.toBe(initialLogic);

        // Toggle again
        useSegmentStore.getState().toggleLogic();
        const afterSecond = useSegmentStore.getState().form.ruleGroup.logic;
        expect(afterSecond).toBe(initialLogic);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 7: 新增/移除規則計數不變量 ─────────────────────

/**
 * **Validates: Requirements 5.3, 5.4, 5.6**
 *
 * Property 7: For any RuleGroupModel, adding a rule increases count by 1,
 * removing a rule decreases count by 1, and the removed rule no longer
 * appears in the group.
 */
describe("Property 7: 新增/移除規則計數不變量", () => {
  beforeEach(resetStore);

  it("addProfileRule increases rule count by 1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        (initialCount) => {
          resetStore();

          // Add initialCount rules first
          for (let i = 0; i < initialCount; i++) {
            useSegmentStore.getState().addProfileRule();
          }
          const countBefore = useSegmentStore.getState().form.ruleGroup.rules.length;
          expect(countBefore).toBe(initialCount);

          // Add one more
          useSegmentStore.getState().addProfileRule();
          const countAfter = useSegmentStore.getState().form.ruleGroup.rules.length;
          expect(countAfter).toBe(countBefore + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("addEventRule increases rule count by 1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        (initialCount) => {
          resetStore();

          for (let i = 0; i < initialCount; i++) {
            useSegmentStore.getState().addEventRule();
          }
          const countBefore = useSegmentStore.getState().form.ruleGroup.rules.length;

          useSegmentStore.getState().addEventRule();
          const countAfter = useSegmentStore.getState().form.ruleGroup.rules.length;
          expect(countAfter).toBe(countBefore + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("removeRule decreases rule count by 1 and rule no longer appears", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.boolean(),
        (ruleCount, useProfile) => {
          resetStore();

          // Add rules
          for (let i = 0; i < ruleCount; i++) {
            if (useProfile) {
              useSegmentStore.getState().addProfileRule();
            } else {
              useSegmentStore.getState().addEventRule();
            }
          }

          const rules = useSegmentStore.getState().form.ruleGroup.rules;
          const countBefore = rules.length;

          // Pick a random rule to remove (use the last one for simplicity)
          const ruleToRemove = rules[rules.length - 1];
          useSegmentStore.getState().removeRule(ruleToRemove.id);

          const rulesAfter = useSegmentStore.getState().form.ruleGroup.rules;
          expect(rulesAfter.length).toBe(countBefore - 1);
          expect(rulesAfter.find((r) => r.id === ruleToRemove.id)).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 11: 新增/移除約束條件計數不變量 ─────────────────

/**
 * **Validates: Requirements 7.9**
 *
 * Property 11: For any EventRuleModel, adding a constraint increases count
 * by 1, removing a constraint decreases count by 1.
 */
describe("Property 11: 新增/移除約束條件計數不變量", () => {
  beforeEach(resetStore);

  it("addConstraint increases constraint count by 1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }),
        (initialConstraints) => {
          resetStore();

          // Add an event rule
          useSegmentStore.getState().addEventRule();
          const eventRule = useSegmentStore.getState().form.ruleGroup.rules[0];

          // Add initial constraints
          for (let i = 0; i < initialConstraints; i++) {
            useSegmentStore.getState().addConstraint(eventRule.id);
          }

          const constraintsBefore = (
            useSegmentStore.getState().form.ruleGroup.rules[0] as import("@/types/segment-rules").EventRuleModel
          ).constraints.length;
          expect(constraintsBefore).toBe(initialConstraints);

          // Add one more
          useSegmentStore.getState().addConstraint(eventRule.id);
          const constraintsAfter = (
            useSegmentStore.getState().form.ruleGroup.rules[0] as import("@/types/segment-rules").EventRuleModel
          ).constraints.length;
          expect(constraintsAfter).toBe(constraintsBefore + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("removeConstraint decreases constraint count by 1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (constraintCount) => {
          resetStore();

          // Add an event rule
          useSegmentStore.getState().addEventRule();
          const eventRule = useSegmentStore.getState().form.ruleGroup.rules[0];

          // Add constraints
          for (let i = 0; i < constraintCount; i++) {
            useSegmentStore.getState().addConstraint(eventRule.id);
          }

          const ruleBefore = useSegmentStore.getState().form.ruleGroup.rules[0] as import("@/types/segment-rules").EventRuleModel;
          const countBefore = ruleBefore.constraints.length;

          // Remove the last constraint
          const constraintToRemove = ruleBefore.constraints[ruleBefore.constraints.length - 1];
          useSegmentStore.getState().removeConstraint(eventRule.id, constraintToRemove.id);

          const ruleAfter = useSegmentStore.getState().form.ruleGroup.rules[0] as import("@/types/segment-rules").EventRuleModel;
          expect(ruleAfter.constraints.length).toBe(countBefore - 1);
          expect(ruleAfter.constraints.find((c) => c.id === constraintToRemove.id)).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 10: Event 屬性合併內建屬性 ─────────────────────

/**
 * **Validates: Requirements 7.5, 10.2**
 *
 * Property 10: For any event schema property list, the merged list should
 * contain all schema properties plus 3 built-in properties (event_name,
 * timestamp, profile_id), total = schema count + 3.
 */

const schemaPropertyArb: fc.Arbitrary<SchemaProperty> = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  project_id: fc.constant("proj-1"),
  schema_type: fc.constant("event" as const),
  name: fc.stringMatching(/^[a-z][a-z_]{0,19}$/).filter((s) => s.length >= 1),
  data_type: fc.constantFrom("string", "integer", "float", "boolean", "date"),
  description: fc.constant(null),
  property_type: fc.constant("static" as const),
  formula: fc.constant(null),
  created_at: fc.constant("2024-01-01T00:00:00Z"),
});

describe("Property 10: Event 屬性合併內建屬性", () => {
  it("merged list contains all schema properties plus 3 built-in properties", () => {
    fc.assert(
      fc.property(
        fc.array(schemaPropertyArb, { minLength: 0, maxLength: 20 }),
        (schemaProps) => {
          const merged = mergeEventProperties(schemaProps);

          // Total count = schema + 3 built-in
          expect(merged.length).toBe(schemaProps.length + 3);

          // All schema properties are present
          for (const prop of schemaProps) {
            expect(merged.some((m) => m.id === prop.id && m.name === prop.name)).toBe(true);
          }

          // All 3 built-in properties are present
          const builtInNames = BUILT_IN_EVENT_PROPERTIES.map((p) => p.name);
          expect(builtInNames).toEqual(["event_name", "timestamp", "profile_id"]);
          for (const name of builtInNames) {
            expect(merged.some((m) => m.name === name)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
