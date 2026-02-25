// Feature: segment-management-ui, Property 1: API Client 端點正確性
// Feature: segment-management-ui, Property 2: API Client 錯誤傳播

import { describe, it, expect, vi, afterEach } from "vitest";
import fc from "fast-check";
import { BackendAPIClient, APIError } from "./api-client";

/**
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
 *
 * Property-based tests for BackendAPIClient segment methods.
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

const projectIdArb = fc
  .stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,19}$/)
  .filter((s) => s.length >= 1);

const segmentIdArb = fc.uuid();

const pageArb = fc.integer({ min: 1, max: 1000 });
const pageSizeArb = fc.integer({ min: 1, max: 100 });

const errorStatusArb = fc.integer({ min: 400, max: 599 });

const segmentCreateArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  dsl: fc.string({ minLength: 1, maxLength: 100 }),
  timeframe: fc.oneof(
    fc.record({
      type: fc.constant("relative" as const),
      relative: fc.constantFrom("last_7_days", "last_30_days"),
    }),
    fc.record({
      type: fc.constant("absolute" as const),
      start: fc.nat(),
      end: fc.nat(),
    }),
  ),
});

const segmentUpdateArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
});

const dslExpressionArb = fc.string({ minLength: 1, maxLength: 200 });

function mockSegmentResponse() {
  return {
    segment_id: "seg-1",
    project_id: "proj-1",
    name: "test",
    dsl: 'EQ(PROFILE("age"), 25)',
    timeframe: { type: "relative", relative: "last_30_days" },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };
}

// ---------------------------------------------------------------------------
// Property 1: API Client 端點正確性
// ---------------------------------------------------------------------------

describe("Property 1: API Client 端點正確性 (Segments)", () => {
  it("listSegments calls GET on the correct endpoint", async () => {
    await fc.assert(
      fc.asyncProperty(projectIdArb, pageArb, pageSizeArb, async (projectId, page, pageSize) => {
        globalThis.fetch = mockOkFetch(200, { items: [], total: 0, page, page_size: pageSize });
        const client = new BackendAPIClient(BASE_URL);

        await client.listSegments(projectId, page, pageSize);

        const expectedUrl = `${BASE_URL}/api/v1/projects/${projectId}/segments?page=${page}&page_size=${pageSize}`;
        expect(globalThis.fetch).toHaveBeenCalledWith(
          expectedUrl,
          expect.objectContaining({
            headers: expect.objectContaining({ "Content-Type": "application/json" }),
          }),
        );
        const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(callArgs.method).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it("createSegment calls POST on the correct endpoint", async () => {
    await fc.assert(
      fc.asyncProperty(projectIdArb, segmentCreateArb, async (projectId, data) => {
        globalThis.fetch = mockOkFetch(200, mockSegmentResponse());
        const client = new BackendAPIClient(BASE_URL);

        await client.createSegment(projectId, data);

        const expectedUrl = `${BASE_URL}/api/v1/projects/${projectId}/segments`;
        expect(globalThis.fetch).toHaveBeenCalledWith(
          expectedUrl,
          expect.objectContaining({ method: "POST" }),
        );
      }),
      { numRuns: 100 },
    );
  });

  it("getSegment calls GET on the correct endpoint", async () => {
    await fc.assert(
      fc.asyncProperty(projectIdArb, segmentIdArb, async (projectId, segmentId) => {
        globalThis.fetch = mockOkFetch(200, mockSegmentResponse());
        const client = new BackendAPIClient(BASE_URL);

        await client.getSegment(projectId, segmentId);

        const expectedUrl = `${BASE_URL}/api/v1/projects/${projectId}/segments/${segmentId}`;
        expect(globalThis.fetch).toHaveBeenCalledWith(
          expectedUrl,
          expect.objectContaining({
            headers: expect.objectContaining({ "Content-Type": "application/json" }),
          }),
        );
        const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(callArgs.method).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it("updateSegment calls PUT on the correct endpoint", async () => {
    await fc.assert(
      fc.asyncProperty(projectIdArb, segmentIdArb, segmentUpdateArb, async (projectId, segmentId, data) => {
        globalThis.fetch = mockOkFetch(200, mockSegmentResponse());
        const client = new BackendAPIClient(BASE_URL);

        await client.updateSegment(projectId, segmentId, data);

        const expectedUrl = `${BASE_URL}/api/v1/projects/${projectId}/segments/${segmentId}`;
        expect(globalThis.fetch).toHaveBeenCalledWith(
          expectedUrl,
          expect.objectContaining({ method: "PUT" }),
        );
      }),
      { numRuns: 100 },
    );
  });

  it("deleteSegment calls DELETE on the correct endpoint", async () => {
    await fc.assert(
      fc.asyncProperty(projectIdArb, segmentIdArb, async (projectId, segmentId) => {
        globalThis.fetch = mockOkFetch(204);
        const client = new BackendAPIClient(BASE_URL);

        await client.deleteSegment(projectId, segmentId);

        const expectedUrl = `${BASE_URL}/api/v1/projects/${projectId}/segments/${segmentId}`;
        expect(globalThis.fetch).toHaveBeenCalledWith(
          expectedUrl,
          expect.objectContaining({ method: "DELETE" }),
        );
      }),
      { numRuns: 100 },
    );
  });

  it("validateDsl calls POST on the correct endpoint", async () => {
    await fc.assert(
      fc.asyncProperty(dslExpressionArb, async (expression) => {
        globalThis.fetch = mockOkFetch(200, { valid: true });
        const client = new BackendAPIClient(BASE_URL);

        await client.validateDsl(expression);

        const expectedUrl = `${BASE_URL}/api/v1/dsl/validate`;
        expect(globalThis.fetch).toHaveBeenCalledWith(
          expectedUrl,
          expect.objectContaining({ method: "POST" }),
        );
        const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(JSON.parse(callArgs.body)).toEqual({ expression });
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: API Client 錯誤傳播
// ---------------------------------------------------------------------------

describe("Property 2: API Client 錯誤傳播 (Segments)", () => {
  it("listSegments throws APIError with matching statusCode for any error status", async () => {
    await fc.assert(
      fc.asyncProperty(
        projectIdArb,
        pageArb,
        pageSizeArb,
        errorStatusArb,
        async (projectId, page, pageSize, status) => {
          globalThis.fetch = mockOkFetch(status, null);
          const client = new BackendAPIClient(BASE_URL);

          try {
            await client.listSegments(projectId, page, pageSize);
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

  it("createSegment throws APIError with matching statusCode for any error status", async () => {
    await fc.assert(
      fc.asyncProperty(
        projectIdArb,
        errorStatusArb,
        segmentCreateArb,
        async (projectId, status, data) => {
          globalThis.fetch = mockOkFetch(status, null);
          const client = new BackendAPIClient(BASE_URL);

          try {
            await client.createSegment(projectId, data);
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

  it("getSegment throws APIError with matching statusCode for any error status", async () => {
    await fc.assert(
      fc.asyncProperty(
        projectIdArb,
        segmentIdArb,
        errorStatusArb,
        async (projectId, segmentId, status) => {
          globalThis.fetch = mockOkFetch(status, null);
          const client = new BackendAPIClient(BASE_URL);

          try {
            await client.getSegment(projectId, segmentId);
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

  it("updateSegment throws APIError with matching statusCode for any error status", async () => {
    await fc.assert(
      fc.asyncProperty(
        projectIdArb,
        segmentIdArb,
        errorStatusArb,
        segmentUpdateArb,
        async (projectId, segmentId, status, data) => {
          globalThis.fetch = mockOkFetch(status, null);
          const client = new BackendAPIClient(BASE_URL);

          try {
            await client.updateSegment(projectId, segmentId, data);
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

  it("deleteSegment throws APIError with matching statusCode for any error status", async () => {
    await fc.assert(
      fc.asyncProperty(
        projectIdArb,
        segmentIdArb,
        errorStatusArb,
        async (projectId, segmentId, status) => {
          globalThis.fetch = mockOkFetch(status, null);
          const client = new BackendAPIClient(BASE_URL);

          try {
            await client.deleteSegment(projectId, segmentId);
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

  it("validateDsl throws APIError with matching statusCode for any error status", async () => {
    await fc.assert(
      fc.asyncProperty(
        dslExpressionArb,
        errorStatusArb,
        async (expression, status) => {
          globalThis.fetch = mockOkFetch(status, null);
          const client = new BackendAPIClient(BASE_URL);

          try {
            await client.validateDsl(expression);
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
