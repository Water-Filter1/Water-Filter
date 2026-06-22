"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useI18n } from "@/i18n/i18n-context";
import { formatMAD } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SalesBucket, SalesSeries } from "@/lib/data";

type Range = "day" | "week" | "month";

export function SalesChart({ series }: { series: SalesSeries }) {
  const { t } = useI18n();
  const [range, setRange] = useState<Range>("month");

  const labelOf = (b: SalesBucket) =>
    range === "day" ? `${b.hour}h` : range === "week" ? t(`common.dow.${b.dow}`) : b.date ?? "";
  const data = series[range].map((b) => ({ label: labelOf(b), revenue: b.revenue }));
  const total = data.reduce((s, d) => s + d.revenue, 0);

  const chartConfig = {
    revenue: { label: t("admin.dash.salesTitle"), color: "var(--color-brand-500)" },
  } satisfies ChartConfig;

  const ranges: { key: Range; label: string }[] = [
    { key: "day", label: t("admin.dash.rangeDay") },
    { key: "week", label: t("admin.dash.rangeWeek") },
    { key: "month", label: t("admin.dash.rangeMonth") },
  ];

  return (
    <Card className="h-full gap-4">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 px-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-brand-500" />
          <CardTitle className="font-display font-bold text-ink">{t("admin.dash.salesTitle")}</CardTitle>
          <span className="font-display text-sm font-bold text-ink">{formatMAD(total)}</span>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList className="rounded-full bg-slate-100">
            {ranges.map((r) => (
              <TabsTrigger
                key={r.key}
                value={r.key}
                className="rounded-full px-3 text-xs font-semibold data-active:text-brand-700"
              >
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <ChartContainer config={chartConfig} className="aspect-auto h-full min-h-[240px] w-full">
            <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                domain={[0, (max: number) => (max > 0 ? Math.ceil((max * 1.2) / 1000) * 1000 : 1000)]}
                tickFormatter={(v) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : `${v}`)}
              />
              <ChartTooltip
                cursor
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    formatter={(value) => formatMAD(Number(value))}
                  />
                }
              />
              <Area
                dataKey="revenue"
                type="monotone"
                fill="url(#fillRevenue)"
                stroke="var(--color-revenue)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
