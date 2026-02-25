// Feature: segment-management-ui, Property 5: 空白名稱驗證

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useSegmentStore } from "@/stores/segment-store";

/**
 * **Validates: Requirements 4.3**
 *
 * Property 5: For any string consisting only of whitespace characters as the
 * name field value, the Segment_Editor should prevent form submission and show
 * a validation error.
 */

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

const originalFetch = globalThis.fetch;

beforeEach(() => {
  // Mock fetch for loadProperties
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve([]),
    text: () => Promise.resolve("[]"),
  });

  useSegmentStore.getState().resetForm();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  cleanup();
});

// Generator for whitespace-only strings
const whitespaceOnlyArb = fc
  .array(fc.constantFrom(" ", "\t", "\n", "\r", "  ", "\t\t"), { minLength: 0, maxLength: 10 })
  .map((parts) => parts.join(""));

describe("Property 5: 空白名稱驗證", () => {
  it("for any whitespace-only name, form submission is prevented and validation error is shown", async () => {
    const { SegmentRuleEditor } = await import("./segment-rule-editor");

    await fc.assert(
      fc.asyncProperty(whitespaceOnlyArb, async (whitespaceName) => {
        cleanup();

        // Reset store state
        useSegmentStore.getState().resetForm();

        render(<SegmentRuleEditor projectId="proj-1" />);

        // Set the name to whitespace-only value
        const nameInput = screen.getByTestId("segment-name-input");
        fireEvent.change(nameInput, { target: { value: whitespaceName } });

        // Click save
        const saveBtn = screen.getByTestId("save-btn");
        fireEvent.click(saveBtn);

        // Validation error should appear
        await waitFor(() => {
          const nameError = screen.getByTestId("name-error");
          expect(nameError).toBeDefined();
          expect(nameError.textContent).toBeTruthy();
        });

        // saveSegment should NOT have been called (check saving state is still false)
        expect(useSegmentStore.getState().saving).toBe(false);
      }),
      { numRuns: 100 },
    );
  }, 30000);
});
