import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AggregationSelector } from "./aggregation-selector";
import type { Aggregation } from "@/types/api";

describe("AggregationSelector", () => {
  const countAgg: Aggregation = { function: "count" };

  it("renders the Aggregation label", () => {
    render(<AggregationSelector value={countAgg} onChange={() => {}} />);
    expect(screen.getByText("Aggregation")).toBeDefined();
  });

  it("renders the function dropdown with correct value", () => {
    render(<AggregationSelector value={countAgg} onChange={() => {}} />);
    const select = screen.getByLabelText("Aggregation function") as HTMLSelectElement;
    expect(select.value).toBe("count");
  });

  it("does not show attribute input for count function", () => {
    render(<AggregationSelector value={countAgg} onChange={() => {}} />);
    expect(screen.queryByLabelText("Aggregation attribute")).toBeNull();
  });

  it("shows attribute input for sum function", () => {
    const sumAgg: Aggregation = { function: "sum", attribute: "revenue" };
    render(<AggregationSelector value={sumAgg} onChange={() => {}} />);
    const input = screen.getByLabelText("Aggregation attribute") as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.value).toBe("revenue");
  });

  it("calls onChange when function is changed", () => {
    const onChange = vi.fn();
    render(<AggregationSelector value={countAgg} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Aggregation function"), {
      target: { value: "sum" },
    });
    expect(onChange).toHaveBeenCalledWith({
      function: "sum",
      attribute: undefined,
    });
  });

  it("preserves attribute when switching between functions that need it", () => {
    const onChange = vi.fn();
    const sumAgg: Aggregation = { function: "sum", attribute: "price" };
    render(<AggregationSelector value={sumAgg} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Aggregation function"), {
      target: { value: "max" },
    });
    expect(onChange).toHaveBeenCalledWith({
      function: "max",
      attribute: "price",
    });
  });

  it("clears attribute when switching to count", () => {
    const onChange = vi.fn();
    const sumAgg: Aggregation = { function: "sum", attribute: "price" };
    render(<AggregationSelector value={sumAgg} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Aggregation function"), {
      target: { value: "count" },
    });
    expect(onChange).toHaveBeenCalledWith({
      function: "count",
      attribute: undefined,
    });
  });

  it("lists all aggregation functions", () => {
    render(<AggregationSelector value={countAgg} onChange={() => {}} />);
    const select = screen.getByLabelText("Aggregation function") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual([
      "count", "sum", "count_unique", "last_event", "first_event",
      "min", "max", "mean", "average", "tops",
    ]);
  });
});
