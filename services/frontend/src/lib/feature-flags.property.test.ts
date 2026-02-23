// Feature: analytics-frontend, Property 11: Feature Flag Toggle Round-Trip
// Feature: analytics-frontend, Property 12: Feature Flag UI Visibility

import { describe, it, expect, vi, afterEach } from "vitest";
import fc from "fast-check";
import { BackendAPIClient } from "./api-client";
import { isFeatureEnabled } from "./feature-flags";

/**
 * **Validates: Requirements 7.2, 7.3**
 *
 * Property-based tests for feature flag toggle round-trip and UI visibility.
 * We mock globalThis.fetch to simulate Backend API responses, matching the
 * pattern used in api-client.test.ts.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = "http://test-api:8000";
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates valid feature flag keys (alphanumeric + underscores). */
const flagKeyArb = fc
  .stringMatching(/^[a-z][a-z0-9_]{0,29}$/)
  .filter((s) => s.length >= 1);

/** Generates a project ID. */
const projectIdArb = fc
  .stringMatching(/^[a-z][a-z0-9]{3,11}$/)
  .filter((s) => s.length >= 4);

// ---------------------------------------------------------------------------
// Property 11: Feature Flag Toggle Round-Trip
// ---------------------------------------------------------------------------

describe("Property 11: Feature Flag Toggle Round-Trip", () => {
  it(
    "for any flag key and boolean value, after setFeatureFlag the next " +
      "getFeatureFlags returns the updated value",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          projectIdArb,
          flagKeyArb,
          fc.boolean(),
          async (projectId, flagKey, flagValue) => {
            const stringValue = String(flagValue);
            let callCount = 0;

            globalThis.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
              callCount++;
              const method = options?.method ?? "GET";

              // First call: PUT (setFeatureFlag)
              if (method === "PUT") {
                return Promise.resolve({
                  ok: true,
                  status: 204,
                  json: () => Promise.resolve(undefined),
                  text: () => Promise.resolve(""),
                });
              }

              // Second call: GET (getFeatureFlags) — returns updated flags
              return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ [flagKey]: stringValue }),
                text: () => Promise.resolve(JSON.stringify({ [flagKey]: stringValue })),
              });
            });

            const client = new BackendAPIClient(BASE_URL);

            // Toggle the flag
            await client.setFeatureFlag(projectId, flagKey, stringValue);

            // Query the flags
            const flags = await client.getFeatureFlags(projectId);

            // The queried value should match what was set
            expect(flags[flagKey]).toBe(stringValue);
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});

// ---------------------------------------------------------------------------
// Property 12: Feature Flag UI Visibility
// ---------------------------------------------------------------------------

describe("Property 12: Feature Flag UI Visibility", () => {
  it(
    "for any flag state (enabled or disabled), isFeatureEnabled returns " +
      "the correct boolean",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          projectIdArb,
          flagKeyArb,
          fc.boolean(),
          async (projectId, flagKey, enabled) => {
            const flagsResponse: Record<string, string> = {
              [flagKey]: String(enabled),
            };

            globalThis.fetch = vi.fn().mockResolvedValue({
              ok: true,
              status: 200,
              json: () => Promise.resolve(flagsResponse),
              text: () => Promise.resolve(JSON.stringify(flagsResponse)),
            });

            const result = await isFeatureEnabled(projectId, flagKey);

            // isFeatureEnabled checks flags[flagKey] === "true"
            expect(result).toBe(enabled);
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "for any flag key that is absent from the response, isFeatureEnabled " +
      "returns false",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          projectIdArb,
          flagKeyArb,
          async (projectId, flagKey) => {
            // Return an empty flags object — the key is missing
            globalThis.fetch = vi.fn().mockResolvedValue({
              ok: true,
              status: 200,
              json: () => Promise.resolve({}),
              text: () => Promise.resolve("{}"),
            });

            const result = await isFeatureEnabled(projectId, flagKey);
            expect(result).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
