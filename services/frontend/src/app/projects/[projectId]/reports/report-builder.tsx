"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReportStore, type ReportType } from "@/stores/report-store";
import { TimeframePicker } from "@/components/filters/timeframe-picker";
import { EventSelector } from "@/components/filters/event-selector";
import { ConditionBuilder } from "@/components/filters/condition-builder";
import { AggregationSelector } from "@/components/filters/aggregation-selector";
import { SegmentSelector } from "@/components/filters/segment-selector";
import { IntervalSelector } from "@/components/filters/interval-selector";
import { CompareBySelector } from "@/components/filters/compare-by-selector";
import { MeasureBySelector } from "@/components/filters/measure-by-selector";
import { TrendChart } from "@/components/reports/trend-chart";
import { TrendDataTable } from "@/components/reports/trend-data-table";
import { BackendAPIClient } from "@/lib/api-client";
import type { SegmentOption, DimensionOption, MeasureMetric, TrendResult, TrendTableColumn, TrendTableRow } from "@/types/api";

const REPORT_TABS: { value: ReportType; label: string }[] = [
  { value: "trend", label: "Trend" },
  { value: "attribution", label: "Attribution" },
  { value: "cohort", label: "Cohort" },
];

const POLL_INTERVAL_MS = 2000;

// Sample data for selectors (would come from backend in a real app)
const AVAILABLE_SEGMENTS: SegmentOption[] = [
  { id: "new_users", label: "New Users" },
  { id: "returning_users", label: "Returning Users" },
  { id: "power_users", label: "Power Users" },
];

const AVAILABLE_DIMENSIONS: DimensionOption[] = [
  { key: "country", label: "Country" },
  { key: "device", label: "Device" },
  { key: "browser", label: "Browser" },
  { key: "os", label: "OS" },
];

const AVAILABLE_METRICS: MeasureMetric[] = [
  { key: "people", label: "People" },
  { key: "actions", label: "Actions" },
  { key: "scroll_depth", label: "Scroll depth" },
  { key: "session_duration", label: "Session duration" },
];

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
  saveButton: {
    padding: "10px 28px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    background: "var(--bg-card)",
    color: "var(--text-default)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "var(--font-family)",
    marginTop: 8,
    marginLeft: 8,
  } as React.CSSProperties,
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
  resultsSection: {
    marginTop: 24,
  } as React.CSSProperties,
  buttonRow: {
    display: "flex",
    alignItems: "center",
  } as React.CSSProperties,
};

/** Convert a TrendResult into table columns and rows for the data table. */
function buildTableData(
  data: TrendResult,
  compareBy: string[],
): { columns: TrendTableColumn[]; rows: TrendTableRow[] } {
  if (!data.series.length) return { columns: [], rows: [] };

  // Group by label
  const groups = new Map<string, { timestamp: number; value: number }[]>();
  for (const pt of data.series) {
    const key = pt.label ?? "All";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ timestamp: pt.timestamp, value: pt.value });
  }

  // Collect unique timestamps for column headers
  const timestamps = [...new Set(data.series.map((p) => p.timestamp))].sort((a, b) => a - b);
  const timeCols: TrendTableColumn[] = timestamps.map((ts) => {
    const d = new Date(ts);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { key: String(ts), label };
  });

  const dimensionCol: TrendTableColumn = {
    key: "dimension",
    label: compareBy.length > 0 ? compareBy[0] : "Segment",
  };

  const columns = [dimensionCol, ...timeCols];

  const rows: TrendTableRow[] = [...groups.entries()].map(([label, points]) => {
    const values: Record<string, number | string> = {};
    for (const pt of points) {
      values[String(pt.timestamp)] = pt.value;
    }
    return { dimensionValue: label, values };
  });

  return { columns, rows };
}

