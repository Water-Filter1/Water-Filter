import Link from "next/link";
import {
  ShoppingBag,
  Clock,
  Wrench,
  Bell,
  Banknote,
  Package,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  Wallet,
  HardHat,
  Headphones,
  Inbox,
  Check,
  X,
  PhoneOff,
  Minus,
  Phone,
  PhoneMissed,
} from "@/components/admin/phosphor";
import {
  getDashboardData,
} from "@/lib/data";
import { StatusBadge } from "@/components/admin/status-badge";
import { SalesChart } from "@/components/admin/sales-chart";
import { ActivityFeed } from "@/components/admin/activity-feed";
import { ConfirmationDonut } from "@/components/admin/confirmation-donut";
import { AgendaTimeline } from "@/components/admin/agenda-timeline";
import { FacturesCard } from "@/components/admin/factures-card";
import { IconProvider } from "@/components/admin/icon-provider";
import { KpiCard } from "@/components/admin/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatMAD, cn } from "@/lib/utils";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { t } = await getT();
  // Whole dashboard data, cached (Next Data Cache) — see getDashboardData in data.ts.
  const {
    overview,
    conf,
    techPerf,
    confPerf,
    activity,
    salesSeries,
    dailyExpenses,
    orderActivity,
    metricSeries,
    lowStock,
    topSellers,
    allOrders,
    finance,
    upcomingJobs,
    invoiceableOrders,
    recentInvoices,
  } = await getDashboardData();
  const recent = allOrders.slice(0, 6);

  // 30-day daily series for the KPI sparklines (real data).
  const revSpark = salesSeries.month.map((b) => b.revenue);
  const ordSpark = salesSeries.month.map((b) => b.count);
  const profitSpark = revSpark.map((r, i) => r - (dailyExpenses[i] ?? 0));
  const techTotals = techPerf.reduce(
    (a, p) => ({ installs: a.installs + p.installs, sav: a.sav + p.sav, revenue: a.revenue + p.revenue, commission: a.commission + p.commission }),
    { installs: 0, sav: 0, revenue: 0, commission: 0 },
  );
  const confTotals = confPerf.reduce(
    (a, p) => ({ confirmed: a.confirmed + p.confirmed, cancelled: a.cancelled + p.cancelled, calls: a.calls + p.calls, whatsapp: a.whatsapp + p.whatsapp, revenue: a.revenue + p.revenue }),
    { confirmed: 0, cancelled: 0, calls: 0, whatsapp: 0, revenue: 0 },
  );

  const opCards = [
    { icon: ShoppingBag, tone: "bg-brand-50 text-brand-600", glow: "bg-brand-400", label: t("admin.dash.kpiNewOrders"), value: String(overview.newOrdersToday), hint: t("admin.dash.kpiNewOrdersHint"), href: "/admin/orders", spark: orderActivity.newOrders, sparkColor: "var(--color-brand-500)" },
    { icon: Clock, tone: "bg-amber-50 text-amber-600", glow: "bg-amber-400", label: t("admin.dash.kpiToConfirm"), value: String(overview.pending), hint: t("admin.dash.kpiToConfirmHint"), href: "/admin/orders?status=pending", spark: metricSeries.pending, sparkColor: "#f59e0b" },
    { icon: Wrench, tone: "bg-indigo-50 text-indigo-600", glow: "bg-indigo-400", label: t("admin.dash.kpiInstallsToday"), value: String(overview.installationsToday), hint: t("admin.dash.kpiInstallsHint"), href: "/admin/orders?status=confirmed", spark: orderActivity.installs, sparkColor: "#6366f1" },
    { icon: Bell, tone: "bg-orange-50 text-orange-600", glow: "bg-orange-400", label: t("admin.dash.kpiSavDue"), value: String(overview.savDue), hint: t("admin.dash.kpiSavHint"), href: "/admin/service", spark: metricSeries.savDue, sparkColor: "#f97316" },
  ];

  const bizCards = [
    { icon: Banknote, tone: "bg-emerald-50 text-emerald-600", glow: "bg-emerald-400", label: t("admin.dash.kpiRevenueMonth"), value: formatMAD(overview.revenueThisMonth), trend: overview.revenueMoMPct, href: "/admin/orders", spark: revSpark, sparkColor: "#10b981" },
    { icon: TrendingUp, tone: "bg-brand-50 text-brand-600", glow: "bg-brand-400", label: t("admin.charges.kpiProfit"), value: formatMAD(finance.profitMonth), trend: finance.profitMoMPct, href: "/admin/charges", spark: profitSpark, sparkColor: "var(--color-brand-500)" },
    { icon: Wallet, tone: "bg-rose-50 text-rose-600", glow: "bg-rose-400", label: t("admin.charges.kpiExpenses"), value: formatMAD(finance.expensesMonth), href: "/admin/charges", spark: dailyExpenses, sparkColor: "#f43f5e" },
    { icon: ShoppingBag, tone: "bg-indigo-50 text-indigo-600", glow: "bg-indigo-400", label: t("admin.dash.kpiOrdersMonth"), value: String(overview.ordersThisMonth), trend: overview.ordersMoMPct, href: "/admin/orders", spark: ordSpark, sparkColor: "#6366f1" },
    { icon: Package, tone: "bg-sky-50 text-sky-600", glow: "bg-sky-400", label: t("admin.dash.kpiStockTotal"), value: String(overview.stockTotal), hint: t("admin.dash.kpiStockHint"), href: "/admin/stock", spark: metricSeries.stockTotal, sparkColor: "#0ea5e9" },
    { icon: AlertTriangle, tone: "bg-amber-50 text-amber-600", glow: "bg-amber-400", label: t("admin.dash.kpiToReorder"), value: String(overview.lowStockCount), hint: t("admin.dash.kpiToReorderHint"), href: "/admin/stock", spark: metricSeries.lowStockCount, sparkColor: "#f59e0b" },
  ];

  const confRows = [
    { label: t("admin.dash.confReceived"), value: conf.received, Icon: Inbox, tone: "bg-slate-100 text-slate-500" },
    { label: t("admin.dash.confConfirmed"), value: conf.confirmed, Icon: Check, tone: "bg-emerald-50 text-emerald-600" },
    { label: t("admin.dash.confCancelled"), value: conf.cancelled, Icon: X, tone: "bg-rose-50 text-rose-600" },
    { label: t("admin.dash.confNoAnswer"), value: conf.noAnswer, Icon: PhoneOff, tone: "bg-amber-50 text-amber-600" },
    { label: t("admin.dash.confCallback"), value: conf.callback, Icon: Clock, tone: "bg-violet-50 text-violet-600" },
    { label: t("admin.dash.confUntreated"), value: conf.untreated, Icon: Minus, tone: "bg-slate-100 text-slate-400" },
  ];
  const taskRows = [
    { label: t("admin.dash.tasksToCall"), value: conf.toCall, Icon: Phone, tone: "bg-emerald-50 text-emerald-600" },
    { label: t("admin.dash.tasksToCallback"), value: conf.toCallback, Icon: Clock, tone: "bg-amber-50 text-amber-600" },
    { label: t("admin.dash.tasksNoReply"), value: conf.noReply, Icon: PhoneMissed, tone: "bg-rose-50 text-rose-600" },
  ];

  return (
    <IconProvider>
    <div className="font-semibold">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">{t("admin.dash.title")}</h1>
        <p className="text-sm text-ink-soft">{t("admin.dash.subtitle")}</p>
      </div>

      {/* Operational KPIs (today) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {opCards.map((c) => (
          <KpiCard key={c.label} {...c} />
        ))}
      </div>

      {/* Business KPIs (this month) */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {bizCards.map((c) => (
          <KpiCard key={c.label} {...c} />
        ))}
      </div>

      {/* Sales chart + Confirmation today — split 50/50 */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SalesChart series={salesSeries} />
        <Card className="gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-sm ring-0">
          <CardHeader className="px-5 pt-5">
            <CardTitle className="font-display font-bold text-ink">{t("admin.dash.confTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-4">
            <div className="flex flex-col gap-5 sm:flex-row">
            {/* Left: status breakdown (left) + donut (middle) */}
            <div className="flex flex-1 items-center gap-4">
              <div className="min-w-0 flex-1">
              <Table>
                <TableBody>
                  {confRows.map((r) => (
                    <TableRow key={r.label} className="border-0 hover:bg-transparent">
                      <TableCell className="px-0 py-1.5">
                        <span className="flex items-center gap-2.5 font-semibold text-ink">
                          <Badge className={cn("h-7 w-7 justify-center rounded-lg p-0", r.tone)}>
                            <r.Icon className="h-4 w-4" />
                          </Badge>
                          {r.label}
                        </span>
                      </TableCell>
                      <TableCell className="px-0 py-1.5 text-end font-extrabold text-ink">{r.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              <div className="relative h-40 w-40 shrink-0">
                <ConfirmationDonut rate={conf.rate} label={t("admin.dash.confRate")} />
              </div>
            </div>

            {/* Right: Tâches restantes — shadcn Table + footer total, beside the status */}
            <div className="flex flex-col sm:w-[42%] sm:shrink-0 sm:border-s sm:border-slate-100 sm:ps-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {t("admin.dash.tasksTitle")}
              </p>
              <Table>
                <TableBody>
                  {taskRows.map((r) => (
                    <TableRow key={r.label} className="border-0 hover:bg-transparent">
                      <TableCell className="px-0 py-1.5">
                        <span className="flex items-center gap-2.5 font-semibold text-ink">
                          <Badge className={cn("h-7 w-7 justify-center rounded-lg p-0", r.tone)}>
                            <r.Icon className="h-4 w-4" />
                          </Badge>
                          {r.label}
                        </span>
                      </TableCell>
                      <TableCell className="px-0 py-1.5 text-end font-extrabold text-ink">{r.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="border-0 bg-transparent">
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableCell className="px-0 py-2">
                      <Badge className="rounded-md bg-brand-50 px-2.5 py-1 text-sm font-semibold text-brand-800">
                        {t("admin.dash.tasksTotal")}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-0 py-2 text-end font-display text-lg font-extrabold text-brand-700">
                      {conf.totalRemaining}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent orders (2/3) + Activity feed (1/3) */}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="gap-0 overflow-hidden rounded-2xl p-0 xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 px-5 py-4">
            <CardTitle className="font-display font-bold text-ink">{t("admin.dash.recentOrders")}</CardTitle>
            <Link href="/admin/orders" className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              {t("admin.dash.seeAll")} <ArrowUpRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs uppercase tracking-wide text-ink-soft">
                  <TableHead>{t("admin.dash.thOrder")}</TableHead>
                  <TableHead>{t("admin.dash.thCustomer")}</TableHead>
                  <TableHead>{t("admin.dash.thTotal")}</TableHead>
                  <TableHead>{t("admin.dash.thStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((o) => (
                  <TableRow key={o.id} className="hover:bg-slate-50">
                    <TableCell>
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand-700 hover:underline">
                        {o.id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-ink" dir="auto">{o.customerName}</p>
                      <p className="text-xs text-ink-soft" dir="auto">{o.city}</p>
                    </TableCell>
                    <TableCell className="font-semibold text-ink">{formatMAD(o.total)}</TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <ActivityFeed items={activity} />
      </div>

      {/* Technician performance + Confirmation performance (1/2 each) */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="gap-0 overflow-hidden rounded-2xl p-0">
          <CardHeader className="flex flex-row items-center gap-2 border-b border-slate-200 px-5 py-4">
            <Badge className="h-8 w-8 justify-center rounded-lg bg-indigo-50 p-0 text-indigo-600">
              <HardHat className="h-4 w-4" />
            </Badge>
            <CardTitle className="font-display font-bold text-ink">{t("admin.dash.techTitle")}</CardTitle>
          </CardHeader>
          {techPerf.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink-soft">{t("admin.dash.techEmpty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs uppercase tracking-wide text-ink-soft">
                    <TableHead>{t("admin.dash.techName")}</TableHead>
                    <TableHead>{t("admin.dash.techInstalls")}</TableHead>
                    <TableHead>{t("admin.dash.techSav")}</TableHead>
                    <TableHead>{t("admin.dash.techRevenue")}</TableHead>
                    <TableHead>{t("admin.dash.techCommission")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {techPerf.map((p) => (
                    <TableRow key={p.email}>
                      <TableCell dir="auto">
                        <span className="flex items-center gap-2">
                          <Avatar className="size-7">
                            <AvatarFallback className="bg-indigo-100 text-xs font-bold text-indigo-700">{p.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-ink">{p.name}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-ink">{p.installs}</TableCell>
                      <TableCell className="text-ink">{p.sav}</TableCell>
                      <TableCell className="font-semibold text-ink">{formatMAD(p.revenue)}</TableCell>
                      <TableCell className="font-semibold text-ink">{formatMAD(p.commission)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-semibold text-ink">
                    <TableCell>{t("admin.dash.total")}</TableCell>
                    <TableCell>{techTotals.installs}</TableCell>
                    <TableCell>{techTotals.sav}</TableCell>
                    <TableCell>{formatMAD(techTotals.revenue)}</TableCell>
                    <TableCell>{formatMAD(techTotals.commission)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </Card>

        <Card className="gap-0 overflow-hidden rounded-2xl p-0">
          <CardHeader className="flex flex-row items-center gap-2 border-b border-slate-200 px-5 py-4">
            <Badge className="h-8 w-8 justify-center rounded-lg bg-emerald-50 p-0 text-emerald-600">
              <Headphones className="h-4 w-4" />
            </Badge>
            <CardTitle className="font-display font-bold text-ink">{t("admin.dash.confPerfTitle")}</CardTitle>
          </CardHeader>
          {confPerf.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink-soft">{t("admin.dash.cpEmpty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs uppercase tracking-wide text-ink-soft">
                    <TableHead>{t("admin.dash.cpName")}</TableHead>
                    <TableHead>{t("admin.dash.cpConfirmed")}</TableHead>
                    <TableHead>{t("admin.dash.cpCancelled")}</TableHead>
                    <TableHead>{t("admin.dash.cpCalls")}</TableHead>
                    <TableHead>{t("admin.dash.cpWhatsapp")}</TableHead>
                    <TableHead>{t("admin.dash.cpRate")}</TableHead>
                    <TableHead>{t("admin.dash.cpRevenue")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {confPerf.map((p) => (
                    <TableRow key={p.email}>
                      <TableCell dir="auto">
                        <span className="flex items-center gap-2">
                          <Avatar className="size-7">
                            <AvatarFallback className="bg-emerald-100 text-xs font-bold text-emerald-700">{p.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-ink">{p.name}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-ink">{p.confirmed}</TableCell>
                      <TableCell className="text-ink">{p.cancelled}</TableCell>
                      <TableCell className="text-ink">{p.calls}</TableCell>
                      <TableCell className="text-ink">{p.whatsapp}</TableCell>
                      <TableCell className="font-semibold text-ink">{p.rate}%</TableCell>
                      <TableCell className="font-semibold text-ink">{formatMAD(p.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-semibold text-ink">
                    <TableCell>{t("admin.dash.total")}</TableCell>
                    <TableCell>{confTotals.confirmed}</TableCell>
                    <TableCell>{confTotals.cancelled}</TableCell>
                    <TableCell>{confTotals.calls}</TableCell>
                    <TableCell>{confTotals.whatsapp}</TableCell>
                    <TableCell />
                    <TableCell>{formatMAD(confTotals.revenue)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Low stock + Top sellers (1/2 each) */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-sm ring-0">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Badge className="h-8 w-8 justify-center rounded-lg bg-amber-50 p-0 text-amber-600">
                <Package className="h-4 w-4" />
              </Badge>
              <CardTitle className="font-display font-bold text-ink">{t("admin.dash.lowStock")}</CardTitle>
            </div>
            <Link href="/admin/stock" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              {t("admin.dash.manageInventory")}
            </Link>
          </CardHeader>
          {lowStock.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink-soft">{t("admin.dash.stockOk")}</p>
          ) : (
            <Table>
              <TableBody>
                {lowStock.map((p) => (
                  <TableRow key={p.id} className="border-0 hover:bg-slate-50">
                    <TableCell className="py-3 ps-5">
                      <Link href={`/admin/products/${p.id}/edit`} className="flex items-center gap-3">
                        <Badge className="h-9 w-9 shrink-0 justify-center rounded-lg bg-slate-100 p-0 text-slate-500">
                          <Package className="h-4 w-4" />
                        </Badge>
                        <span className="min-w-0">
                          <span dir="auto" className="line-clamp-1 block text-sm font-semibold text-ink">{p.name}</span>
                          <span className="block text-xs text-ink-soft">{t(`cat.${p.categorySlug}.name`)}</span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="py-3 pe-5 text-end">
                      <Badge
                        className={cn(
                          "px-2.5 py-1 text-xs font-bold",
                          p.stock <= 2 ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-700",
                        )}
                      >
                        {p.stock > 1
                          ? t("admin.dash.stockRemainingPlural", { n: p.stock })
                          : t("admin.dash.stockRemaining", { n: p.stock })}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card className="gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-sm ring-0">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Badge className="h-8 w-8 justify-center rounded-lg bg-brand-50 p-0 text-brand-600">
                <TrendingUp className="h-4 w-4" />
              </Badge>
              <CardTitle className="font-display font-bold text-ink">{t("admin.dash.topSellers")}</CardTitle>
            </div>
            <Link href="/admin/products" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              {t("admin.dash.products")}
            </Link>
          </CardHeader>
          {topSellers.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink-soft">{t("admin.dash.noSalesYet")}</p>
          ) : (
            <Table>
              <TableBody>
                {topSellers.map((p, i) => {
                  const max = topSellers[0].units || 1;
                  const pct = Math.max(6, Math.round((p.units / max) * 100));
                  return (
                    <TableRow key={p.name} className="border-0 hover:bg-transparent">
                      <TableCell className="py-3 ps-5">
                        <span dir="auto" className="line-clamp-1 text-sm font-semibold text-ink">
                          <span className="text-ink-soft">{i + 1}.</span> {p.name}
                        </span>
                      </TableCell>
                      <TableCell className="w-[45%] py-3">
                        <Progress
                          value={pct}
                          className="block w-full [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-brand-500 [&_[data-slot=progress-indicator]]:to-aqua-400 [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-slate-100"
                        />
                      </TableCell>
                      <TableCell className="py-3 pe-5 text-end text-xs font-semibold whitespace-nowrap text-ink-soft">
                        {p.units > 1 ? t("admin.dash.unitsPlural", { n: p.units }) : t("admin.dash.units", { n: p.units })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Upcoming jobs agenda + Factures (generate from an order) — 50/50 */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AgendaTimeline items={upcomingJobs} />
        <FacturesCard invoiceable={invoiceableOrders} recent={recentInvoices} />
      </div>
    </div>
    </IconProvider>
  );
}
