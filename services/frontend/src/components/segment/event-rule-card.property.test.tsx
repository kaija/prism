// Feature: segment-management-ui, Property 9: 聚合屬性欄位條件顯示

import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";
import { cleanup, render, screen } from "@testing-library/react";
import { EventRuleCard } from "./event-rule-card";
import { AGGREGATION_CONFIG, AGGREGATION_FNS } from "@/lib/segment/operator-config";
import type { AggregationFn, EventRuleModel } from "@/types/segment-rules";
import type { SchemaProperty } from "@/types/api";

/**
 * **Validates: Requirements 7.3, 7.4**
 *
 * Property 9: For any AggregationFn value, the aggregation property select
 * field visibility should equal whether the aggregation function requires a
 * property parameter (i.e., not COUNT). Test this by checking
 * AGGREGATION_CONFIG[fn].requiresProperty.
 */

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

const sampleProperties: SchemaProperty[] = [
  {
    id: 1,
    project_id: "proj-1",
    schema_type: "event",
    name: "amount",
    data_type: "float",
    description: null,
    property_type: "static",
    formula: null,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    project_id: "proj-1",
    schema_type: "event",
    name: "page_url",
    data_type: "string",
    description: null,
    property_type: "static",
    formula: null,
    created_at: "2024-01-01T00:00:00Z",
  },
];

function makeEventRule(aggregation: AggregationFn): EventRuleModel {
  return {
    type: "event",
    id: "test-rule-1",
    eventName: "page_view",
    aggregation,
    aggregationProperty: aggregation !== "COUNT" ? "amount" : undefined,
    comparisonOp: "GTE",
    comparisonValue: 1,
    constraints: [],
  };
}

const noop = () => {};

describe("Property 9: 聚合屬性欄位條件顯示", () => {
  it("for any AggregationFn, aggregation property field visibility equals requiresProperty", () => {
    const aggFnArb = fc.constantFrom(...AGGREGATION_FNS);

    fc.assert(
      fc.property(aggFnArb, (fn) => {
        cleanup();

        const rule = makeEventRule(fn);
        render(
          <EventRuleCard
            rule={rule}
            eventProperties={sampleProperties}
            onUpdate={noop}
            onRemove={noop}
            onAddConstraint={noop}
            onUpdateConstraint={noop}
            onRemoveConstraint={noop}
          />,
        );

        const expectedVisible = AGGREGATION_CONFIG[fn].requiresProperty;
        const aggPropertyField = screen.queryByTestId("aggregation-property-field");

        if (expectedVisible) {
          expect(aggPropertyField).not.toBeNull();
        } else {
          expect(aggPropertyField).toBeNull();
        }
      }),
      { numRuns: 100 },
    );
  });
});
