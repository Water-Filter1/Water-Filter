"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Receipt, ArrowUpRight, Loader2 } from "lucide-react";
import { generateInvoiceAction } from "@/lib/invoice-actions";
import { useI18n } from "@/i18n/i18n-context";
import { formatMAD, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Order } from "@/lib/types";
import type { Invoice } from "@/lib/data";

export function FacturesManager({
  invoices,
  invoiceable,
}: {
  invoices: Invoice[];
  invoiceable: Order[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(orderId: string) {
    setError(null);
    setBusyId(orderId);
    try {
      const res = await generateInvoiceAction(orderId);
      if (res.ok) router.push(`/admin/factures/${res.id}`);
      else setError(t("admin.factures.genError"));
    } catch {
      setError(t("admin.factures.genError"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Orders ready to invoice */}
      <Card className="gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-sm ring-0">
        <CardHeader className="flex flex-col items-start gap-0.5 border-b border-slate-200 px-5 py-4">
          <CardTitle className="font-display font-bold text-ink">{t("admin.factures.toInvoice")}</CardTitle>
          <p className="text-xs text-ink-soft">{t("admin.factures.toInvoiceHint")}</p>
        </CardHeader>
        {error ? (
          <p className="border-b border-rose-100 bg-rose-50 px-5 py-2 text-sm font-semibold text-rose-600">{error}</p>
        ) : null}
        {invoiceable.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-soft">{t("admin.factures.noneToInvoice")}</p>
        ) : (
          <Table>
            <TableBody>
              {invoiceable.map((o) => (
                <TableRow key={o.id} className="border-slate-100 hover:bg-slate-50">
                  <TableCell className="py-3 ps-5">
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold text-ink" dir="auto">
                        {o.customerName}
                      </span>
                      <span className="text-xs text-ink-soft" dir="auto">
                        {o.id} · {o.city} · {formatMAD(o.total)}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="py-3 pe-5 text-end">
                    <Button
                      onClick={() => generate(o.id)}
                      disabled={busyId === o.id}
                      variant="primary"
                      size="sm"
                      className="h-8 gap-1.5 px-3 text-xs"
                    >
                      {busyId === o.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Receipt className="h-3.5 w-3.5" />
                      )}
                      {busyId === o.id ? t("admin.factures.generating") : t("admin.factures.generate")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* All issued factures */}
      <Card className="gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-sm ring-0">
        <CardHeader className="border-b border-slate-200 px-5 py-4">
          <CardTitle className="font-display font-bold text-ink">{t("admin.factures.allInvoices")}</CardTitle>
        </CardHeader>
        {invoices.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-soft">{t("admin.factures.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs uppercase tracking-wide text-ink-soft">
                  <TableHead>{t("admin.factures.colRef")}</TableHead>
                  <TableHead>{t("admin.factures.colCustomer")}</TableHead>
                  <TableHead>{t("facture.date")}</TableHead>
                  <TableHead>{t("facture.colTotal")}</TableHead>
                  <TableHead>{t("admin.factures.colStatus")}</TableHead>
                  <TableHead className="text-end">{t("admin.factures.view")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-slate-50">
                    <TableCell className="font-semibold text-ink">{inv.ref}</TableCell>
                    <TableCell dir="auto" className="text-ink">
                      {inv.customerName}
                    </TableCell>
                    <TableCell className="text-ink-soft">{formatDate(inv.createdAt)}</TableCell>
                    <TableCell className="font-semibold text-ink">{formatMAD(inv.total)}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          inv.status === "cancelled"
                            ? "bg-rose-50 text-rose-600"
                            : "bg-emerald-50 text-emerald-700"
                        }
                      >
                        {inv.status === "cancelled" ? t("facture.statusCancelled") : t("facture.statusIssued")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <Link
                        href={`/admin/factures/${inv.id}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
                      >
                        {t("admin.factures.view")} <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
