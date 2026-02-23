"use client";

import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { TimelineBucket } from "@/types/api";

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const COLORS = ["#4a77f0", "#fdc530", "#34c38f", "#e74c3c", "#9b59b6", "#f39c12", "#1abc9c"];
const GRID_COLOR = "#eff0f6";

function formatBucket(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface TimelineChartProps {
  data: TimelineBucket[];
}

export function TimelineChart({ data }: TimelineChartProps) {
  if (!data.length) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#8e99a4", fontFamily: "'Roboto', sans-serif" }}>
        No timeline data available.
      </div>
    );
  }

  // Group by event_name, collect unique buckets
  const bucketSet = new Set<string>();
  const seriesMap = new Map<string, Map<string, number>>();

  for (const item of data) {
    const label = formatBucket(item.bucket);
    bucketSet.add(label);
    if (!seriesMap.has(item.event_name)) {
      seriesMap.set(item.event_name, new Map());
    }
    const m = seriesMap.get(item.event_name)!;
    m.set(label, (m.get(label) ?? 0) + item.count);
  }

  const buckets = [...bucketSet].sort();
  const seriesEntries = [...seriesMap.entries()];

  const option: echarts.EChartsCoreOption = {
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
    grid: {
      left: 48,
      right: 16,
      top: 16,
      bottom: seriesEntries.length > 1 ? 40 : 16,
      containLabel: false,
    },
    xAxis: {
      type: "category",
      data: buckets,
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
    series: seriesEntries.map(([name, counts], i) => ({
      name,
      type: "bar",
      data: buckets.map((b) => counts.get(b) ?? 0),
      itemStyle: { color: COLORS[i % COLORS.length], borderRadius: [3, 3, 0, 0] },
      barMaxWidth: 32,
    })),
  };

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
