import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  TimeframePicker,
  validateTimeframe,
  formatTimeframeDisplay,
} from "./timeframe-picker";
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
    expect(onChange).toHaveBeenCalledWith({
      type: "absolute",
      start: undefined,
      end: undefined,
    });
  });

  it("renders date inputs in absolute mode", () => {
    const absValue: Timeframe = {
      type: "absolute",
      start: 1700000000000,
      end: 1700100000000,
    };
    render(<TimeframePicker value={absValue} onChange={() => {}} />);
    fireEvent.click(screen.getByLabelText("Absolute"));
    expect(screen.getByLabelText("Start date")).toBeDefined();
    expect(screen.getByLabelText("End date")).toBeDefined();
  });

  it("lists all relative presets", () => {
    render(<TimeframePicker value={defaultValue} onChange={() => {}} />);
    const select = screen.getByLabelText(
      "Relative timeframe preset"
    ) as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain("last_7_days");
    expect(options).toContain("last_14_days");
    expect(options).toContain("last_30_days");
    expect(options).toContain("last_90_days");
    expect(options).toContain("this_month");
    expect(options).toContain("last_month");
  });

  it("displays the human-readable timeframe", () => {
    render(<TimeframePicker value={defaultValue} onChange={() => {}} />);
    const display = screen.getByTestId("timeframe-display");
    expect(display.textContent).toBe("7 days ago → Today");
  });
});

describe("TimeframePicker — comparison toggle", () => {
  const defaultValue: Timeframe = { type: "relative", relative: "last_7_days" };

  it("does not render comparison section when onComparisonChange is not provided", () => {
    render(<TimeframePicker value={defaultValue} onChange={() => {}} />);
    expect(
      screen.queryByText("Compare to previous timeframe")
    ).toBeNull();
  });

  it("renders comparison checkbox when onComparisonChange is provided", () => {
    render(
      <TimeframePicker
        value={defaultValue}
        onChange={() => {}}
        comparisonEnabled={false}
        comparisonTimeframe={null}
        onComparisonChange={() => {}}
      />
    );
    expect(
      screen.getByText("Compare to previous timeframe")
    ).toBeDefined();
  });

  it("enables comparison with default preset when checkbox is checked", () => {
    const onComparisonChange = vi.fn();
    render(
      <TimeframePicker
        value={defaultValue}
        onChange={() => {}}
        comparisonEnabled={false}
        comparisonTimeframe={null}
        onComparisonChange={onComparisonChange}
      />
    );
    fireEvent.click(screen.getByText("Compare to previous timeframe"));
    expect(onComparisonChange).toHaveBeenCalledWith(true, {
      type: "relative",
      relative: "previous_period",
    });
  });

  it("disables comparison when checkbox is unchecked", () => {
    const onComparisonChange = vi.fn();
    render(
      <TimeframePicker
        value={defaultValue}
        onChange={() => {}}
        comparisonEnabled={true}
        comparisonTimeframe={{ type: "relative", relative: "previous_period" }}
        onComparisonChange={onComparisonChange}
      />
    );
    fireEvent.click(screen.getByText("Compare to previous timeframe"));
    expect(onComparisonChange).toHaveBeenCalledWith(false, null);
  });

  it("shows comparison preset selector when comparison is enabled", () => {
    render(
      <TimeframePicker
        value={defaultValue}
        onChange={() => {}}
        comparisonEnabled={true}
        comparisonTimeframe={{ type: "relative", relative: "previous_period" }}
        onComparisonChange={() => {}}
      />
    );
    const select = screen.getByLabelText("Comparison timeframe preset");
    expect(select).toBeDefined();
    expect((select as HTMLSelectElement).value).toBe("previous_period");
  });

  it("hides comparison preset selector when comparison is disabled", () => {
    render(
      <TimeframePicker
        value={defaultValue}
        onChange={() => {}}
        comparisonEnabled={false}
        comparisonTimeframe={null}
        onComparisonChange={() => {}}
      />
    );
    expect(
      screen.queryByLabelText("Comparison timeframe preset")
    ).toBeNull();
  });

  it("calls onComparisonChange when preset is changed", () => {
    const onComparisonChange = vi.fn();
    render(
      <TimeframePicker
        value={defaultValue}
        onChange={() => {}}
        comparisonEnabled={true}
        comparisonTimeframe={{ type: "relative", relative: "previous_period" }}
        onComparisonChange={onComparisonChange}
      />
    );
    fireEvent.change(screen.getByLabelText("Comparison timeframe preset"), {
      target: { value: "same_period_last_year" },
    });
    expect(onComparisonChange).toHaveBeenCalledWith(true, {
      type: "relative",
      relative: "same_period_last_year",
    });
  });
});

