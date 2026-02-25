// Feature: schema-management-ui, Property 6: 新增屬性更新列表
// Feature: schema-management-ui, Property 8: 更新屬性反映變更
// Feature: schema-management-ui, Property 9: 刪除屬性移除列表項目

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import fc from "fast-check";
import { useSchemaStore } from "@/stores/schema-store";
import type {
  SchemaProperty,
  SchemaPropertyCreate,
  SchemaPropertyUpdate,
} from "@/types/api";

/**
 * **Validates: Requirements 4.5, 5.3, 6.2**
 *
 * Property-based tests for useSchemaStore CRUD operations.
 * - Property 6: After creating a property, the list grows by one and contains the new item.
 * - Property 8: After updating a property, the list reflects the updated values.
 * - Property 9: After deleting a property, the item is removed and list length decreases by one.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

beforeEach(() => {
  useSchemaStore.setState({ properties: [], loading: false, error: null });
});

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const DATA_TYPES = ["string", "integer", "boolean", "float", "date"] as const;
const SCHEMA_TYPES = ["profile", "event"] as const;

const schemaTypeArb = fc.constantFrom(...SCHEMA_TYPES);
const dataTypeArb = fc.constantFrom(...DATA_TYPES);
const propertyTypeArb = fc.constantFrom("static" as const, "dynamic" as const);

/** Generates a valid SchemaPropertyCreate payload. */
const schemaPropertyCreateArb: fc.Arbitrary<SchemaPropertyCreate> = fc
  .record({
    name: fc.string({ minLength: 1, maxLength: 128 }),
    data_type: dataTypeArb,
    description: fc.option(fc.string({ maxLength: 256 }), { nil: null }),
    property_type: propertyTypeArb,
  })
  .map((r) => ({
    ...r,
    formula: r.property_type === "dynamic" ? "some_formula()" : null,
  }));

/** Generates a SchemaProperty with a given id. */
function schemaPropertyArb(idArb: fc.Arbitrary<number> = fc.integer({ min: 1, max: 999999 })): fc.Arbitrary<SchemaProperty> {
  return fc
    .record({
      id: idArb,
      project_id: fc.constant("proj-1"),
      schema_type: schemaTypeArb,
      name: fc.string({ minLength: 1, maxLength: 128 }),
      data_type: dataTypeArb,
      description: fc.option(fc.string({ maxLength: 256 }), { nil: null }),
      property_type: propertyTypeArb,
      created_at: fc.constant("2024-01-01T00:00:00Z"),
    })
    .map((r) => ({
      ...r,
      formula: r.property_type === "dynamic" ? "dsl_expr()" : null,
    }));
}

/** Generates a non-empty list of SchemaProperty objects with unique ids. */
const schemaPropertyListArb = fc
  .uniqueArray(fc.integer({ min: 1, max: 999999 }), { minLength: 1, maxLength: 10 })
  .chain((ids) => fc.tuple(...ids.map((id) => schemaPropertyArb(fc.constant(id)))));

/** Generates a SchemaPropertyUpdate payload (at least one field set). */
const schemaPropertyUpdateArb: fc.Arbitrary<SchemaPropertyUpdate> = fc.record({
  name: fc.option(fc.string({ minLength: 1, maxLength: 128 }), { nil: undefined }),
  data_type: fc.option(dataTypeArb, { nil: undefined }),
  description: fc.option(fc.string({ maxLength: 256 }), { nil: undefined }),
  property_type: fc.option(propertyTypeArb, { nil: undefined }),
  formula: fc.option(fc.string({ minLength: 1, maxLength: 128 }), { nil: undefined }),
}).filter((u) => Object.values(u).some((v) => v !== undefined));

// ---------------------------------------------------------------------------
// Property 6: 新增屬性更新列表
// ---------------------------------------------------------------------------

