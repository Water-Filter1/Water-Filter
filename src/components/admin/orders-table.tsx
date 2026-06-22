"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Phone, Eye } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { SearchInput } from "@/components/admin/search-input";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatMAD, formatDate } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-context";
import type { Order } from "@/lib/types";

export function OrdersTable({ orders }: { orders: Order[] }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return orders;
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(s) ||
        o.customerName.toLowerCase().includes(s) ||
        o.city.toLowerCase().includes(s) ||
        o.phone.includes(s.replace(/\s/g, "")),
    );
  }, [orders, q]);

  return (
    <div className="space-y-4">
      <SearchInput
        value={q}
        onChange={setQ}
        placeholder={t("admin.ordersPage.searchPlaceholder")}
        className="w-full sm:w-96"
      />
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.ordersPage.colOrder")}</TableHead>
                <TableHead>{t("admin.ordersPage.colCustomer")}</TableHead>
                <TableHead>{t("admin.ordersPage.colCity")}</TableHead>
                <TableHead>{t("admin.ordersPage.colTotal")}</TableHead>
                <TableHead>{t("admin.ordersPage.colDate")}</TableHead>
                <TableHead>{t("admin.ordersPage.colStatus")}</TableHead>
                <TableHead className="text-end">{t("admin.ordersPage.colAction")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center text-ink-soft">
                    {t("admin.ordersPage.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand-700 hover:underline">
                        {o.id}
                      </Link>
                      <p className="text-xs text-ink-soft">
                        {o.items.length > 1
                          ? t("admin.ordersPage.itemsPlural", { count: o.items.length })
                          : t("admin.ordersPage.itemsSingular", { count: o.items.length })}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-ink" dir="auto">{o.customerName}</p>
                      <a href={`tel:${o.phone}`} className="flex items-center gap-1 text-xs text-ink-soft hover:text-brand-600" dir="ltr">
                        <Phone className="h-3 w-3" /> {o.phone}
                      </a>
                    </TableCell>
                    <TableCell className="text-ink-soft" dir="auto">{o.city}</TableCell>
                    <TableCell className="font-semibold text-ink">{formatMAD(o.total)}</TableCell>
                    <TableCell className="text-ink-soft">{formatDate(o.createdAt)}</TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                      {o.status === "pending" && o.lastOutcome && (
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
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
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-600"
                        aria-label={t("admin.ordersPage.view")}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
