import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrendChart } from "./trend-chart";
import type { TrendResult } from "@/types/api";

// Mock echarts-for-react since canvas isn't available in jsdom
vi.mock("echarts-for-react/lib/core", () => ({
  default: (props: { option: Record<string, unknown>; style: React.CSSProperties }) => (
    <div data-testid="echarts" style={props.style}>
      {JSON.stringify(props.option)}
    </div>
  ),
}));

vi.mock("echarts/core", () => {
  const graphic = {
    LinearGradient: class {
      constructor() {}
    },
  };
  return {
    use: vi.fn(),
    graphic,
    default: { use: vi.fn(), graphic },
  };
});

vi.mock("echarts/charts", () => ({ LineChart: {} }));
vi.mock("echarts/components", () => ({
  GridComponent: {},
  TooltipComponent: {},
  LegendComponent: {},
}));
vi.mock("echarts/renderers", () => ({ CanvasRenderer: {} }));

describe("TrendChart", () => {
  it("renders empty state when no data", () => {
    const data: TrendResult = { series: [] };
    render(<TrendChart data={data} />);
    expect(screen.getByText("No trend data available.")).toBeDefined();
  });

  it("renders chart with valid data", () => {
    const data: TrendResult = {
      series: [
        { timestamp: 1700000000000, value: 10 },
        { timestamp: 1700086400000, value: 25 },
        { timestamp: 1700172800000, value: 18 },
      ],
    };
    render(<TrendChart data={data} />);
    const chart = screen.getByTestId("echarts");
    expect(chart).toBeDefined();
    // Verify the option contains our data values
    const optionText = chart.textContent ?? "";
    expect(optionText).toContain("10");
    expect(optionText).toContain("25");
    expect(optionText).toContain("18");
  });

  it("supports multi-series data via label field", () => {
    const data: TrendResult = {
      series: [
        { timestamp: 1700000000000, value: 10, label: "Signups" },
        { timestamp: 1700000000000, value: 5, label: "Purchases" },
        { timestamp: 1700086400000, value: 15, label: "Signups" },
        { timestamp: 1700086400000, value: 8, label: "Purchases" },
      ],
    };
    render(<TrendChart data={data} />);
    const chart = screen.getByTestId("echarts");
    const optionText = chart.textContent ?? "";
    expect(optionText).toContain("Signups");
    expect(optionText).toContain("Purchases");
  });
});
