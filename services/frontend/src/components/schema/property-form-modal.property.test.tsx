// Feature: schema-management-ui, Property 5: Formula 欄位條件顯示
// Feature: schema-management-ui, Property 7: 編輯表單預填資料
// Feature: schema-management-ui, Property 12: 驗證錯誤即時清除

import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import fc from "fast-check";

import { PropertyFormModal } from "./property-form-modal";
import type { SchemaProperty } from "@/types/api";

/**
 * **Validates: Requirements 4.3, 4.4, 5.1, 7.4**
 *
 * Property-based tests for PropertyFormModal component.
 * - Property 5: Formula field visibility equals property_type === "dynamic"
 * - Property 7: Edit mode pre-fills all form fields with the property's values
 * - Property 12: Validation errors are cleared when the user enters a valid value
 */

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const propertyTypeArb = fc.constantFrom("static" as const, "dynamic" as const);

const dataTypeArb = fc.constantFrom("string", "integer", "boolean", "float", "date");

const nonEmptyPrintableArb = fc
  .stringMatching(/^[a-zA-Z0-9_][a-zA-Z0-9_ ]{0,29}$/)
  .filter((s) => s.trim().length > 0);

const schemaTypeArb = fc.constantFrom("profile" as const, "event" as const);

const descriptionArb = fc.oneof(fc.constant(null), nonEmptyPrintableArb);

/** Generates an arbitrary SchemaProperty with valid fields. */
const schemaPropertyArb: fc.Arbitrary<SchemaProperty> = fc
  .record({
    id: fc.integer({ min: 1, max: 999999 }),
    project_id: nonEmptyPrintableArb,
    schema_type: schemaTypeArb,
    name: nonEmptyPrintableArb,
    data_type: dataTypeArb,
    description: descriptionArb,
    property_type: propertyTypeArb,
    created_at: fc.constant("2024-01-01T00:00:00Z"),
  })
  .chain((base) => {
    const formulaArb =
      base.property_type === "dynamic" ? nonEmptyPrintableArb : fc.constant(null);
    return formulaArb.map((formula) => ({ ...base, formula }));
  });

const noopSubmit = async () => {};

// ---------------------------------------------------------------------------
// Property 5: Formula 欄位條件顯示
// ---------------------------------------------------------------------------

