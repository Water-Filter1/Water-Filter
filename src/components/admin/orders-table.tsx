"use client";

import Link from "next/link";
import { Phone, Eye } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/admin/data-table";
import { formatMAD, formatDate } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-context";
import type { Order } from "@/lib/types";

export function OrdersTable({ orders }: { orders: Order[] }) {
  const { t } = useI18n();

  const columns: Column<Order>[] = [
    {
      key: "order",
      header: t("admin.ordersPage.colOrder"),
      cell: (o) => (
        <>
          <Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand-700 hover:underline">
            {o.id}
          </Link>
          <p className="text-xs text-ink-soft">
            {o.items.length > 1
              ? t("admin.ordersPage.itemsPlural", { count: o.items.length })
              : t("admin.ordersPage.itemsSingular", { count: o.items.length })}
          </p>
        </>
      ),
    },
    {
      key: "customer",
      header: t("admin.ordersPage.colCustomer"),
      cell: (o) => (
        <>
          <p className="font-semibold text-ink" dir="auto">{o.customerName}</p>
          <a href={`tel:${o.phone}`} className="flex items-center gap-1 text-xs text-ink-soft hover:text-brand-600" dir="ltr">
            <Phone className="h-3 w-3" /> {o.phone}
          </a>
        </>
      ),
    },
    {
      key: "city",
      header: t("admin.ordersPage.colCity"),
      className: "text-ink-soft",
      cell: (o) => <span dir="auto">{o.city}</span>,
    },
    {
      key: "total",
      header: t("admin.ordersPage.colTotal"),
      sort: (o) => o.total,
      className: "font-semibold text-ink",
      cell: (o) => formatMAD(o.total),
    },
    {
      key: "date",
      header: t("admin.ordersPage.colDate"),
      sort: (o) => new Date(o.createdAt).getTime(),
      className: "text-ink-soft",
      cell: (o) => formatDate(o.createdAt),
    },
    {
      key: "status",
      header: t("admin.ordersPage.colStatus"),
      cell: (o) => (
        <>
          <StatusBadge status={o.status} />
          {o.status === "pending" && o.lastOutcome && (
            <Badge
              className={`mt-1 ${
                o.lastOutcome === "rappeler"
                  ? "bg-amber-100 text-amber-700"
                  : o.lastOutcome === "pas_reponse"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-slate-100 text-ink-soft"
              }`}
            >
              {o.lastOutcome === "rappeler"
                ? t("admin.ordersPage.outcomeCallBack")
                : o.lastOutcome === "pas_reponse"
                  ? o.callAttempts > 1
                    ? t("admin.ordersPage.outcomeNoAnswerCount", { count: o.callAttempts })
                    : t("admin.ordersPage.outcomeNoAnswer")
                  : t("admin.ordersPage.outcomeToProcess")}
            </Badge>
          )}
        </>
      ),
    },
    {
      key: "action",
      header: t("admin.ordersPage.colAction"),
      headClassName: "text-end",
      className: "text-end",
      cell: (o) => (
        <Button
          href={`/admin/orders/${o.id}`}
          variant="ghost"
          size="icon-sm"
          className="text-ink-soft hover:bg-brand-50 hover:text-brand-600"
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">{t("admin.ordersPage.view")}</span>
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      rows={orders}
      columns={columns}
      getRowId={(o) => o.id}
      search={(o) => `${o.id} ${o.customerName} ${o.city} ${o.phone} ${o.phone.replace(/\s/g, "")}`}
      searchPlaceholder={t("admin.ordersPage.searchPlaceholder")}
      csv={{
        filename: "orders.csv",
        row: (o) => ({
          Order: o.id,
          Customer: o.customerName,
          Phone: o.phone,
          City: o.city,
          Total: o.total,
          Date: formatDate(o.createdAt),
          Status: o.status,
        }),
      }}
      defaultSortKey="date"
      defaultSortDir="desc"
      emptyText={t("admin.ordersPage.empty")}
      minWidth="min-w-[820px]"
    />
  );
}
