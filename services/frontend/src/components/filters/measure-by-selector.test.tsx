import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MeasureBySelector } from "./measure-by-selector";
import type { MeasureMetric } from "@/types/api";

const metrics: MeasureMetric[] = [
  { key: "people", label: "People" },
  { key: "actions", label: "Actions" },
  { key: "scroll_depth", label: "Scroll depth" },
];

describe("MeasureBySelector", () => {
  it("renders the 'Measure by' label", () => {
    render(<MeasureBySelector value={[metrics[0]]} onChange={() => {}} availableMetrics={metrics} />);
    expect(screen.getByText("Measure by")).toBeDefined();
  });

  it("renders PillTags for selected metrics", () => {
    render(
      <MeasureBySelector value={[metrics[0], metrics[1]]} onChange={() => {}} availableMetrics={metrics} />
    );
    expect(screen.getByText("People")).toBeDefined();
    expect(screen.getByText("Actions")).toBeDefined();
  });

  it("calls onChange with added metric when selecting from dropdown", () => {
    const onChange = vi.fn();
    render(<MeasureBySelector value={[metrics[0]]} onChange={onChange} availableMetrics={metrics} />);

    fireEvent.click(screen.getByRole("button", { name: /\+/i }));
    fireEvent.click(screen.getByText("Actions"));

    expect(onChange).toHaveBeenCalledWith([metrics[0], metrics[1]]);
  });

  it("calls onChange with metric removed when clicking remove on a pill", () => {
    const onChange = vi.fn();
    render(
      <MeasureBySelector value={[metrics[0], metrics[1]]} onChange={onChange} availableMetrics={metrics} />
    );

    fireEvent.click(screen.getByLabelText("Remove People"));

    expect(onChange).toHaveBeenCalledWith([metrics[1]]);
  });

  it("does not show already-selected metrics in the dropdown", () => {
    render(
      <MeasureBySelector value={[metrics[0], metrics[1]]} onChange={() => {}} availableMetrics={metrics} />
    );

    fireEvent.click(screen.getByRole("button", { name: /\+/i }));

    expect(screen.queryByRole("option", { name: "People" })).toBeNull();
    expect(screen.queryByRole("option", { name: "Actions" })).toBeNull();
    expect(screen.getByText("Scroll depth")).toBeDefined();
  });

  it("disables remove button when only one metric remains", () => {
    render(
      <MeasureBySelector value={[metrics[0]]} onChange={() => {}} availableMetrics={metrics} />
    );

    const removeButton = screen.getByLabelText("Remove People");
    expect(removeButton).toHaveProperty("disabled", true);
  });

  it("does not call onChange when trying to remove the last metric", () => {
    const onChange = vi.fn();
    render(
      <MeasureBySelector value={[metrics[0]]} onChange={onChange} availableMetrics={metrics} />
    );

    fireEvent.click(screen.getByLabelText("Remove People"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("enables remove buttons when multiple metrics are selected", () => {
    render(
      <MeasureBySelector value={[metrics[0], metrics[1]]} onChange={() => {}} availableMetrics={metrics} />
    );

    const removePeople = screen.getByLabelText("Remove People");
    const removeActions = screen.getByLabelText("Remove Actions");
    expect(removePeople).toHaveProperty("disabled", false);
    expect(removeActions).toHaveProperty("disabled", false);
  });

  it("does not add duplicate metrics", () => {
    const onChange = vi.fn();
    render(
      <MeasureBySelector value={[metrics[0]]} onChange={onChange} availableMetrics={metrics} />
    );

    // The dropdown already filters out selected metrics, but the handler also guards against duplicates
    // We can verify the dropdown doesn't show "People"
    fireEvent.click(screen.getByRole("button", { name: /\+/i }));
    expect(screen.queryByRole("option", { name: "People" })).toBeNull();
  });
});
