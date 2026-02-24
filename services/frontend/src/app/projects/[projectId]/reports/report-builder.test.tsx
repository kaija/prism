import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useReportStore } from "@/stores/report-store";

const mockSubmitReport = vi.fn();
const mockGetJobStatus = vi.fn();
const mockSaveReport = vi.fn();

vi.mock("@/lib/api-client", () => ({
  BackendAPIClient: class {
    submitReport = mockSubmitReport;
    getJobStatus = mockGetJobStatus;
    saveReport = mockSaveReport;
  },
}));

import { ReportBuilder } from "./report-builder";

describe("ReportBuilder", () => {
  beforeEach(() => {
    useReportStore.getState().reset();
    mockSubmitReport.mockReset();
    mockGetJobStatus.mockReset();
    mockSaveReport.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders three report type tabs", () => {
    render(<ReportBuilder projectId="proj-1" />);
    expect(screen.getByRole("tab", { name: "Trend" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Attribution" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Cohort" })).toBeDefined();
  });

  it("Trend tab is selected by default", () => {
    render(<ReportBuilder projectId="proj-1" />);
    const trendTab = screen.getByRole("tab", { name: "Trend" });
    expect(trendTab.getAttribute("aria-selected")).toBe("true");
  });

  it("switching tabs updates the store report type", () => {
    render(<ReportBuilder projectId="proj-1" />);
    fireEvent.click(screen.getByRole("tab", { name: "Cohort" }));
    expect(useReportStore.getState().reportType).toBe("cohort");
  });

  it("renders common filter components for trend report", () => {
    render(<ReportBuilder projectId="proj-1" />);
    expect(screen.getByText("Timeframe")).toBeDefined();
    expect(screen.getByText("Events")).toBeDefined();
  });

  it("renders trend-specific filter components", () => {
    render(<ReportBuilder projectId="proj-1" />);
    expect(screen.getByText("Performed by")).toBeDefined();
    expect(screen.getByText("Interval")).toBeDefined();
    expect(screen.getByText("Compare by")).toBeDefined();
    expect(screen.getByText("Measure by")).toBeDefined();
  });

  it("renders Filters and Aggregation for non-trend report types", () => {
    render(<ReportBuilder projectId="proj-1" />);
    fireEvent.click(screen.getByRole("tab", { name: "Attribution" }));
    expect(screen.getByText("Filters")).toBeDefined();
    expect(screen.getByText("Aggregation")).toBeDefined();
  });

  it("renders Save Report button for trend report", () => {
    render(<ReportBuilder projectId="proj-1" />);
    expect(screen.getByText("Save Report")).toBeDefined();
  });

  it("renders Run Report button", () => {
    render(<ReportBuilder projectId="proj-1" />);
    expect(screen.getByText("Run Report")).toBeDefined();
  });

  it("shows error message when submission fails", async () => {
    mockSubmitReport.mockRejectedValue(new Error("Network error"));

    render(<ReportBuilder projectId="proj-1" />);

    await act(async () => {
      fireEvent.click(screen.getByText("Run Report"));
    });

    expect(screen.getByText("Network error")).toBeDefined();
  });

  it("submits report and shows completed status after polling", async () => {
    vi.useFakeTimers();

    mockSubmitReport.mockResolvedValue({ job_id: "j-1", status: "queued" });
    mockGetJobStatus.mockResolvedValue({
      job_id: "j-1",
      status: "completed",
      created_at: "2024-01-01T00:00:00Z",
    });

    render(<ReportBuilder projectId="proj-1" />);

    // Submit the report
    await act(async () => {
      fireEvent.click(screen.getByText("Run Report"));
    });

    expect(mockSubmitReport).toHaveBeenCalledTimes(1);
    expect(useReportStore.getState().jobId).toBe("j-1");

    // Advance timer to trigger poll
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(screen.getByText("Report completed successfully.")).toBeDefined();

    vi.useRealTimers();
  });

  it("prevents duplicate submissions while job is active", async () => {
    vi.useFakeTimers();

    mockSubmitReport.mockResolvedValue({ job_id: "j-2", status: "queued" });
    mockGetJobStatus.mockResolvedValue({
      job_id: "j-2",
      status: "running",
      created_at: "2024-01-01T00:00:00Z",
    });

    render(<ReportBuilder projectId="proj-1" />);

    await act(async () => {
      fireEvent.click(screen.getByText("Run Report"));
    });

    // Advance to trigger poll — status is "running"
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    // Button should show Running and be disabled
    const button = screen.getByText("Running…");
    expect((button as HTMLButtonElement).disabled).toBe(true);

    // Clicking again should not trigger another submission
    await act(async () => {
      fireEvent.click(button);
    });
    expect(mockSubmitReport).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("shows failed job error message", async () => {
    vi.useFakeTimers();

    mockSubmitReport.mockResolvedValue({ job_id: "j-3", status: "queued" });
    mockGetJobStatus.mockResolvedValue({
      job_id: "j-3",
      status: "failed",
      error: "Timeout exceeded",
      created_at: "2024-01-01T00:00:00Z",
    });

    render(<ReportBuilder projectId="proj-1" />);

    await act(async () => {
      fireEvent.click(screen.getByText("Run Report"));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(screen.getByText(/Timeout exceeded/)).toBeDefined();

    vi.useRealTimers();
  });
});
