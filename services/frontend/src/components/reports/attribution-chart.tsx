"use client";

import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { AttributionResult } from "@/types/api";

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

const PRIMARY = "#4a77f0";
const GRID_COLOR = "#eff0f6";

export function AttributionChart({ data }: { data: AttributionResult }) {
  if (!data.items.length) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#8e99a4", fontFamily: "'Roboto', sans-serif" }}>
        No attribution data available.
      </div>
    );
  }

  const sorted = [...data.items].sort((a, b) => b.value - a.value);

  const option: echarts.EChartsCoreOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "#fff",
      borderColor: GRID_COLOR,
      textStyle: { fontFamily: "'Roboto', sans-serif", fontSize: 12, color: "#3c4858" },
    },
    grid: { left: 120, right: 24, top: 16, bottom: 24, containLabel: false },
    xAxis: {
      type: "value",
      axisLine: { show: false },
      axisLabel: { fontFamily: "'Roboto', sans-serif", fontSize: 11, color: "#8e99a4" },
      splitLine: { lineStyle: { color: GRID_COLOR, type: "dashed" } },
    },
    yAxis: {
      type: "category",
      data: sorted.map((d) => d.name),
      inverse: true,
      axisLine: { lineStyle: { color: GRID_COLOR } },
      axisLabel: { fontFamily: "'Roboto', sans-serif", fontSize: 12, color: "#3c4858" },
    },
    series: [
      {
        type: "bar",
        data: sorted.map((d) => d.value),
        barMaxWidth: 28,
        itemStyle: { color: PRIMARY, borderRadius: [0, 4, 4, 0] },
      },
    ],
  };

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      style={{ height: Math.max(200, sorted.length * 40 + 48), width: "100%" }}
      notMerge
      lazyUpdate
    />
  );
}
