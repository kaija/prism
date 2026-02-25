// Feature: schema-management-ui, Property 3: 屬性表格欄位完整性
// Feature: schema-management-ui, Property 4: 屬性類型 Badge 對應

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import fc from "fast-check";

import { PropertyTable } from "./property-table";
import type { SchemaProperty } from "@/types/api";

/**
 * **Validates: Requirements 3.2, 3.3, 3.4**
 *
 * Property-based tests for PropertyTable component.
 * - Property 3: Every SchemaProperty row renders name, data_type, property_type, and description
 * - Property 4: The ds-badge text matches the property's property_type value
 */

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates a non-empty printable string (avoids whitespace-only). */
const nonEmptyPrintableArb = fc
  .stringMatching(/^[a-zA-Z0-9_][a-zA-Z0-9_ ]{0,29}$/)
  .filter((s) => s.trim().length > 0);

/** Generates a valid property_type. */
const propertyTypeArb = fc.constantFrom("static" as const, "dynamic" as const);

/** Generates a valid data_type. */
const dataTypeArb = fc.constantFrom("string", "integer", "boolean", "float", "date");

/** Generates a valid schema_type. */
const schemaTypeArb = fc.constantFrom("profile" as const, "event" as const);

/** Generates a non-null description string. */
const descriptionArb = fc.oneof(
  fc.constant(null),
  nonEmptyPrintableArb,
);

/** Generates an arbitrary SchemaProperty with valid fields. */
const schemaPropertyArb: fc.Arbitrary<SchemaProperty> = fc.record({
  id: fc.integer({ min: 1, max: 999999 }),
  project_id: nonEmptyPrintableArb,
  schema_type: schemaTypeArb,
  name: nonEmptyPrintableArb,
  data_type: dataTypeArb,
  description: descriptionArb,
  property_type: propertyTypeArb,
  formula: fc.constant(null),
  created_at: fc.constant("2024-01-01T00:00:00Z"),
});

const noop = () => {};

// ---------------------------------------------------------------------------
// Property 3: 屬性表格欄位完整性
// ---------------------------------------------------------------------------

describe("Property 3: 屬性表格欄位完整性", () => {
  it("renders name, data_type, property_type, and description for any SchemaProperty", () => {
    fc.assert(
      fc.property(schemaPropertyArb, (prop) => {
        const { container, unmount } = render(
          <PropertyTable properties={[prop]} loading={false} onEdit={noop} onDelete={noop} />,
        );

        const textContent = container.textContent ?? "";

        // name must appear in the rendered output
        expect(textContent).toContain(prop.name);

        // data_type must appear
        expect(textContent).toContain(prop.data_type);

        // property_type must appear
        expect(textContent).toContain(prop.property_type);

        // description: if non-null, the text should appear; if null, "—" is shown
        if (prop.description !== null) {
          expect(textContent).toContain(prop.description);
        } else {
          expect(textContent).toContain("—");
        }

        unmount();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: 屬性類型 Badge 對應
// ---------------------------------------------------------------------------

describe("Property 4: 屬性類型 Badge 對應", () => {
  it("ds-badge text matches property_type for any SchemaProperty", () => {
    fc.assert(
      fc.property(schemaPropertyArb, (prop) => {
        const { container, unmount } = render(
          <PropertyTable properties={[prop]} loading={false} onEdit={noop} onDelete={noop} />,
        );

        const badge = container.querySelector(".ds-badge");
        expect(badge).not.toBeNull();
        expect(badge!.textContent).toBe(prop.property_type);

        unmount();
      }),
      { numRuns: 100 },
    );
  });
});
