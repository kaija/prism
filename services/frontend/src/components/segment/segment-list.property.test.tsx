// Feature: segment-management-ui, Property 3: Segment 表格列完整性
// Feature: segment-management-ui, Property 4: 刪除 Segment 移除列表項目

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { useSegmentStore } from "@/stores/segment-store";
import type { SegmentResponse } from "@/types/api";

/**
 * **Validates: Requirements 3.2, 3.8**
 *
 * Property 3: For any SegmentResponse, the rendered table row should contain
 * the segment's name, description, and created_at information.
 *
 * Property 4: For any segment in the list, after confirming deletion, the
 * segment should be removed and list length should decrease by one.
 */

// We need to lazy-import the component after mocking next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  cleanup();
});

beforeEach(() => {
  useSegmentStore.setState({
    segments: [],
    totalSegments: 0,
    listLoading: false,
    listError: null,
  });
});

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const visibleString = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => s.trim().length > 0);

const isoDateArb = fc
  .integer({ min: 1577836800000, max: 1924905600000 })
  .map((ts) => new Date(ts).toISOString());

function segmentResponseArb(
  idArb: fc.Arbitrary<string> = fc.uuid(),
): fc.Arbitrary<SegmentResponse> {
  return fc.record({
    segment_id: idArb,
    project_id: fc.constant("proj-1"),
    name: visibleString,
    description: fc.option(visibleString, { nil: undefined }),
    dsl: fc.constant('EQ(PROFILE("age"), 25)'),
    timeframe: fc.constant({
      type: "relative" as const,
      relative: "last_30_days",
    }),
    created_at: isoDateArb,
    updated_at: isoDateArb,
  });
}

const segmentListArb = fc
  .uniqueArray(fc.uuid(), { minLength: 1, maxLength: 5 })
  .chain((ids) =>
    fc.tuple(...ids.map((id) => segmentResponseArb(fc.constant(id)))),
  );

// ---------------------------------------------------------------------------
// Property 3: Segment 表格列完整性
// ---------------------------------------------------------------------------

describe("Property 3: Segment 表格列完整性", () => {
  it("for any SegmentResponse, the rendered table row contains name, description, and created_at", async () => {
    const { SegmentListClient } = await import(
      "@/app/projects/[projectId]/settings/segments/segment-list-client"
    );

    await fc.assert(
      fc.asyncProperty(segmentListArb, async (segments) => {
        cleanup();

        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({ items: segments, total: segments.length }),
          text: () =>
            Promise.resolve(
              JSON.stringify({ items: segments, total: segments.length }),
            ),
        });

        render(<SegmentListClient projectId="proj-1" />);

        await waitFor(() => {
          expect(screen.getByTestId("segment-table")).toBeDefined();
        });

        for (const segment of segments) {
          const row = screen.getByTestId(
            `segment-row-${segment.segment_id}`,
          );
          const cells = row.querySelectorAll("td");
          // cells[0] = name, cells[1] = description, cells[2] = created_at, cells[3] = actions
          expect(cells[0].textContent).toBe(segment.name);

          if (segment.description) {
            expect(cells[1].textContent).toBe(segment.description);
          } else {
            expect(cells[1].textContent).toBe("—");
          }

          const formattedDate = new Date(
            segment.created_at,
          ).toLocaleDateString();
          expect(cells[2].textContent).toBe(formattedDate);
        }
      }),
      { numRuns: 50 },
    );
  }, 30000);
});

// ---------------------------------------------------------------------------
// Property 4: 刪除 Segment 移除列表項目
// ---------------------------------------------------------------------------

describe("Property 4: 刪除 Segment 移除列表項目", () => {
  it("after confirming deletion, the segment is removed and list length decreases by one", async () => {
    await fc.assert(
      fc.asyncProperty(segmentListArb, async (segments) => {
        useSegmentStore.setState({
          segments: [...segments],
          totalSegments: segments.length,
          listLoading: false,
          listError: null,
        });

        const countBefore = segments.length;
        const targetIndex = Math.floor(Math.random() * segments.length);
        const target = segments[targetIndex];

        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 204,
          json: () => Promise.resolve(undefined),
          text: () => Promise.resolve(""),
        });

        await useSegmentStore
          .getState()
          .removeSegment("proj-1", target.segment_id);

        const state = useSegmentStore.getState();
        expect(state.segments).toHaveLength(countBefore - 1);
        expect(
          state.segments.some((s) => s.segment_id === target.segment_id),
        ).toBe(false);
      }),
      { numRuns: 100 },
    );
  }, 30000);
});
