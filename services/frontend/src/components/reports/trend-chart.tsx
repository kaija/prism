"use client";

import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { TrendResult } from "@/types/api";

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const PRIMARY = "#4a77f0";
const SECONDARY = "#fdc530";
const GRID_COLOR = "#eff0f6";
const PALETTE = [PRIMARY, SECONDARY, "#34c38f", "#e74c3c", "#9b59b6"];

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Check whether a series label represents a comparison series */
export function isComparisonLabel(label: string): boolean {
  return label.toLowerCase().includes("comparison");
}

export interface ChartSeries {
  name: string;
  type: "line";
  data: number[];
  smooth: boolean;
  symbol: string;
  symbolSize: number;
  lineStyle: { width: number; color: string; type: "solid" | "dashed"; opacity?: number };
  itemStyle: { color: string; opacity?: number };
  areaStyle: { color: unknown; opacity?: number };
}

/**
 * Build ECharts option from TrendResult data.
 * Exported for testability (property tests).
 *
 * Supports:
 * - Single series (no labels → default "Value")
 * - Multi-series (each unique label gets its own series)
 * - Comparison series (labels containing "comparison" → dashed line, reduced opacity)
 */
export function buildChartOption(data: TrendResult): echarts.EChartsCoreOption | null {
  if (!data.series.length) return null;

  // Group data points by label
  const seriesMap = new Map<string, { x: string[]; y: number[] }>();
  for (const pt of data.series) {
    const key = pt.label ?? "Value";
    if (!seriesMap.has(key)) seriesMap.set(key, { x: [], y: [] });
    const s = seriesMap.get(key)!;
    s.x.push(formatDate(pt.timestamp));
    s.y.push(pt.value);
  }

  const seriesEntries = [...seriesMap.entries()];

  const chartSeries: ChartSeries[] = seriesEntries.map(([name, s], i) => {
    const comparison = isComparisonLabel(name);
    const color = PALETTE[i % PALETTE.length];
    const opacity = comparison ? 0.5 : 1;

    return {
      name,
      type: "line" as const,
      data: s.y,
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      lineStyle: {
        width: 2,
        color,
        type: comparison ? ("dashed" as const) : ("solid" as const),
        opacity,
      },
      itemStyle: { color, opacity },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: color + "33" },
          { offset: 1, color: color + "05" },
        ]),
        opacity,
      },
    };
  });

  return {
    tooltip: {
      trigger: "axis",
      backgroundColor: "#fff",
      borderColor: GRID_COLOR,
      textStyle: { fontFamily: "'Roboto', sans-serif", fontSize: 12, color: "#3c4858" },
    },
    legend: {
      show: seriesEntries.length > 1,
      bottom: 0,
      textStyle: { fontFamily: "'Roboto', sans-serif", fontSize: 12 },
    },
    grid: { left: 48, right: 16, top: 16, bottom: seriesEntries.length > 1 ? 40 : 16, containLabel: false },
    xAxis: {
      type: "category",
      data: seriesEntries[0][1].x,
      axisLine: { lineStyle: { color: GRID_COLOR } },
      axisLabel: { fontFamily: "'Roboto', sans-serif", fontSize: 11, color: "#8e99a4" },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisLabel: { fontFamily: "'Roboto', sans-serif", fontSize: 11, color: "#8e99a4" },
      splitLine: { lineStyle: { color: GRID_COLOR, type: "dashed" } },
    },
    series: chartSeries,
  };
}

export function TrendChart({ data }: { data: TrendResult }) {
  const option = buildChartOption(data);

  if (!option) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#8e99a4", fontFamily: "'Roboto', sans-serif" }}>
        No trend data available.
      </div>
    );
  }

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      style={{ height: 320, width: "100%" }}
      notMerge
      lazyUpdate
    />
  );
}