export function ReportBuilder({ projectId, initialType }: { projectId: string; initialType?: ReportType }) {
  const {
    reportType,
    timeframe,
    eventSelection,
    conditions,
    aggregation,
    segments,
    interval,
    compareBy,
    measureBy,
    comparisonEnabled,
    comparisonTimeframe,
    jobId,
    jobStatus,
    isSubmitting,
    error,
    setReportType,
    setTimeframe,
    setEventSelection,
    setConditions,
    setAggregation,
    setSegments,
    setInterval,
    setCompareBy,
    setMeasureBy,
    setComparisonEnabled,
    setComparisonTimeframe,
    setJobId,
    setJobStatus,
    setIsSubmitting,
    setError,
    buildRequest,
  } = useReportStore();

  const pollingRef = useRef<ReturnType<typeof globalThis.setInterval> | null>(null);
  const apiRef = useRef(new BackendAPIClient());
  const [trendResult, setTrendResult] = useState<TrendResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Set initial report type from prop
  useEffect(() => {
    if (initialType) {
      setReportType(initialType);
    }
  }, [initialType, setReportType]);

  const isTrend = reportType === "trend";

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
      pollingRef.current = globalThis.setInterval(async () => {
        try {
          const status = await apiRef.current.getJobStatus(id);
          setJobStatus(status);
          if (status.status === "completed" || status.status === "failed") {
            stopPolling();
            if (status.status === "completed" && status.result) {
              setTrendResult(status.result as unknown as TrendResult);
            }
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

  const handleComparisonChange = (enabled: boolean, tf: import("@/types/api").Timeframe | null) => {
    setComparisonEnabled(enabled);
    setComparisonTimeframe(tf);
  };

  const handleSaveReport = async () => {
    const name = globalThis.prompt("Enter a name for this report:");
    if (!name || !name.trim()) return;

    setSaveStatus(null);
    try {
      const request = buildRequest();
      await apiRef.current.saveReport(projectId, {
        name: name.trim(),
        report_type: reportType,
        query_params: request as unknown as Record<string, unknown>,
      });
      setSaveStatus("Report saved successfully.");
    } catch (err) {
      setSaveStatus(
        err instanceof Error ? err.message : "Failed to save report"
      );
    }
  };

  const tableData = trendResult ? buildTableData(trendResult, compareBy) : null;

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
        <TimeframePicker
          value={timeframe}
          onChange={setTimeframe}
          comparisonEnabled={isTrend ? comparisonEnabled : undefined}
          comparisonTimeframe={isTrend ? comparisonTimeframe : undefined}
          onComparisonChange={isTrend ? handleComparisonChange : undefined}
        />
      </div>

      {isTrend && (
        <div style={styles.section}>
          <SegmentSelector
            value={segments}
            onChange={setSegments}
            availableSegments={AVAILABLE_SEGMENTS}
          />
        </div>
      )}

      <div style={styles.section}>
        <EventSelector value={eventSelection} onChange={setEventSelection} />
      </div>

      {isTrend && (
        <div style={styles.section}>
          <IntervalSelector value={interval} onChange={setInterval} />
        </div>
      )}

      {isTrend && (
        <div style={styles.section}>
          <CompareBySelector
            value={compareBy}
            onChange={setCompareBy}
            availableDimensions={AVAILABLE_DIMENSIONS}
          />
        </div>
      )}

      {isTrend && (
        <div style={styles.section}>
          <MeasureBySelector
            value={measureBy}
            onChange={setMeasureBy}
            availableMetrics={AVAILABLE_METRICS}
          />
        </div>
      )}

      {!isTrend && (
        <>
          <div style={styles.section}>
            <ConditionBuilder value={conditions} onChange={setConditions} />
          </div>
          <div style={styles.section}>
            <AggregationSelector value={aggregation} onChange={setAggregation} />
          </div>
        </>
      )}

      {/* Submit + Save buttons */}
      <div style={styles.buttonRow}>
        <button
          onClick={handleSubmit}
          disabled={isJobActive}
          style={styles.submitButton(isJobActive)}
          type="button"
          aria-busy={isJobActive}
        >
          {isSubmitting ? "Submitting…" : isJobActive ? "Running…" : "Run Report"}
        </button>

        {isTrend && (
          <button
            onClick={handleSaveReport}
            style={styles.saveButton}
            type="button"
          >
            Save Report
          </button>
        )}
      </div>

      {saveStatus && (
        <p style={{ marginTop: 8, fontSize: 14, color: "var(--text-default)" }}>{saveStatus}</p>
      )}

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

      {/* Trend results: chart + data table */}
      {isTrend && trendResult && (
        <div style={styles.resultsSection}>
          <TrendChart data={trendResult} />
          {tableData && tableData.rows.length > 0 && (
            <TrendDataTable
              data={tableData.rows}
              columns={tableData.columns}
            />
          )}
        </div>
      )}
    </div>
  );
}
