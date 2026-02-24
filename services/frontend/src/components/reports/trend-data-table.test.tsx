import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TrendDataTable, getPageSlice } from "./trend-data-table";
import type { TrendTableColumn, TrendTableRow } from "@/types/api";

// ─── getPageSlice unit tests ─────────────────────────────────

describe("getPageSlice", () => {
  it("returns empty items and totalPages 0 for empty data", () => {
    const result = getPageSlice([], 1, 10);
    expect(result).toEqual({ items: [], page: 1, totalPages: 0 });
  });

  it("returns all items when data fits in one page", () => {
    const data = [1, 2, 3];
    const result = getPageSlice(data, 1, 10);
    expect(result.items).toEqual([1, 2, 3]);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
  });

  it("returns correct slice for page 2", () => {
    const data = [1, 2, 3, 4, 5];
    const result = getPageSlice(data, 2, 2);
    expect(result.items).toEqual([3, 4]);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(3);
  });

  it("returns last partial page correctly", () => {
    const data = [1, 2, 3, 4, 5];
    const result = getPageSlice(data, 3, 2);
    expect(result.items).toEqual([5]);
  });

  it("clamps page below 1 to 1", () => {
    const result = getPageSlice([1, 2], 0, 10);
    expect(result.page).toBe(1);
    expect(result.items).toEqual([1, 2]);
  });

  it("clamps page above totalPages to last page", () => {
    const result = getPageSlice([1, 2, 3], 99, 2);
    expect(result.page).toBe(2);
    expect(result.items).toEqual([3]);
  });

  it("treats pageSize < 1 as 1", () => {
    const result = getPageSlice([1, 2, 3], 1, 0);
    expect(result.items).toEqual([1]);
    expect(result.totalPages).toBe(3);
  });
});

// ─── TrendDataTable component tests ─────────────────────────

const columns: TrendTableColumn[] = [
  { key: "dimension", label: "Country" },
  { key: "2024-01", label: "Jan 2024" },
  { key: "2024-02", label: "Feb 2024" },
];

function makeRows(count: number): TrendTableRow[] {
  return Array.from({ length: count }, (_, i) => ({
    dimensionValue: `Country ${i + 1}`,
    values: { "2024-01": (i + 1) * 10, "2024-02": (i + 1) * 20 },
  }));
}

describe("TrendDataTable", () => {
  it("renders empty state when data is empty", () => {
    render(<TrendDataTable data={[]} columns={columns} />);
    expect(screen.getByText("No data")).toBeDefined();
  });

  it("renders bold column headers (fontWeight 700)", () => {
    render(<TrendDataTable data={makeRows(1)} columns={columns} />);
    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(3);
    for (const th of headers) {
      expect(th.style.fontWeight).toBe("700");
    }
  });

  it("renders dimension value in the first column", () => {
    const rows: TrendTableRow[] = [
      { dimensionValue: "USA", values: { "2024-01": 100, "2024-02": 200 } },
    ];
    render(<TrendDataTable data={rows} columns={columns} />);
    const cells = screen.getAllByRole("cell");
    expect(cells[0].textContent).toBe("USA");
  });

  it("renders metric values from the values record", () => {
    const rows: TrendTableRow[] = [
      { dimensionValue: "USA", values: { "2024-01": 100, "2024-02": 200 } },
    ];
    render(<TrendDataTable data={rows} columns={columns} />);
    const cells = screen.getAllByRole("cell");
    expect(cells[1].textContent).toBe("100");
    expect(cells[2].textContent).toBe("200");
  });

  it("shows dash for missing values", () => {
    const rows: TrendTableRow[] = [
      { dimensionValue: "USA", values: {} },
    ];
    render(<TrendDataTable data={rows} columns={columns} />);
    const cells = screen.getAllByRole("cell");
    expect(cells[1].textContent).toBe("—");
  });

  it("does not show pagination when data fits in one page", () => {
    render(<TrendDataTable data={makeRows(3)} columns={columns} pageSize={10} />);
    expect(screen.queryByText("Previous")).toBeNull();
    expect(screen.queryByText("Next")).toBeNull();
  });

  it("shows pagination when data exceeds page size", () => {
    render(<TrendDataTable data={makeRows(15)} columns={columns} pageSize={5} />);
    expect(screen.getByText("Page 1 of 3")).toBeDefined();
    expect(screen.getByText("Previous")).toBeDefined();
    expect(screen.getByText("Next")).toBeDefined();
  });

  it("navigates to next page on Next click", () => {
    render(<TrendDataTable data={makeRows(6)} columns={columns} pageSize={3} />);
    expect(screen.getByText("Page 1 of 2")).toBeDefined();
    expect(screen.getByText("Country 1")).toBeDefined();

    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Page 2 of 2")).toBeDefined();
    expect(screen.getByText("Country 4")).toBeDefined();
  });

  it("navigates back on Previous click", () => {
    render(<TrendDataTable data={makeRows(6)} columns={columns} pageSize={3} />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Page 2 of 2")).toBeDefined();

    fireEvent.click(screen.getByText("Previous"));
    expect(screen.getByText("Page 1 of 2")).toBeDefined();
    expect(screen.getByText("Country 1")).toBeDefined();
  });

  it("disables Previous on first page", () => {
    render(<TrendDataTable data={makeRows(6)} columns={columns} pageSize={3} />);
    const prev = screen.getByText("Previous") as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
  });

  it("disables Next on last page", () => {
    render(<TrendDataTable data={makeRows(6)} columns={columns} pageSize={3} />);
    fireEvent.click(screen.getByText("Next"));
    const next = screen.getByText("Next") as HTMLButtonElement;
    expect(next.disabled).toBe(true);
  });

  it("defaults pageSize to 10", () => {
    render(<TrendDataTable data={makeRows(12)} columns={columns} />);
    expect(screen.getByText("Page 1 of 2")).toBeDefined();
    // First page should show 10 rows
    const rows = screen.getAllByRole("row");
    // 1 header row + 10 data rows
    expect(rows).toHaveLength(11);
  });
});