describe("TimeframePicker — date validation", () => {
  it("shows inline error when start date is after end date", () => {
    const invalidValue: Timeframe = {
      type: "absolute",
      start: 1700200000000,
      end: 1700100000000,
    };
    render(<TimeframePicker value={invalidValue} onChange={() => {}} />);
    // Switch to absolute mode to see the error
    fireEvent.click(screen.getByLabelText("Absolute"));
    expect(screen.getByRole("alert").textContent).toBe(
      "Start date must be before end date"
    );
  });

  it("does not show error for valid absolute timeframe", () => {
    const validValue: Timeframe = {
      type: "absolute",
      start: 1700000000000,
      end: 1700200000000,
    };
    render(<TimeframePicker value={validValue} onChange={() => {}} />);
    fireEvent.click(screen.getByLabelText("Absolute"));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("validateTimeframe", () => {
  it("returns null for relative timeframes", () => {
    expect(
      validateTimeframe({ type: "relative", relative: "last_7_days" })
    ).toBeNull();
  });

  it("returns null for valid absolute timeframe", () => {
    expect(
      validateTimeframe({
        type: "absolute",
        start: 1000,
        end: 2000,
      })
    ).toBeNull();
  });

  it("returns error when start > end", () => {
    expect(
      validateTimeframe({
        type: "absolute",
        start: 3000,
        end: 1000,
      })
    ).toBe("Start date must be before end date");
  });

  it("returns null when start equals end", () => {
    expect(
      validateTimeframe({
        type: "absolute",
        start: 1000,
        end: 1000,
      })
    ).toBeNull();
  });

  it("returns null when start or end is undefined", () => {
    expect(
      validateTimeframe({ type: "absolute", start: 1000 })
    ).toBeNull();
    expect(
      validateTimeframe({ type: "absolute", end: 2000 })
    ).toBeNull();
  });
});

describe("formatTimeframeDisplay", () => {
  it("returns human-readable string for relative presets", () => {
    expect(
      formatTimeframeDisplay({ type: "relative", relative: "last_7_days" })
    ).toBe("7 days ago → Today");
    expect(
      formatTimeframeDisplay({ type: "relative", relative: "last_30_days" })
    ).toBe("30 days ago → Today");
    expect(
      formatTimeframeDisplay({ type: "relative", relative: "this_month" })
    ).toBe("Start of month → Today");
  });

  it("returns the raw preset string for unknown relative presets", () => {
    const result = formatTimeframeDisplay({
      type: "relative",
      relative: "custom_preset",
    });
    expect(result).toBe("custom_preset");
  });

  it("returns formatted date range for absolute timeframes", () => {
    // Jan 1, 2024 UTC
    const start = Date.UTC(2024, 0, 1);
    // Jan 31, 2024 UTC
    const end = Date.UTC(2024, 0, 31);
    const result = formatTimeframeDisplay({
      type: "absolute",
      start,
      end,
    });
    expect(result).toContain("→");
    expect(result.length).toBeGreaterThan(0);
  });

  it("uses ellipsis for missing absolute dates", () => {
    expect(
      formatTimeframeDisplay({ type: "absolute", start: Date.UTC(2024, 0, 1) })
    ).toContain("…");
    expect(
      formatTimeframeDisplay({ type: "absolute", end: Date.UTC(2024, 0, 31) })
    ).toContain("…");
  });
});
