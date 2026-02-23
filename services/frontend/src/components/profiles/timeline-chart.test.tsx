import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimelineChart } from "./timeline-chart";
import type { TimelineBucket } from "@/types/api";
import { vi } from "vitest";

// Mock echarts-for-react (same pattern as trend-chart tests)
vi.mock("echarts-for-react/lib/core", () => ({
  default: (props: { option: Record<string, unknown>; style: React.CSSProperties }) => (
    <div data-testid="echarts" style={props.style}>
      {JSON.stringify(props.option)}
    </div>
  ),
}));

vi.mock("echarts/core", () => ({
  use: vi.fn(),
  default: { use: vi.fn() },
}));

vi.mock("echarts/charts", () => ({ BarChart: {}, LineChart: {} }));
vi.mock("echarts/components", () => ({
  GridComponent: {},
  TooltipComponent: {},
  LegendComponent: {},
}));
vi.mock("echarts/renderers", () => ({ CanvasRenderer: {} }));

describe("TimelineChart", () => {
  it("shows empty state when data is empty", () => {
    render(<TimelineChart data={[]} />);
    expect(screen.getByText("No timeline data available.")).toBeDefined();
  });

  it("renders chart with valid single-series data", () => {
    const data: TimelineBucket[] = [
      { bucket: "2024-01-01T00:00:00Z", event_name: "page_view", count: 10 },
      { bucket: "2024-01-02T00:00:00Z", event_name: "page_view", count: 20 },
    ];
    render(<TimelineChart data={data} />);
    const chart = screen.getByTestId("echarts");
    expect(chart).toBeDefined();
    const text = chart.textContent ?? "";
    expect(text).toContain("page_view");
    expect(text).toContain("10");
    expect(text).toContain("20");
  });

  it("groups data by event_name for multi-series chart", () => {
    const data: TimelineBucket[] = [
      { bucket: "2024-01-01T00:00:00Z", event_name: "page_view", count: 10 },
      { bucket: "2024-01-01T00:00:00Z", event_name: "click", count: 5 },
      { bucket: "2024-01-02T00:00:00Z", event_name: "page_view", count: 15 },
      { bucket: "2024-01-02T00:00:00Z", event_name: "click", count: 8 },
    ];
    render(<TimelineChart data={data} />);
    const chart = screen.getByTestId("echarts");
    const text = chart.textContent ?? "";
    expect(text).toContain("page_view");
    expect(text).toContain("click");
    expect(text).toContain("10");
    expect(text).toContain("5");
    expect(text).toContain("15");
    expect(text).toContain("8");
  });

  it("renders bar chart type in series config", () => {
    const data: TimelineBucket[] = [
      { bucket: "2024-01-01T00:00:00Z", event_name: "signup", count: 3 },
    ];
    render(<TimelineChart data={data} />);
    const chart = screen.getByTestId("echarts");
    const text = chart.textContent ?? "";
    expect(text).toContain('"type":"bar"');
  });
});
