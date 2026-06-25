"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Loader2, FileText, Inbox, Eye } from "lucide-react";
import { toast } from "sonner";
import { generateInvoiceAction } from "@/lib/invoice-actions";
import { useI18n } from "@/i18n/i18n-context";
import { formatMAD, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/admin/data-table";
import type { Order } from "@/lib/types";
import type { Invoice } from "@/lib/data";

/** Centered empty state (shadcn Card + Tailwind): soft icon tile + title + optional hint. */
function EmptyBlock({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-ink-soft">
        {icon}
      </span>
      <div className="space-y-1">
        <p className="font-semibold text-ink">{title}</p>
        {hint ? <p className="max-w-xs text-sm text-ink-soft">{hint}</p> : null}
      </div>
    </div>
  );
}

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
      if (res.ok) {
        toast.success(t("admin.toast.created"));
        router.push(`/admin/factures/${res.id}`);
      } else {
        toast.error(t("admin.toast.error"));
        setError(t("admin.factures.genError"));
      }
    } catch {
      toast.error(t("admin.toast.error"));
      setError(t("admin.factures.genError"));
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<Invoice>[] = [
    {
      key: "ref",
      header: t("admin.factures.colRef"),
      sort: (inv) => inv.ref,
      cell: (inv) => (
        <span className="flex items-center gap-2.5 font-semibold text-ink">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Receipt className="h-4 w-4" />
          </span>
          {inv.ref}
        </span>
      ),
    },
    {
      key: "customer",
      header: t("admin.factures.colCustomer"),
      sort: (inv) => inv.customerName,
      className: "text-ink",
      cell: (inv) => (
        <span dir="auto" className="text-ink">
          {inv.customerName}
        </span>
      ),
    },
    {
      key: "date",
      header: t("facture.date"),
      sort: (inv) => new Date(inv.createdAt).getTime(),
      className: "text-ink-soft",
      cell: (inv) => formatDate(inv.createdAt),
    },
    {
      key: "total",
      header: t("facture.colTotal"),
      sort: (inv) => inv.total,
      className: "font-semibold text-ink",
      cell: (inv) => formatMAD(inv.total),
    },
    {
      key: "status",
      header: t("admin.factures.colStatus"),
      cell: (inv) => (
        <Badge
          className={
            inv.status === "cancelled"
              ? "bg-rose-50 text-rose-600"
              : "bg-emerald-50 text-emerald-700"
          }
        >
          {inv.status === "cancelled" ? t("facture.statusCancelled") : t("facture.statusIssued")}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: t("admin.factures.view"),
      headClassName: "text-end",
      className: "text-end",
      cell: (inv) => (
        <Button
          href={`/admin/factures/${inv.id}`}
          variant="ghost"
          size="icon-sm"
          className="rounded-lg text-ink-soft hover:bg-brand-50 hover:text-brand-600"
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">{t("admin.factures.view")}</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-semibold">
      {/* All issued factures — the main table, on top */}
      {invoices.length === 0 ? (
        <Card className="gap-0 overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-sm ring-0">
          <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border px-5 py-4">
            <CardTitle className="flex items-center gap-2 font-display font-bold text-ink">
              <Receipt className="h-5 w-5 text-brand-600" />
              {t("admin.factures.allInvoices")}
            </CardTitle>
            <Badge className="bg-muted text-ink-soft">{invoices.length}</Badge>
          </CardHeader>
          <EmptyBlock icon={<Receipt className="h-6 w-6" />} title={t("admin.factures.empty")} />
        </Card>
      ) : (
        <div className="space-y-4">
          <CardHeader className="flex flex-row items-center justify-between gap-2 px-0 py-0">
            <CardTitle className="flex items-center gap-2 font-display font-bold text-ink">
              <Receipt className="h-5 w-5 text-brand-600" />
              {t("admin.factures.allInvoices")}
            </CardTitle>
            <Badge className="bg-muted text-ink-soft">{invoices.length}</Badge>
          </CardHeader>
          <DataTable
            rows={invoices}
            columns={columns}
            getRowId={(inv) => inv.id}
            search={(inv) => `${inv.ref} ${inv.customerName}`}
            searchPlaceholder={t("admin.factures.colCustomer")}
            csv={{
              filename: "factures.csv",
              row: (inv) => ({
                Ref: inv.ref,
                Customer: inv.customerName,
                Date: formatDate(inv.createdAt),
                Total: inv.total,
                Status: inv.status === "cancelled" ? "cancelled" : "issued",
              }),
            }}
            defaultSortKey="date"
            defaultSortDir="desc"
            emptyText={t("admin.factures.empty")}
            minWidth="min-w-[720px]"
          />
        </div>
      )}

      {/* Orders ready to invoice — secondary, under */}
      <Card className="gap-0 overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-sm ring-0">
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <CardTitle className="flex items-center gap-2 font-display font-bold text-ink">
              <FileText className="h-5 w-5 text-amber-500" />
              {t("admin.factures.toInvoice")}
            </CardTitle>
            <p className="text-xs text-ink-soft">{t("admin.factures.toInvoiceHint")}</p>
          </div>
          {invoiceable.length > 0 ? (
            <Badge className="bg-amber-100 text-amber-700">{invoiceable.length}</Badge>
          ) : null}
        </CardHeader>
        {error ? (
          <p className="border-b border-rose-100 bg-rose-50 px-5 py-2 text-sm font-semibold text-rose-600">{error}</p>
        ) : null}
        {invoiceable.length === 0 ? (
          <EmptyBlock icon={<Inbox className="h-6 w-6" />} title={t("admin.factures.noneToInvoice")} />
        ) : (
          <Table>
            <TableBody>
              {invoiceable.map((o) => (
                <TableRow key={o.id} className="hover:bg-muted/50">
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
                      className="h-8 gap-1.5 px-3 text-xs font-semibold"
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
    </div>
  );
}
