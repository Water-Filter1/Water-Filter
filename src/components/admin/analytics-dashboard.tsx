"use client";

import { useRouter } from "next/navigation";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Label as ChartLabel } from "recharts";
import { Users, Eye, ShoppingBag, Percent, Megaphone, MonitorSmartphone, PackageSearch, Globe, Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";
import type { StoreAnalytics } from "@/lib/data";
import { KpiCard } from "@/components/admin/kpi-card";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const SOURCE_COLORS: Record<string, string> = {
  facebook: "#1877F2",
  instagram: "#E1306C",
  tiktok: "#111827",
  google: "#4285F4",
  snapchat: "#E0A100",
  youtube: "#FF0000",
  bing: "#0C8484",
  referral: "#64748b",
  direct: "#94a3b8",
};
const DEVICE_COLORS: Record<string, string> = {
  mobile: "var(--color-brand-500)",
  desktop: "#6366f1",
  tablet: "#f59e0b",
};

// Localize ISO country codes (MA -> Maroc) for the countries list.
let regionFmt: Intl.DisplayNames | null = null;
try {
  regionFmt = new Intl.DisplayNames(["fr"], { type: "region" });
} catch {
  /* Intl.DisplayNames unsupported — fall back to the raw code */
}
const countryName = (code: string) => {
  try {
    return regionFmt?.of(code) ?? code;
  } catch {
    return code;
  }
};

/** Card header: small uppercase label + icon. */
function Head({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className="h-4 w-4 text-ink-soft" />
      <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">{title}</p>
    </div>
  );
}

function EmptyMini({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm font-semibold text-ink-soft">{message}</p>;
}

export function AnalyticsDashboard({ data }: { data: StoreAnalytics }) {
  const { t } = useI18n();
  const router = useRouter();

  const srcLabel = (s: string) =>
    s === "direct" ? t("admin.analytics.direct") : s === "referral" ? t("admin.analytics.referral") : s.charAt(0).toUpperCase() + s.slice(1);
  const devLabel = (d: string) => t(`admin.analytics.device.${d}`);

  const visitorsTrend = data.trend.map((d) => d.visitors);
  const viewsTrend = data.trend.map((d) => d.views);
  const visitorsDelta = data.prevVisitors > 0 ? Math.round(((data.visitors - data.prevVisitors) / data.prevVisitors) * 100) : undefined;

  const kpis = [
    { icon: Users, tone: "bg-brand-50 text-brand-600", glow: "bg-brand-400", label: t("admin.analytics.kpiVisitors"), value: String(data.visitors), trend: visitorsDelta, spark: visitorsTrend, sparkColor: "var(--color-brand-500)" },
    { icon: Eye, tone: "bg-sky-50 text-sky-600", glow: "bg-sky-400", label: t("admin.analytics.kpiViews"), value: String(data.pageViews), hint: t("admin.analytics.kpiViewsHint"), spark: viewsTrend, sparkColor: "#0ea5e9" },
    { icon: ShoppingBag, tone: "bg-emerald-50 text-emerald-600", glow: "bg-emerald-400", label: t("admin.analytics.kpiOrders"), value: String(data.orders), hint: t("admin.analytics.kpiOrdersHint") },
    { icon: Percent, tone: "bg-violet-50 text-violet-600", glow: "bg-violet-400", label: t("admin.analytics.kpiConversion"), value: `${data.conversion}%`, hint: t("admin.analytics.kpiConversionHint") },
  ];

  const periods = [7, 30, 90];
  const trendConfig = { visitors: { label: t("admin.analytics.kpiVisitors"), color: "var(--color-brand-500)" } } satisfies ChartConfig;

  // Devices donut
  const devTotal = data.byDevice.reduce((s, d) => s + d.visitors, 0);
  const devData = data.byDevice.map((d) => ({ key: d.device, label: devLabel(d.device), value: d.visitors, fill: DEVICE_COLORS[d.device] ?? "#94a3b8" }));
  const devConfig = Object.fromEntries(devData.map((d) => [d.key, { label: d.label, color: d.fill }])) satisfies ChartConfig;

  const maxSource = Math.max(...data.bySource.map((s) => s.visitors), 1);
  const maxProduct = Math.max(...data.topProducts.map((p) => p.views), 1);
  const srcTotal = data.bySource.reduce((s, d) => s + d.visitors, 0);

  const fmtPct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div className="space-y-6 font-semibold">
      {/* Header + period toggle */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{t("admin.analyticsPage.title")}</h1>
          <p className="text-sm text-ink-soft">{t("admin.analyticsPage.subtitle")}</p>
        </div>
        <Tabs value={String(data.days)} onValueChange={(v) => router.push(`/admin/analytics?days=${v}`)}>
          <TabsList className="rounded-full bg-slate-100">
            {periods.map((p) => (
              <TabsTrigger key={p} value={String(p)} className="rounded-full px-3 text-xs font-semibold data-active:text-brand-700">
                {t("admin.analytics.periodDays", { n: p })}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      {data.visitors === 0 && (
        <Card className="flex flex-col items-center justify-center gap-2 border-dashed border-slate-300 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
            <Inbox className="h-6 w-6" />
          </div>
          <p className="font-display text-lg font-bold text-ink">{t("admin.analytics.emptyTitle")}</p>
          <p className="max-w-md text-sm font-semibold text-ink-soft">{t("admin.analytics.emptyBody")}</p>
        </Card>
      )}

      {/* Trend + devices */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="gap-3 p-5 xl:col-span-2">
          <Head icon={Users} title={t("admin.analytics.trendTitle")} />
          <ChartContainer config={trendConfig} className="aspect-auto h-56 w-full">
            <AreaChart data={data.trend} margin={{ left: 4, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-visitors)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-visitors)" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} />
              <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
              <ChartTooltip cursor content={<ChartTooltipContent indicator="dot" />} />
              <Area dataKey="visitors" type="monotone" fill="url(#fillVisitors)" stroke="var(--color-visitors)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ChartContainer>
        </Card>

        <Card className="gap-0 p-5">
          <Head icon={MonitorSmartphone} title={t("admin.analytics.devicesTitle")} />
          {devTotal === 0 ? (
            <EmptyMini message={t("admin.analytics.noData")} />
          ) : (
            <div className="flex items-center gap-4">
              <ChartContainer config={devConfig} className="aspect-square h-28 w-28 shrink-0">
                <PieChart>
                  <Pie data={devData} dataKey="value" nameKey="key" innerRadius={34} outerRadius={52} strokeWidth={2}>
                    {devData.map((d) => (
                      <Cell key={d.key} fill={d.fill} />
                    ))}
                    <ChartLabel
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && viewBox.cx != null && viewBox.cy != null) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-ink font-extrabold" fontSize="18">{devTotal}</tspan>
                            </text>
                          );
                        }
                        return null;
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
              <ul className="min-w-0 flex-1 space-y-2 text-xs">
                {devData.map((d) => (
                  <li key={d.key} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.fill }} />
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink">{d.label}</span>
                    <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-ink-soft">{fmtPct(d.value, devTotal)}% · {d.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {/* Sources + top products */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="gap-0 p-5">
          <Head icon={Megaphone} title={t("admin.analytics.sourcesTitle")} />
          {data.bySource.length === 0 ? (
            <EmptyMini message={t("admin.analytics.noData")} />
          ) : (
            <ul className="space-y-3.5">
              {data.bySource.map((s) => (
                <li key={s.source}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 truncate font-semibold text-ink">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SOURCE_COLORS[s.source] ?? "#94a3b8" }} />
                      {srcLabel(s.source)}
                    </span>
                    <span className="shrink-0 font-bold tabular-nums text-ink">{s.visitors}</span>
                  </div>
                  <Progress
                    value={Math.max(3, Math.round((s.visitors / maxSource) * 100))}
                    className="h-1.5 [&_[data-slot=progress-indicator]]:bg-brand-500 [&_[data-slot=progress-track]]:bg-slate-100"
                  />
                  <p className="mt-1 text-[11px] font-semibold tabular-nums text-ink-soft">{fmtPct(s.visitors, srcTotal)}% {t("admin.analytics.ofVisitors")}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="gap-0 p-5">
          <Head icon={PackageSearch} title={t("admin.analytics.topProductsTitle")} />
          {data.topProducts.length === 0 ? (
            <EmptyMini message={t("admin.analytics.noData")} />
          ) : (
            <ol className="space-y-3.5">
              {data.topProducts.map((p, i) => (
                <li key={p.slug} className="flex items-center gap-3">
                  <span className="w-3.5 shrink-0 text-right text-xs font-bold tabular-nums text-slate-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink" dir="auto">{p.name}</p>
                    <Progress
                      value={Math.max(6, Math.round((p.views / maxProduct) * 100))}
                      className="mt-1 h-1 [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-brand-500 [&_[data-slot=progress-indicator]]:to-aqua-400 [&_[data-slot=progress-track]]:bg-slate-100"
                    />
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-ink">{p.views}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* Funnel + countries */}
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card className="gap-0 p-5">
          <Head icon={Percent} title={t("admin.analytics.funnelTitle")} />
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: t("admin.analytics.funnelVisitors"), value: data.funnel.visitors, sub: "100%" },
              { label: t("admin.analytics.funnelProduct"), value: data.funnel.productViewers, sub: `${fmtPct(data.funnel.productViewers, data.funnel.visitors)}%` },
              { label: t("admin.analytics.funnelOrders"), value: data.funnel.orders, sub: `${fmtPct(data.funnel.orders, data.funnel.visitors)}%` },
            ].map((step) => (
              <Card key={step.label} className="gap-0 border-0 bg-muted/50 p-4 text-center shadow-none">
                <p className="font-display text-2xl font-extrabold tabular-nums text-ink">{step.value}</p>
                <p className="mt-1 text-xs font-semibold text-ink-soft">{step.label}</p>
                <p className="mt-0.5 text-[11px] font-bold text-brand-600">{step.sub}</p>
              </Card>
            ))}
          </div>
        </Card>

        <Card className="gap-0 p-5">
          <Head icon={Globe} title={t("admin.analytics.countriesTitle")} />
          {data.byCountry.length === 0 ? (
            <EmptyMini message={t("admin.analytics.noCountries")} />
          ) : (
            <ul className="space-y-2 text-sm">
              {data.byCountry.map((c) => (
                <li key={c.country} className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink" dir="auto">{countryName(c.country)}</span>
                  <span className="font-semibold tabular-nums text-ink-soft">{c.visitors}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
