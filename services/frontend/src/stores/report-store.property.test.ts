// Feature: analytics-frontend, Property 14: Report Submission Deduplication

import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
import { useReportStore } from "./report-store";
import type { JobStatus } from "@/types/api";

/**
 * **Validates: Requirements 9.4**
 *
 * Property-based test for report submission deduplication.
 * The ReportBuilder component uses an `isJobActive` guard:
 *   isJobActive = isSubmitting || (jobStatus !== null && status !== "completed" && status !== "failed")
 * When isJobActive is true, handleSubmit returns early — no new job is created.
 *
 * We test this guard logic directly against the Zustand store state,
 * verifying that for any store state where a job is active, the
 * deduplication check correctly identifies it as active and would
 * block a duplicate submission.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Replicates the isJobActive computation from ReportBuilder.
 * This is the deduplication guard that prevents duplicate submissions.
 */
function computeIsJobActive(isSubmitting: boolean, jobStatus: JobStatus | null): boolean {
  return (
    isSubmitting ||
    (jobStatus !== null &&
      jobStatus.status !== "completed" &&
      jobStatus.status !== "failed")
  );
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Active job statuses that should block new submissions. */
const activeJobStatusArb: fc.Arbitrary<JobStatus["status"]> = fc.constantFrom(
  "queued" as const,
  "running" as const,
);

/** Terminal job statuses that should allow new submissions. */
const terminalJobStatusArb: fc.Arbitrary<JobStatus["status"]> = fc.constantFrom(
  "completed" as const,
  "failed" as const,
);

/** All valid job statuses. */
const anyJobStatusArb: fc.Arbitrary<JobStatus["status"]> = fc.constantFrom(
  "queued" as const,
  "running" as const,
  "completed" as const,
  "failed" as const,
);

/** Generates a JobStatus object with a given status. */
const jobStatusArb = (statusArb: fc.Arbitrary<JobStatus["status"]>): fc.Arbitrary<JobStatus> =>
  fc.record({
    job_id: fc.stringMatching(/^job-[a-z0-9]{4,12}$/).filter((s) => s.length >= 5),
    status: statusArb,
    created_at: fc.constant(new Date().toISOString()),
  });

// ---------------------------------------------------------------------------
// Property 14: Report Submission Deduplication
// ---------------------------------------------------------------------------

describe("Property 14: Report Submission Deduplication", () => {
  beforeEach(() => {
    useReportStore.getState().reset();
  });

  it(
    "for any submission while isSubmitting is true, the duplicate is rejected " +
      "(isJobActive is true regardless of jobStatus)",
    () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            jobStatusArb(anyJobStatusArb),
          ),
          (jobStatus) => {
            const store = useReportStore.getState();
            store.setIsSubmitting(true);
            if (jobStatus !== null) {
              store.setJobStatus(jobStatus);
            }

            const state = useReportStore.getState();
            const isJobActive = computeIsJobActive(state.isSubmitting, state.jobStatus);

            // When isSubmitting is true, isJobActive must always be true
            // meaning duplicate submissions are rejected
            expect(isJobActive).toBe(true);

            // Reset for next iteration
            store.reset();
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "for any submission while jobStatus is queued or running, the duplicate " +
      "is rejected (isJobActive is true regardless of isSubmitting)",
    () => {
      fc.assert(
        fc.property(
          jobStatusArb(activeJobStatusArb),
          fc.boolean(),
          (activeStatus, isSubmitting) => {
            const store = useReportStore.getState();
            store.setIsSubmitting(isSubmitting);
            store.setJobStatus(activeStatus);

            const state = useReportStore.getState();
            const isJobActive = computeIsJobActive(state.isSubmitting, state.jobStatus);

            // When jobStatus is queued or running, isJobActive must be true
            expect(isJobActive).toBe(true);

            store.reset();
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "for any terminal or null jobStatus with isSubmitting false, submission " +
      "is allowed (isJobActive is false)",
    () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            jobStatusArb(terminalJobStatusArb),
          ),
          (jobStatus) => {
            const store = useReportStore.getState();
            store.setIsSubmitting(false);
            if (jobStatus !== null) {
              store.setJobStatus(jobStatus);
            }

            const state = useReportStore.getState();
            const isJobActive = computeIsJobActive(state.isSubmitting, state.jobStatus);

            // When not submitting and job is terminal/null, submissions are allowed
            expect(isJobActive).toBe(false);

            store.reset();
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
