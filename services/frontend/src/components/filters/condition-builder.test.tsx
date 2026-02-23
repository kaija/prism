import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConditionBuilder } from "./condition-builder";
import type { ConditionGroup } from "@/types/api";

describe("ConditionBuilder", () => {
  const emptyGroup: ConditionGroup = { logic: "and", conditions: [] };

  it("renders the Filters label", () => {
    render(<ConditionBuilder value={emptyGroup} onChange={() => {}} />);
    expect(screen.getByText("Filters")).toBeDefined();
  });

  it("renders the logic toggle showing AND", () => {
    render(<ConditionBuilder value={emptyGroup} onChange={() => {}} />);
    expect(screen.getByText("AND")).toBeDefined();
  });

  it("toggles logic from AND to OR", () => {
    const onChange = vi.fn();
    render(<ConditionBuilder value={emptyGroup} onChange={onChange} />);
    fireEvent.click(screen.getByText("AND"));
    expect(onChange).toHaveBeenCalledWith({ logic: "or", conditions: [] });
  });

  it("adds a condition when + Condition is clicked", () => {
    const onChange = vi.fn();
    render(<ConditionBuilder value={emptyGroup} onChange={onChange} />);
    fireEvent.click(screen.getByText("+ Condition"));
    expect(onChange).toHaveBeenCalledWith({
      logic: "and",
      conditions: [{ attribute: "", operator: "is", value: "" }],
    });
  });

  it("adds a nested group when + Group is clicked", () => {
    const onChange = vi.fn();
    render(<ConditionBuilder value={emptyGroup} onChange={onChange} />);
    fireEvent.click(screen.getByText("+ Group"));
    expect(onChange).toHaveBeenCalledWith({
      logic: "and",
      conditions: [{ logic: "and", conditions: [] }],
    });
  });

  it("renders existing conditions with attribute, operator, and value fields", () => {
    const group: ConditionGroup = {
      logic: "and",
      conditions: [{ attribute: "country", operator: "is", value: "US" }],
    };
    render(<ConditionBuilder value={group} onChange={() => {}} />);
    const attrInput = screen.getByDisplayValue("country");
    expect(attrInput).toBeDefined();
    const valueInput = screen.getByDisplayValue("US");
    expect(valueInput).toBeDefined();
  });

  it("removes a condition when remove button is clicked", () => {
    const onChange = vi.fn();
    const group: ConditionGroup = {
      logic: "and",
      conditions: [{ attribute: "country", operator: "is", value: "US" }],
    };
    render(<ConditionBuilder value={group} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Remove condition"));
    expect(onChange).toHaveBeenCalledWith({ logic: "and", conditions: [] });
  });

  it("updates condition attribute on input change", () => {
    const onChange = vi.fn();
    const group: ConditionGroup = {
      logic: "and",
      conditions: [{ attribute: "", operator: "is", value: "" }],
    };
    render(<ConditionBuilder value={group} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Condition attribute"), {
      target: { value: "browser" },
    });
    expect(onChange).toHaveBeenCalledWith({
      logic: "and",
      conditions: [{ attribute: "browser", operator: "is", value: "" }],
    });
  });

  it("hides value input for boolean operators", () => {
    const group: ConditionGroup = {
      logic: "and",
      conditions: [{ attribute: "active", operator: "true" }],
    };
    render(<ConditionBuilder value={group} onChange={() => {}} />);
    expect(screen.queryByLabelText("Condition value")).toBeNull();
  });
});