describe("Property 5: Formula 欄位條件顯示", () => {
  it("formula field is visible only when property_type is 'dynamic'", () => {
    fc.assert(
      fc.property(propertyTypeArb, (pType) => {
        const { container, unmount } = render(
          <PropertyFormModal
            open={true}
            onClose={() => {}}
            onSubmit={noopSubmit}
            mode="create"
          />,
        );

        // Select the property_type radio
        const radio = container.querySelector(
          `input[name="property_type"][value="${pType}"]`,
        ) as HTMLInputElement;
        expect(radio).not.toBeNull();
        fireEvent.click(radio);

        // Check formula field visibility
        const formulaField = container.querySelector('[data-testid="formula-field"]');
        if (pType === "dynamic") {
          expect(formulaField).not.toBeNull();
        } else {
          expect(formulaField).toBeNull();
        }

        unmount();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: 編輯表單預填資料
// ---------------------------------------------------------------------------

describe("Property 7: 編輯表單預填資料", () => {
  it("edit mode pre-fills all form fields with the property's values", () => {
    fc.assert(
      fc.property(schemaPropertyArb, (prop) => {
        const { container, unmount } = render(
          <PropertyFormModal
            open={true}
            onClose={() => {}}
            onSubmit={noopSubmit}
            initialData={prop}
            mode="edit"
          />,
        );

        // Name input
        const nameInput = container.querySelector("#prop-name") as HTMLInputElement;
        expect(nameInput).not.toBeNull();
        expect(nameInput.value).toBe(prop.name);

        // Data type select
        const dataTypeSelect = container.querySelector("#prop-data-type") as HTMLSelectElement;
        expect(dataTypeSelect).not.toBeNull();
        expect(dataTypeSelect.value).toBe(prop.data_type);

        // Description textarea
        const descTextarea = container.querySelector("#prop-description") as HTMLTextAreaElement;
        expect(descTextarea).not.toBeNull();
        expect(descTextarea.value).toBe(prop.description ?? "");

        // Property type radio
        const selectedRadio = container.querySelector(
          `input[name="property_type"][value="${prop.property_type}"]`,
        ) as HTMLInputElement;
        expect(selectedRadio).not.toBeNull();
        expect(selectedRadio.checked).toBe(true);

        // Formula textarea (only visible when dynamic)
        if (prop.property_type === "dynamic") {
          const formulaTextarea = container.querySelector("#prop-formula") as HTMLTextAreaElement;
          expect(formulaTextarea).not.toBeNull();
          expect(formulaTextarea.value).toBe(prop.formula ?? "");
        }

        unmount();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: 驗證錯誤即時清除
// ---------------------------------------------------------------------------

describe("Property 12: 驗證錯誤即時清除", () => {
  it("validation error is cleared when user enters a valid value in the name field", () => {
    fc.assert(
      fc.property(nonEmptyPrintableArb, (validName) => {
        const { container, unmount } = render(
          <PropertyFormModal
            open={true}
            onClose={() => {}}
            onSubmit={noopSubmit}
            mode="create"
          />,
        );

        // Submit empty form to trigger validation errors
        const form = container.querySelector("form")!;
        fireEvent.submit(form);

        // Name error should be present
        const nameError = container.querySelector("#prop-name-error");
        expect(nameError).not.toBeNull();

        // Type a valid name
        const nameInput = container.querySelector("#prop-name") as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: validName } });

        // Name error should be cleared
        const nameErrorAfter = container.querySelector("#prop-name-error");
        expect(nameErrorAfter).toBeNull();

        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it("validation error is cleared when user selects a valid data_type", () => {
    fc.assert(
      fc.property(dataTypeArb, (validDataType) => {
        const { container, unmount } = render(
          <PropertyFormModal
            open={true}
            onClose={() => {}}
            onSubmit={noopSubmit}
            mode="create"
          />,
        );

        // Submit empty form to trigger validation errors
        const form = container.querySelector("form")!;
        fireEvent.submit(form);

        // data_type error should be present
        const dtError = container.querySelector("#prop-data-type-error");
        expect(dtError).not.toBeNull();

        // Select a valid data_type
        const dtSelect = container.querySelector("#prop-data-type") as HTMLSelectElement;
        fireEvent.change(dtSelect, { target: { value: validDataType } });

        // data_type error should be cleared
        const dtErrorAfter = container.querySelector("#prop-data-type-error");
        expect(dtErrorAfter).toBeNull();

        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it("formula validation error is cleared when user enters a valid formula", () => {
    fc.assert(
      fc.property(nonEmptyPrintableArb, (validFormula) => {
        const { container, unmount } = render(
          <PropertyFormModal
            open={true}
            onClose={() => {}}
            onSubmit={noopSubmit}
            mode="create"
          />,
        );

        // Switch to dynamic to show formula field
        const dynamicRadio = container.querySelector(
          'input[name="property_type"][value="dynamic"]',
        ) as HTMLInputElement;
        fireEvent.click(dynamicRadio);

        // Submit form with empty formula to trigger formula error
        const form = container.querySelector("form")!;
        fireEvent.submit(form);

        // Formula error should be present
        const formulaError = container.querySelector("#prop-formula-error");
        expect(formulaError).not.toBeNull();

        // Enter a valid formula
        const formulaTextarea = container.querySelector("#prop-formula") as HTMLTextAreaElement;
        fireEvent.change(formulaTextarea, { target: { value: validFormula } });

        // Formula error should be cleared
        const formulaErrorAfter = container.querySelector("#prop-formula-error");
        expect(formulaErrorAfter).toBeNull();

        unmount();
      }),
      { numRuns: 100 },
    );
  });
});
