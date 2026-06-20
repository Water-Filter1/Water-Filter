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
  Users,
  Wallet,
  HardHat,
} from "lucide-react";
import {
  getDashboardOverview,
  getConfirmationToday,
  getTechnicianPerformance,
  getRecentActivity,
  getSalesSeries,
  getLowStockProducts,
  getTopSellers,
  getOrders,
} from "@/lib/data";
import { StatusBadge } from "@/components/admin/status-badge";
import { SalesChart } from "@/components/admin/sales-chart";
import { ActivityFeed } from "@/components/admin/activity-feed";
import { STATUS_META, STATUS_ORDER } from "@/lib/order-status";
import { formatMAD } from "@/lib/utils";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

const RING = 2 * Math.PI * 48;

export default async function AdminDashboard() {
  const { t } = await getT();
  const [overview, conf, techPerf, activity, salesSeries, lowStock, topSellers, allOrders] =
    await Promise.all([
      getDashboardOverview(),
      getConfirmationToday(),
      getTechnicianPerformance(),
      getRecentActivity(12),
      getSalesSeries(),
      getLowStockProducts(5, 6),
      getTopSellers(5),
      getOrders(),
    ]);
  const recent = allOrders.slice(0, 6);

  const fmtPct = (p: number | null) => (p === null ? null : `${p >= 0 ? "+" : ""}${p}%`);
  const revPct = fmtPct(overview.revenueMoMPct);
  const ordPct = fmtPct(overview.ordersMoMPct);

  const opCards = [
    { icon: ShoppingBag, tone: "bg-brand-50 text-brand-600", label: t("admin.dash.kpiNewOrders"), value: String(overview.newOrdersToday), hint: t("admin.dash.kpiNewOrdersHint"), href: "/admin/orders" },
    { icon: Clock, tone: "bg-amber-50 text-amber-600", label: t("admin.dash.kpiToConfirm"), value: String(overview.pending), hint: t("admin.dash.kpiToConfirmHint"), href: "/admin/orders?status=pending" },
    { icon: Wrench, tone: "bg-indigo-50 text-indigo-600", label: t("admin.dash.kpiInstallsToday"), value: String(overview.installationsToday), hint: t("admin.dash.kpiInstallsHint"), href: "/admin/maintenance" },
    { icon: Bell, tone: "bg-orange-50 text-orange-600", label: t("admin.dash.kpiSavDue"), value: String(overview.savDue), hint: t("admin.dash.kpiSavHint"), href: "/admin/maintenance" },
  ];

  const bizCards = [
    { icon: Banknote, tone: "bg-emerald-50 text-emerald-600", label: t("admin.dash.kpiRevenueMonth"), value: formatMAD(overview.revenueThisMonth), hint: revPct ? t("admin.dash.vsLastMonth", { pct: revPct }) : "", href: "/admin/orders" },
    { icon: ShoppingBag, tone: "bg-brand-50 text-brand-600", label: t("admin.dash.kpiOrdersMonth"), value: String(overview.ordersThisMonth), hint: ordPct ? t("admin.dash.vsLastMonth", { pct: ordPct }) : "", href: "/admin/orders" },
    { icon: Package, tone: "bg-sky-50 text-sky-600", label: t("admin.dash.kpiStockTotal"), value: String(overview.stockTotal), hint: t("admin.dash.kpiStockHint"), href: "/admin/products" },
    { icon: AlertTriangle, tone: "bg-rose-50 text-rose-600", label: t("admin.dash.kpiToReorder"), value: String(overview.lowStockCount), hint: t("admin.dash.kpiToReorderHint"), href: "/admin/products" },
  ];

  const confRows = [
    { label: t("admin.dash.confReceived"), value: conf.received, dot: "bg-slate-400" },
    { label: t("admin.dash.confConfirmed"), value: conf.confirmed, dot: "bg-emerald-500" },
    { label: t("admin.dash.confCancelled"), value: conf.cancelled, dot: "bg-rose-500" },
    { label: t("admin.dash.confNoAnswer"), value: conf.noAnswer, dot: "bg-amber-500" },
    { label: t("admin.dash.confCallback"), value: conf.callback, dot: "bg-orange-500" },
    { label: t("admin.dash.confUntreated"), value: conf.untreated, dot: "bg-slate-300" },
  ];

  const quick = [
    { icon: Users, label: t("admin.dash.quickActiveClients"), value: String(overview.activeClients) },
    { icon: Wrench, label: t("admin.dash.quickInstalled"), value: String(overview.installedDevices) },
    { icon: Wallet, label: t("admin.dash.quickRevenueTotal"), value: formatMAD(overview.revenueTotal) },
    { icon: HardHat, label: t("admin.dash.quickTechnicians"), value: String(overview.technicians) },
  ];

  return (
    <div>
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
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {bizCards.map((c) => (
          <KpiCard key={c.label} {...c} />
        ))}
      </div>

      {/* Sales chart */}
      <div className="mt-6">
        <SalesChart series={salesSeries} />
      </div>

      {/* Confirmation today + Activity feed */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-display font-bold text-ink">{t("admin.dash.confTitle")}</h2>
          <div className="flex items-center gap-5">
            <div className="relative h-32 w-32 shrink-0">
              <svg viewBox="0 0 120 120" className="h-32 w-32 text-brand-500">
                <circle cx="60" cy="60" r="48" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(conf.rate / 100) * RING} ${RING}`}
                  transform="rotate(-90 60 60)"
                />
                <text x="60" y="58" textAnchor="middle" className="fill-ink font-bold" fontSize="22">
                  {conf.rate}%
                </text>
                <text x="60" y="74" textAnchor="middle" className="fill-slate-400" fontSize="9">
                  {t("admin.dash.confRate")}
                </text>
              </svg>
            </div>
            <ul className="flex-1 space-y-1.5 text-sm">
              {confRows.map((r) => (
                <li key={r.label} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-ink-soft">
                    <span className={`h-2.5 w-2.5 rounded-full ${r.dot}`} /> {r.label}
                  </span>
                  <span className="font-semibold text-ink">{r.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ActivityFeed items={activity} />
      </div>

      {/* Recent orders + Technician performance */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-display font-bold text-ink">{t("admin.dash.recentOrders")}</h2>
            <Link href="/admin/orders" className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              {t("admin.dash.seeAll")} <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-5 py-3 font-semibold">{t("admin.dash.thOrder")}</th>
                  <th className="px-5 py-3 font-semibold">{t("admin.dash.thCustomer")}</th>
                  <th className="px-5 py-3 font-semibold">{t("admin.dash.thTotal")}</th>
                  <th className="px-5 py-3 font-semibold">{t("admin.dash.thStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand-700 hover:underline">
                        {o.id}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink" dir="auto">{o.customerName}</p>
                      <p className="text-xs text-ink-soft" dir="auto">{o.city}</p>
                    </td>
                    <td className="px-5 py-3 font-semibold text-ink">{formatMAD(o.total)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <HardHat className="h-4 w-4" />
            </span>
            <h2 className="font-display font-bold text-ink">{t("admin.dash.techTitle")}</h2>
          </div>
          {techPerf.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink-soft">{t("admin.dash.techEmpty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-ink-soft">
                    <th className="px-5 py-3 font-semibold">{t("admin.dash.techName")}</th>
                    <th className="px-5 py-3 font-semibold">{t("admin.dash.techInstalls")}</th>
                    <th className="px-5 py-3 font-semibold">{t("admin.dash.techSav")}</th>
                    <th className="px-5 py-3 font-semibold">{t("admin.dash.techRevenue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {techPerf.map((p) => (
                    <tr key={p.email} className="border-t border-slate-100">
                      <td className="px-5 py-3 font-medium text-ink" dir="auto">{p.name}</td>
                      <td className="px-5 py-3 text-ink">{p.installs}</td>
                      <td className="px-5 py-3 text-ink">{p.sav}</td>
                      <td className="px-5 py-3 font-semibold text-ink">{formatMAD(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Orders by status */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display font-bold text-ink">{t("admin.dash.ordersByStatus")}</h2>
          <Link href="/admin/orders" className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
            {t("admin.dash.seeAll")} <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATUS_ORDER.map((st) => {
            const meta = STATUS_META[st];
            return (
              <Link
                key={st}
                href={`/admin/orders?status=${st}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {t(`status.${st}`)}
                </span>
                <p className="mt-3 font-display text-2xl font-extrabold text-ink">{overview.byStatus[st] ?? 0}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Low stock + Top sellers */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Package className="h-4 w-4" />
              </span>
              <h2 className="font-display font-bold text-ink">{t("admin.dash.lowStock")}</h2>
            </div>
            <Link href="/admin/products" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              {t("admin.dash.manageInventory")}
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink-soft">{t("admin.dash.stockOk")}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {lowStock.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/products/${p.id}/edit`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Package className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p dir="auto" className="line-clamp-1 text-sm font-medium text-ink">{p.name}</p>
                    <p className="text-xs text-ink-soft">{t(`cat.${p.categorySlug}.name`)}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                      p.stock <= 2 ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {p.stock > 1
                      ? t("admin.dash.stockRemainingPlural", { n: p.stock })
                      : t("admin.dash.stockRemaining", { n: p.stock })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <TrendingUp className="h-4 w-4" />
              </span>
              <h2 className="font-display font-bold text-ink">{t("admin.dash.topSellers")}</h2>
            </div>
            <Link href="/admin/products" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              {t("admin.dash.products")}
            </Link>
          </div>
          {topSellers.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink-soft">{t("admin.dash.noSalesYet")}</p>
          ) : (
            <div className="space-y-4 px-5 py-5">
              {topSellers.map((p, i) => {
                const max = topSellers[0].units || 1;
                const pct = Math.max(6, Math.round((p.units / max) * 100));
                return (
                  <div key={p.name}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span dir="auto" className="line-clamp-1 font-medium text-ink">
                        <span className="text-ink-soft">{i + 1}.</span> {p.name}
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-ink-soft">
                        {p.units > 1 ? t("admin.dash.unitsPlural", { n: p.units }) : t("admin.dash.units", { n: p.units })}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-aqua-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick info */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {quick.map((q) => (
          <div key={q.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-ink-soft">
              <q.icon className="h-4 w-4" />
              <span className="text-xs">{q.label}</span>
            </div>
            <p className="mt-2 font-display text-xl font-extrabold text-ink">{q.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  tone,
  label,
  value,
  hint,
  href,
}: {
  icon: typeof ShoppingBag;
  tone: string;
  label: string;
  value: string;
  hint: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50/30"
    >
      <div className="flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        {hint && <span className="text-xs text-ink-soft">{hint}</span>}
      </div>
      <p className="mt-4 font-display text-2xl font-extrabold text-ink">{value}</p>
      <p className="text-sm text-ink-soft">{label}</p>
    </Link>
  );
}