describe("Property 6: 新增屬性更新列表", () => {
  it("after creating a property, the store has one more item and the new property appears", async () => {
    await fc.assert(
      fc.asyncProperty(
        schemaPropertyCreateArb,
        schemaPropertyListArb,
        schemaTypeArb,
        async (createData, initialProps, schemaType) => {
          // Reset store with initial properties
          useSchemaStore.setState({ properties: initialProps, loading: false, error: null });
          const countBefore = initialProps.length;

          // The created property returned by the API
          const newId = Math.max(...initialProps.map((p) => p.id)) + 1;
          const createdProperty: SchemaProperty = {
            id: newId,
            project_id: "proj-1",
            schema_type: schemaType,
            name: createData.name,
            data_type: createData.data_type,
            description: createData.description ?? null,
            property_type: createData.property_type,
            formula: createData.formula ?? null,
            created_at: "2024-06-01T00:00:00Z",
          };

          // Mock fetch to return the created property
          globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve(createdProperty),
            text: () => Promise.resolve(JSON.stringify(createdProperty)),
          });

          await useSchemaStore.getState().addProperty("proj-1", schemaType, createData);

          const state = useSchemaStore.getState();
          // List should have grown by exactly one
          expect(state.properties).toHaveLength(countBefore + 1);
          // The new property should be in the list
          expect(state.properties.some((p) => p.id === newId)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: 更新屬性反映變更
// ---------------------------------------------------------------------------

describe("Property 8: 更新屬性反映變更", () => {
  it("after updating a property, the store reflects the updated values", async () => {
    await fc.assert(
      fc.asyncProperty(
        schemaPropertyListArb,
        schemaPropertyUpdateArb,
        schemaTypeArb,
        async (initialProps, updateData, schemaType) => {
          useSchemaStore.setState({ properties: initialProps, loading: false, error: null });

          // Pick the first property to update
          const target = initialProps[0];

          // Build the expected updated property
          const updatedProperty: SchemaProperty = {
            ...target,
            name: updateData.name ?? target.name,
            data_type: updateData.data_type ?? target.data_type,
            description: updateData.description !== undefined ? updateData.description : target.description,
            property_type: updateData.property_type ?? target.property_type,
            formula: updateData.formula !== undefined ? updateData.formula : target.formula,
          };

          globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve(updatedProperty),
            text: () => Promise.resolve(JSON.stringify(updatedProperty)),
          });

          await useSchemaStore.getState().updateProperty("proj-1", schemaType, target.id, updateData);

          const state = useSchemaStore.getState();
          // List length should remain the same
          expect(state.properties).toHaveLength(initialProps.length);
          // The updated property should reflect the new values
          const found = state.properties.find((p) => p.id === target.id);
          expect(found).toBeDefined();
          expect(found!.name).toBe(updatedProperty.name);
          expect(found!.data_type).toBe(updatedProperty.data_type);
          expect(found!.description).toBe(updatedProperty.description);
          expect(found!.property_type).toBe(updatedProperty.property_type);
          expect(found!.formula).toBe(updatedProperty.formula);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: 刪除屬性移除列表項目
// ---------------------------------------------------------------------------

describe("Property 9: 刪除屬性移除列表項目", () => {
  it("after deleting a property, it is removed and list length decreases by one", async () => {
    await fc.assert(
      fc.asyncProperty(
        schemaPropertyListArb,
        schemaTypeArb,
        async (initialProps, schemaType) => {
          useSchemaStore.setState({ properties: initialProps, loading: false, error: null });
          const countBefore = initialProps.length;

          // Pick a random property to delete (use the last one for simplicity)
          const targetIndex = Math.floor(Math.random() * initialProps.length);
          const target = initialProps[targetIndex];

          // Mock fetch for successful delete (204 No Content)
          globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 204,
            json: () => Promise.resolve(undefined),
            text: () => Promise.resolve(""),
          });

          await useSchemaStore.getState().removeProperty("proj-1", schemaType, target.id);

          const state = useSchemaStore.getState();
          // List length should decrease by one
          expect(state.properties).toHaveLength(countBefore - 1);
          // The deleted property should no longer be in the list
          expect(state.properties.some((p) => p.id === target.id)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
