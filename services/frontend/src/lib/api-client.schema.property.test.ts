// Feature: schema-management-ui, Property 1: API Client 端點正確性
// Feature: schema-management-ui, Property 2: API Client 錯誤傳播

import { describe, it, expect, vi, afterEach } from "vitest";
import fc from "fast-check";
import { BackendAPIClient, APIError } from "./api-client";

/**
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
 *
 * Property-based tests for BackendAPIClient schema methods.
 * - Property 1: Correct HTTP endpoint and method for each operation
 * - Property 2: Error propagation with matching statusCode
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = "http://test-api:8000";
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockOkFetch(status: number, body?: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(body ? JSON.stringify(body) : ""),
  });
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates non-empty project ID strings. */
const projectIdArb = fc
  .stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,19}$/)
  .filter((s) => s.length >= 1);

/** Generates valid schema types. */
const schemaTypeArb = fc.constantFrom("profile" as const, "event" as const);

/** Generates positive integer property IDs. */
const propertyIdArb = fc.integer({ min: 1, max: 999999 });

/** Generates HTTP error status codes (400-599). */
const errorStatusArb = fc.integer({ min: 400, max: 599 });

/** Generates a minimal valid SchemaPropertyCreate payload. */
const schemaPropertyCreateArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  data_type: fc.constantFrom("string", "integer", "boolean", "float", "date"),
  property_type: fc.constantFrom("static" as const, "dynamic" as const),
});

/** Generates a minimal SchemaPropertyUpdate payload. */
const schemaPropertyUpdateArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
});

/** Generates a mock SchemaProperty response. */
function mockSchemaProperty() {
  return {
    id: 1,
    project_id: "proj",
    schema_type: "profile",
    name: "test",
    data_type: "string",
    description: null,
    property_type: "static",
    formula: null,
    created_at: "2024-01-01T00:00:00Z",
  };
}

// ---------------------------------------------------------------------------
// Property 1: API Client 端點正確性
// ---------------------------------------------------------------------------

