"use client";

import { Label, Pie, PieChart } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

/**
 * Confirmation-rate donut — built on the shadcn <ChartContainer> (Recharts),
 * replacing the previous hand-drawn <svg>. Shows the rate as a filled arc with
 * the percentage in the center.
 */
export function ConfirmationDonut({ rate, label }: { rate: number; label: string }) {
  const data = [
    { key: "rate", value: Math.max(0, Math.min(100, rate)), fill: "var(--color-brand-500)" },
    { key: "rest", value: Math.max(0, 100 - rate), fill: "#f1f5f9" },
  ];
  const config = { rate: { label } } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="mx-auto aspect-square h-40 w-40">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="key"
          innerRadius={54}
          outerRadius={74}
          strokeWidth={2}
          startAngle={90}
          endAngle={-270}
        >
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && viewBox.cx != null && viewBox.cy != null) {
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={viewBox.cy} className="fill-ink font-extrabold" fontSize="28">
                      {rate}%
                    </tspan>
                    <tspan x={viewBox.cx} y={viewBox.cy + 18} className="fill-slate-400 font-semibold" fontSize="10">
                      {label}
                    </tspan>
                  </text>
                );
              }
              return null;
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
