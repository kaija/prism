import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrendChart, buildChartOption, isComparisonLabel, formatDate } from "./trend-chart";
import type { TrendResult } from "@/types/api";
import type { ChartSeries } from "./trend-chart";

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

describe("buildChartOption", () => {
  it("returns null for empty series", () => {
    expect(buildChartOption({ series: [] })).toBeNull();
  });

  it("creates single series with default label when no labels provided", () => {
    const data: TrendResult = {
      series: [
        { timestamp: 1700000000000, value: 10 },
        { timestamp: 1700086400000, value: 20 },
      ],
    };
    const option = buildChartOption(data)!;
    const series = option.series as ChartSeries[];
    expect(series).toHaveLength(1);
    expect(series[0].name).toBe("Value");
    expect(series[0].lineStyle.type).toBe("solid");
  });

  it("creates one series per distinct label", () => {
    const data: TrendResult = {
      series: [
        { timestamp: 1700000000000, value: 10, label: "Signups" },
        { timestamp: 1700000000000, value: 5, label: "Purchases" },
        { timestamp: 1700086400000, value: 15, label: "Signups" },
        { timestamp: 1700086400000, value: 8, label: "Purchases" },
      ],
    };
    const option = buildChartOption(data)!;
    const series = option.series as ChartSeries[];
    expect(series).toHaveLength(2);
    expect(series.map((s) => s.name).sort()).toEqual(["Purchases", "Signups"]);
  });

  it("renders comparison series with dashed line and reduced opacity", () => {
    const data: TrendResult = {
      series: [
        { timestamp: 1700000000000, value: 10, label: "People" },
        { timestamp: 1700000000000, value: 7, label: "People (comparison)" },
      ],
    };
    const option = buildChartOption(data)!;
    const series = option.series as ChartSeries[];
    const primary = series.find((s) => s.name === "People")!;
    const comparison = series.find((s) => s.name === "People (comparison)")!;

    expect(primary.lineStyle.type).toBe("solid");
    expect(primary.lineStyle.opacity).toBe(1);

    expect(comparison.lineStyle.type).toBe("dashed");
    expect(comparison.lineStyle.opacity).toBe(0.5);
    expect(comparison.itemStyle.opacity).toBe(0.5);
  });

  it("shows legend when multiple series exist", () => {
    const data: TrendResult = {
      series: [
        { timestamp: 1700000000000, value: 10, label: "A" },
        { timestamp: 1700000000000, value: 5, label: "B" },
      ],
    };
    const option = buildChartOption(data)!;
    expect((option.legend as { show: boolean }).show).toBe(true);
  });

  it("hides legend for single series", () => {
    const data: TrendResult = {
      series: [{ timestamp: 1700000000000, value: 10 }],
    };
    const option = buildChartOption(data)!;
    expect((option.legend as { show: boolean }).show).toBe(false);
  });

  it("labels each series with metric name or dimension value", () => {
    const data: TrendResult = {
      series: [
        { timestamp: 1700000000000, value: 10, label: "Scroll depth" },
        { timestamp: 1700000000000, value: 5, label: "Actions" },
        { timestamp: 1700000000000, value: 3, label: "People" },
      ],
    };
    const option = buildChartOption(data)!;
    const names = (option.series as ChartSeries[]).map((s) => s.name);
    expect(names).toContain("Scroll depth");
    expect(names).toContain("Actions");
    expect(names).toContain("People");
  });
});

describe("isComparisonLabel", () => {
  it("returns true for labels containing 'comparison'", () => {
    expect(isComparisonLabel("People (comparison)")).toBe(true);
    expect(isComparisonLabel("Comparison period")).toBe(true);
    expect(isComparisonLabel("COMPARISON")).toBe(true);
  });

  it("returns false for regular labels", () => {
    expect(isComparisonLabel("People")).toBe(false);
    expect(isComparisonLabel("Signups")).toBe(false);
    expect(isComparisonLabel("Value")).toBe(false);
  });
});

describe("formatDate", () => {
  it("formats timestamp to YYYY-MM-DD", () => {
    // 2023-11-15 in UTC
    const ts = Date.UTC(2023, 10, 15);
    expect(formatDate(ts)).toBe("2023-11-15");
  });
});