describe("Property 1: API Client 端點正確性", () => {
  it("listSchemaProperties calls GET on the correct endpoint", async () => {
    await fc.assert(
      fc.asyncProperty(projectIdArb, schemaTypeArb, async (projectId, schemaType) => {
        globalThis.fetch = mockOkFetch(200, []);
        const client = new BackendAPIClient(BASE_URL);

        await client.listSchemaProperties(projectId, schemaType);

        const expectedUrl = `${BASE_URL}/api/v1/projects/${projectId}/schemas/${schemaType}`;
        expect(globalThis.fetch).toHaveBeenCalledWith(
          expectedUrl,
          expect.objectContaining({
            headers: expect.objectContaining({ "Content-Type": "application/json" }),
          }),
        );
        // GET is the default — no explicit method should be set
        const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(callArgs.method).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it("createSchemaProperty calls POST on the correct endpoint", async () => {
    await fc.assert(
      fc.asyncProperty(
        projectIdArb,
        schemaTypeArb,
        schemaPropertyCreateArb,
        async (projectId, schemaType, data) => {
          globalThis.fetch = mockOkFetch(200, mockSchemaProperty());
          const client = new BackendAPIClient(BASE_URL);

          await client.createSchemaProperty(projectId, schemaType, data);

          const expectedUrl = `${BASE_URL}/api/v1/projects/${projectId}/schemas/${schemaType}`;
          expect(globalThis.fetch).toHaveBeenCalledWith(
            expectedUrl,
            expect.objectContaining({ method: "POST" }),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("updateSchemaProperty calls PUT on the correct endpoint", async () => {
    await fc.assert(
      fc.asyncProperty(
        projectIdArb,
        schemaTypeArb,
        propertyIdArb,
        schemaPropertyUpdateArb,
        async (projectId, schemaType, propertyId, data) => {
          globalThis.fetch = mockOkFetch(200, mockSchemaProperty());
          const client = new BackendAPIClient(BASE_URL);

          await client.updateSchemaProperty(projectId, schemaType, propertyId, data);

          const expectedUrl = `${BASE_URL}/api/v1/projects/${projectId}/schemas/${schemaType}/${propertyId}`;
          expect(globalThis.fetch).toHaveBeenCalledWith(
            expectedUrl,
            expect.objectContaining({ method: "PUT" }),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("deleteSchemaProperty calls DELETE on the correct endpoint", async () => {
    await fc.assert(
      fc.asyncProperty(
        projectIdArb,
        schemaTypeArb,
        propertyIdArb,
        async (projectId, schemaType, propertyId) => {
          globalThis.fetch = mockOkFetch(204);
          const client = new BackendAPIClient(BASE_URL);

          await client.deleteSchemaProperty(projectId, schemaType, propertyId);

          const expectedUrl = `${BASE_URL}/api/v1/projects/${projectId}/schemas/${schemaType}/${propertyId}`;
          expect(globalThis.fetch).toHaveBeenCalledWith(
            expectedUrl,
            expect.objectContaining({ method: "DELETE" }),
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: API Client 錯誤傳播
// ---------------------------------------------------------------------------

describe("Property 2: API Client 錯誤傳播", () => {
  it("listSchemaProperties throws APIError with matching statusCode for any error status", async () => {
    await fc.assert(
      fc.asyncProperty(
        projectIdArb,
        schemaTypeArb,
        errorStatusArb,
        async (projectId, schemaType, status) => {
          globalThis.fetch = mockOkFetch(status, null);
          const client = new BackendAPIClient(BASE_URL);

          try {
            await client.listSchemaProperties(projectId, schemaType);
            expect.unreachable("Should have thrown");
          } catch (err) {
            expect(err).toBeInstanceOf(APIError);
            expect((err as APIError).statusCode).toBe(status);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("createSchemaProperty throws APIError with matching statusCode for any error status", async () => {
    await fc.assert(
      fc.asyncProperty(
        projectIdArb,
        schemaTypeArb,
        errorStatusArb,
        schemaPropertyCreateArb,
        async (projectId, schemaType, status, data) => {
          globalThis.fetch = mockOkFetch(status, null);
          const client = new BackendAPIClient(BASE_URL);

          try {
            await client.createSchemaProperty(projectId, schemaType, data);
            expect.unreachable("Should have thrown");
          } catch (err) {
            expect(err).toBeInstanceOf(APIError);
            expect((err as APIError).statusCode).toBe(status);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("updateSchemaProperty throws APIError with matching statusCode for any error status", async () => {
    await fc.assert(
      fc.asyncProperty(
        projectIdArb,
        schemaTypeArb,
        propertyIdArb,
        errorStatusArb,
        schemaPropertyUpdateArb,
        async (projectId, schemaType, propertyId, status, data) => {
          globalThis.fetch = mockOkFetch(status, null);
          const client = new BackendAPIClient(BASE_URL);

          try {
            await client.updateSchemaProperty(projectId, schemaType, propertyId, data);
            expect.unreachable("Should have thrown");
          } catch (err) {
            expect(err).toBeInstanceOf(APIError);
            expect((err as APIError).statusCode).toBe(status);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("deleteSchemaProperty throws APIError with matching statusCode for any error status", async () => {
    await fc.assert(
      fc.asyncProperty(
        projectIdArb,
        schemaTypeArb,
        propertyIdArb,
        errorStatusArb,
        async (projectId, schemaType, propertyId, status) => {
          globalThis.fetch = mockOkFetch(status, null);
          const client = new BackendAPIClient(BASE_URL);

          try {
            await client.deleteSchemaProperty(projectId, schemaType, propertyId);
            expect.unreachable("Should have thrown");
          } catch (err) {
            expect(err).toBeInstanceOf(APIError);
            expect((err as APIError).statusCode).toBe(status);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
