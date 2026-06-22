"use client";

import { useId } from "react";
import { Area, AreaChart, YAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

/**
 * Tiny trend sparkline for a KPI card — built on the shadcn <ChartContainer>
 * (Recharts). No axes/grid/tooltip; just a filled area line of `data`.
 */
export function KpiSparkline({
  data,
  color = "var(--color-brand-500)",
}: {
  data: number[];
  color?: string;
}) {
  const id = useId().replace(/:/g, "");
  const chartData = data.map((v, i) => ({ i, v }));
  // Anchor every sparkline to its OWN minimum so the line always rests on the
  // bottom edge — consistent whether the series is flat or spiky.
  const min = data.length ? Math.min(...data) : 0;
  const max = data.length ? Math.max(...data) : 1;
  const domain: [number, number] = [min, max === min ? min + 1 : max];
  const config = { v: { label: "", color } } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="aspect-auto h-12 w-full">
      <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={domain} />
        <Area
          dataKey="v"
          type="monotone"
          stroke={color}
          strokeWidth={1.6}
          fill={`url(#spark-${id})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
