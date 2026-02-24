import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IntervalSelector } from "./interval-selector";

describe("IntervalSelector", () => {
  it("renders the 'Interval' label", () => {
    render(<IntervalSelector value="day" onChange={() => {}} />);
    expect(screen.getByText("Interval")).toBeDefined();
  });

  it("renders all four interval options", () => {
    render(<IntervalSelector value="day" onChange={() => {}} />);
    const select = screen.getByRole("combobox");
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(4);
    expect(options[0].textContent).toBe("Hour");
    expect(options[1].textContent).toBe("Day");
    expect(options[2].textContent).toBe("Week");
    expect(options[3].textContent).toBe("Month");
  });

  it("defaults to 'Day' when value is 'day'", () => {
    render(<IntervalSelector value="day" onChange={() => {}} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("day");
  });

  it("reflects the provided value", () => {
    render(<IntervalSelector value="week" onChange={() => {}} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("week");
  });

  it("calls onChange with the selected interval", () => {
    const onChange = vi.fn();
    render(<IntervalSelector value="day" onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "month" } });
    expect(onChange).toHaveBeenCalledWith("month");
  });

  it("calls onChange with 'hour' when Hour is selected", () => {
    const onChange = vi.fn();
    render(<IntervalSelector value="day" onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "hour" } });
    expect(onChange).toHaveBeenCalledWith("hour");
  });

  it("associates the label with the select via htmlFor", () => {
    render(<IntervalSelector value="day" onChange={() => {}} />);
    const select = screen.getByLabelText("Interval");
    expect(select.tagName).toBe("SELECT");
  });
});
