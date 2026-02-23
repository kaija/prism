"use client";

import { useCallback, useEffect, useRef } from "react";
import { useReportStore, type ReportType } from "@/stores/report-store";
import { TimeframePicker } from "@/components/filters/timeframe-picker";
import { EventSelector } from "@/components/filters/event-selector";
import { ConditionBuilder } from "@/components/filters/condition-builder";
import { AggregationSelector } from "@/components/filters/aggregation-selector";
import { BackendAPIClient } from "@/lib/api-client";

const REPORT_TABS: { value: ReportType; label: string }[] = [
  { value: "trend", label: "Trend" },
  { value: "attribution", label: "Attribution" },
  { value: "cohort", label: "Cohort" },
];

const POLL_INTERVAL_MS = 2000;

const styles = {
  container: {
    fontFamily: "var(--font-family)",
    maxWidth: 720,
  } as React.CSSProperties,
  tabs: {
    display: "flex",
    gap: 0,
    marginBottom: 24,
    borderBottom: "2px solid var(--border-color)",
  } as React.CSSProperties,
  tab: (active: boolean) =>
    ({
      padding: "10px 20px",
      cursor: "pointer",
      border: "none",
      background: "none",
      fontFamily: "var(--font-family)",
      fontSize: 14,
      fontWeight: active ? 600 : 400,
      color: active ? "var(--primary)" : "var(--text-default)",
      borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
      marginBottom: -2,
    }) as React.CSSProperties,
  section: {
    marginBottom: 20,
  } as React.CSSProperties,
  submitButton: (disabled: boolean) =>
    ({
      padding: "10px 28px",
      borderRadius: "var(--radius-sm)",
      border: "none",
      background: disabled ? "var(--text-muted)" : "var(--primary)",
      color: "#fff",
      fontSize: 14,
      fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "var(--font-family)",
      marginTop: 8,
    }) as React.CSSProperties,
  statusCard: {
    marginTop: 20,
    padding: "14px 20px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border-color)",
    background: "var(--bg-card)",
    fontSize: 14,
  } as React.CSSProperties,
  spinner: {
    display: "inline-block",
    width: 14,
    height: 14,
    border: "2px solid var(--border-color)",
    borderTop: "2px solid var(--primary)",
    borderRadius: "50%",
    animation: "report-spin 0.8s linear infinite",
    marginRight: 8,
    verticalAlign: "middle",
  } as React.CSSProperties,
  errorText: {
    color: "var(--danger)",
    marginTop: 12,
    fontSize: 14,
  } as React.CSSProperties,
  successText: {
    color: "var(--success)",
  } as React.CSSProperties,
};

export function ReportBuilder({ projectId, initialType }: { projectId: string; initialType?: ReportType }) {
  const {
    reportType,
    timeframe,
    eventSelection,
    conditions,
    aggregation,
    jobId,
    jobStatus,
    isSubmitting,
    error,
    setReportType,
    setTimeframe,
    setEventSelection,
    setConditions,
    setAggregation,
    setJobId,
    setJobStatus,
    setIsSubmitting,
    setError,
    buildRequest,
  } = useReportStore();

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const apiRef = useRef(new BackendAPIClient());

  // Set initial report type from prop
  useEffect(() => {
    if (initialType) {
      setReportType(initialType);
    }
  }, [initialType, setReportType]);

  const isJobActive =
    isSubmitting ||
    (jobStatus !== null &&
      jobStatus.status !== "completed" &&
      jobStatus.status !== "failed");

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollJob = useCallback(
    (id: string) => {
      stopPolling();
      pollingRef.current = setInterval(async () => {
        try {
          const status = await apiRef.current.getJobStatus(id);
          setJobStatus(status);
          if (status.status === "completed" || status.status === "failed") {
            stopPolling();
            if (status.status === "failed") {
              setError(status.error ?? "Report generation failed");
            }
          }
        } catch (err) {
          stopPolling();
          setError(
            err instanceof Error ? err.message : "Failed to check job status"
          );
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling, setJobStatus, setError]
  );

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const handleSubmit = async () => {
    if (isJobActive) return;

    setError(null);
    setIsSubmitting(true);
    setJobStatus(null);

    try {
      const request = buildRequest();
      const response = await apiRef.current.submitReport(projectId, request);
      setJobId(response.job_id);
      setJobStatus({
        job_id: response.job_id,
        status: "queued",
        created_at: new Date().toISOString(),
      });
      setIsSubmitting(false);
      pollJob(response.job_id);
    } catch (err) {
      setIsSubmitting(false);
      setError(
        err instanceof Error ? err.message : "Failed to submit report"
      );
    }
  };

  return (
    <div style={styles.container}>
      {/* Spinner keyframes */}
      <style>{`@keyframes report-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Report type tabs */}
      <div style={styles.tabs} role="tablist" aria-label="Report type">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={reportType === tab.value}
            style={styles.tab(reportType === tab.value)}
            onClick={() => setReportType(tab.value)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter sections */}
      <div style={styles.section}>
        <TimeframePicker value={timeframe} onChange={setTimeframe} />
      </div>

      <div style={styles.section}>
        <EventSelector value={eventSelection} onChange={setEventSelection} />
      </div>

      <div style={styles.section}>
        <ConditionBuilder value={conditions} onChange={setConditions} />
      </div>

      <div style={styles.section}>
        <AggregationSelector value={aggregation} onChange={setAggregation} />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isJobActive}
        style={styles.submitButton(isJobActive)}
        type="button"
        aria-busy={isJobActive}
      >
        {isSubmitting ? "Submitting…" : isJobActive ? "Running…" : "Run Report"}
      </button>

      {/* Job status display */}
      {jobStatus && (
        <div style={styles.statusCard}>
          {(jobStatus.status === "queued" || jobStatus.status === "running") && (
            <span>
              <span style={styles.spinner} aria-hidden="true" />
              Report is {jobStatus.status}…
            </span>
          )}
          {jobStatus.status === "completed" && (
            <span style={styles.successText}>
              Report completed successfully.
            </span>
          )}
          {jobStatus.status === "failed" && (
            <span style={{ color: "#e74c3c" }}>
              Report failed: {jobStatus.error ?? "Unknown error"}
            </span>
          )}
        </div>
      )}

      {/* Error display (submission errors) */}
      {error && !jobStatus && (
        <p style={styles.errorText}>{error}</p>
      )}
    </div>
  );
}
