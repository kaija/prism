import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AttributionChart } from "./attribution-chart";
import type { AttributionResult } from "@/types/api";

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

vi.mock("echarts/charts", () => ({ BarChart: {} }));
vi.mock("echarts/components", () => ({
  GridComponent: {},
  TooltipComponent: {},
}));
vi.mock("echarts/renderers", () => ({ CanvasRenderer: {} }));

describe("AttributionChart", () => {
  it("renders empty state when no data", () => {
    const data: AttributionResult = { items: [] };
    render(<AttributionChart data={data} />);
    expect(screen.getByText("No attribution data available.")).toBeDefined();
  });

  it("renders chart with valid data", () => {
    const data: AttributionResult = {
      items: [
        { name: "Google Ads", value: 120 },
        { name: "Organic", value: 85 },
        { name: "Email", value: 45 },
      ],
    };
    render(<AttributionChart data={data} />);
    const chart = screen.getByTestId("echarts");
    expect(chart).toBeDefined();
    const optionText = chart.textContent ?? "";
    expect(optionText).toContain("Google Ads");
    expect(optionText).toContain("Organic");
    expect(optionText).toContain("Email");
  });

  it("sorts items by value descending", () => {
    const data: AttributionResult = {
      items: [
        { name: "Email", value: 45 },
        { name: "Google Ads", value: 120 },
        { name: "Organic", value: 85 },
      ],
    };
    render(<AttributionChart data={data} />);
    const chart = screen.getByTestId("echarts");
    const option = JSON.parse(chart.textContent ?? "{}");
    // yAxis data should be sorted descending by value
    expect(option.yAxis.data).toEqual(["Google Ads", "Organic", "Email"]);
  });
});
