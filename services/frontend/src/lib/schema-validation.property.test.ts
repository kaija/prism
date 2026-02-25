// Feature: schema-management-ui, Property 10: 空白名稱驗證
// Feature: schema-management-ui, Property 11: Dynamic 屬性 Formula 必填驗證

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  validateSchemaPropertyForm,
  SchemaFormData,
} from "./schema-validation";

/**
 * **Validates: Requirements 7.1, 7.3**
 *
 * Property-based tests for schema form validation logic.
 * - Property 10: Whitespace-only name strings are rejected
 * - Property 11: Dynamic property_type with empty formula is rejected
 */

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates strings consisting only of whitespace characters (spaces, tabs, newlines, etc.). */
const whitespaceOnlyArb = fc
  .array(fc.constantFrom(" ", "\t", "\n", "\r", "\f", "\v", "\u00A0", "\u2003"), {
    minLength: 0,
    maxLength: 30,
  })
  .map((chars) => chars.join(""));

/** Generates a valid data_type value. */
const dataTypeArb = fc.constantFrom("string", "integer", "boolean", "float", "date");

/** Generates empty-ish formula values: null, undefined, empty string, or whitespace-only. */
const emptyFormulaArb = fc.oneof(
  fc.constant(null as string | null | undefined),
  fc.constant(undefined as string | null | undefined),
  fc.constant("" as string),
  whitespaceOnlyArb.map((s) => s as string | null | undefined),
);

// ---------------------------------------------------------------------------
// Property 10: 空白名稱驗證
// ---------------------------------------------------------------------------

describe("Property 10: 空白名稱驗證", () => {
  it("rejects any whitespace-only string as name", () => {
    fc.assert(
      fc.property(whitespaceOnlyArb, dataTypeArb, (name, dataType) => {
        const formData: SchemaFormData = {
          name,
          data_type: dataType,
          property_type: "static",
        };

        const errors = validateSchemaPropertyForm(formData);

        expect(errors.name).toBeDefined();
        expect(typeof errors.name).toBe("string");
        expect(errors.name!.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: Dynamic 屬性 Formula 必填驗證
// ---------------------------------------------------------------------------

describe("Property 11: Dynamic 屬性 Formula 必填驗證", () => {
  it("rejects dynamic property_type with empty/missing formula", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        dataTypeArb,
        emptyFormulaArb,
        (name, dataType, formula) => {
          const formData: SchemaFormData = {
            name,
            data_type: dataType,
            property_type: "dynamic",
            formula,
          };

          const errors = validateSchemaPropertyForm(formData);

          expect(errors.formula).toBeDefined();
          expect(typeof errors.formula).toBe("string");
          expect(errors.formula!.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
