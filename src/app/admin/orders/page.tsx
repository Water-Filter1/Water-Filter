import Link from "next/link";
import { getOrders } from "@/lib/data";
import { OrdersTable } from "@/components/admin/orders-table";
import type { OrderStatus } from "@/lib/types";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

const TABS: { key: string; labelKey: string }[] = [
  { key: "", labelKey: "admin.ordersPage.tabAll" },
  { key: "pending", labelKey: "admin.ordersPage.tabPending" },
  { key: "confirmed", labelKey: "admin.ordersPage.tabConfirmed" },
  { key: "installed", labelKey: "admin.ordersPage.tabInstalled" },
  { key: "cancelled", labelKey: "admin.ordersPage.tabCancelled" },
];

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { t } = await getT();
  const params = await searchParams;
  const status = (Array.isArray(params.status) ? params.status[0] : params.status) ?? "";

  const all = await getOrders();
  const list = status ? all.filter((o) => o.status === (status as OrderStatus)) : all;
  const countFor = (key: string) => (key ? all.filter((o) => o.status === key).length : all.length);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">{t("admin.ordersPage.title")}</h1>
        <p className="text-sm text-ink-soft">{t("admin.ordersPage.subtitle")}</p>
      </div>

      {/* Status tabs (deep-linkable) */}
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = status === tab.key;
          return (
            <Link
              key={tab.key}
              href={tab.key ? `/admin/orders?status=${tab.key}` : "/admin/orders"}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "bg-brand-600 text-white"
                  : "border border-slate-200 bg-white text-ink-soft hover:bg-slate-50"
              }`}
            >
              {t(tab.labelKey)}
              <span className={`rounded-full px-1.5 text-xs ${active ? "bg-white/20" : "bg-slate-100 text-ink"}`}>
                {countFor(tab.key)}
              </span>
            </Link>
          );
        })}
      </div>

      <OrdersTable orders={list} />
    </div>
  );
}
