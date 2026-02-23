import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CohortTable } from "./cohort-table";
import type { CohortResult } from "@/types/api";

describe("CohortTable", () => {
  it("renders empty state when no cohorts", () => {
    const data: CohortResult = { periods: ["Week 0", "Week 1"], cohorts: [] };
    render(<CohortTable data={data} />);
    expect(screen.getByText("No cohort data available.")).toBeDefined();
  });

  it("renders period headers", () => {
    const data: CohortResult = {
      periods: ["Week 0", "Week 1", "Week 2"],
      cohorts: [
        { label: "Jan 1–7", size: 100, values: [100, 60, 40] },
      ],
    };
    render(<CohortTable data={data} />);
    expect(screen.getByText("Week 0")).toBeDefined();
    expect(screen.getByText("Week 1")).toBeDefined();
    expect(screen.getByText("Week 2")).toBeDefined();
  });

  it("renders cohort rows with label, size, and retention values", () => {
    const data: CohortResult = {
      periods: ["Week 0", "Week 1"],
      cohorts: [
        { label: "Jan 1–7", size: 200, values: [100, 55.5] },
        { label: "Jan 8–14", size: 150, values: [100, null] },
      ],
    };
    render(<CohortTable data={data} />);
    expect(screen.getByText("Jan 1–7")).toBeDefined();
    expect(screen.getByText("200")).toBeDefined();
    expect(screen.getAllByText("100.0%")).toHaveLength(2);
    expect(screen.getByText("55.5%")).toBeDefined();
    expect(screen.getByText("Jan 8–14")).toBeDefined();
    expect(screen.getByText("150")).toBeDefined();
    // null values render as em-dash
    expect(screen.getByText("—")).toBeDefined();
  });

  it("renders Users column header", () => {
    const data: CohortResult = {
      periods: ["Week 0"],
      cohorts: [{ label: "Jan 1–7", size: 50, values: [100] }],
    };
    render(<CohortTable data={data} />);
    expect(screen.getByText("Users")).toBeDefined();
    expect(screen.getByText("Cohort")).toBeDefined();
  });
});
