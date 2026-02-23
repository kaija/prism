import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimeframePicker } from "./timeframe-picker";
import type { Timeframe } from "@/types/api";

describe("TimeframePicker", () => {
  const defaultValue: Timeframe = { type: "relative", relative: "last_7_days" };

  it("renders the Timeframe label", () => {
    render(<TimeframePicker value={defaultValue} onChange={() => {}} />);
    expect(screen.getByText("Timeframe")).toBeDefined();
  });

  it("renders relative mode with preset dropdown by default", () => {
    render(<TimeframePicker value={defaultValue} onChange={() => {}} />);
    const select = screen.getByLabelText("Relative timeframe preset");
    expect(select).toBeDefined();
    expect((select as HTMLSelectElement).value).toBe("last_7_days");
  });

  it("calls onChange when a relative preset is selected", () => {
    const onChange = vi.fn();
    render(<TimeframePicker value={defaultValue} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Relative timeframe preset"), {
      target: { value: "last_30_days" },
    });
    expect(onChange).toHaveBeenCalledWith({
      type: "relative",
      relative: "last_30_days",
    });
  });

  it("switches to absolute mode and shows date inputs", () => {
    const onChange = vi.fn();
    render(<TimeframePicker value={defaultValue} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Absolute"));
    // onChange should be called with absolute type
    expect(onChange).toHaveBeenCalledWith({
      type: "absolute",
      start: undefined,
      end: undefined,
    });
  });

  it("renders date inputs in absolute mode", () => {
    const absValue: Timeframe = { type: "absolute", start: 1700000000000, end: 1700100000000 };
    render(<TimeframePicker value={absValue} onChange={() => {}} />);
    // Click absolute radio to ensure we're in absolute mode
    fireEvent.click(screen.getByLabelText("Absolute"));
    expect(screen.getByLabelText("Start date")).toBeDefined();
    expect(screen.getByLabelText("End date")).toBeDefined();
  });

  it("lists all relative presets", () => {
    render(<TimeframePicker value={defaultValue} onChange={() => {}} />);
    const select = screen.getByLabelText("Relative timeframe preset") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain("last_7_days");
    expect(options).toContain("last_14_days");
    expect(options).toContain("last_30_days");
    expect(options).toContain("last_90_days");
    expect(options).toContain("this_month");
    expect(options).toContain("last_month");
  });
});
