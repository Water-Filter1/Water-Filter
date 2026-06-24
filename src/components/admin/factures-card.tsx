"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Receipt, ArrowUpRight, Loader2 } from "lucide-react";
import { generateInvoiceAction } from "@/lib/invoice-actions";
import { useI18n } from "@/i18n/i18n-context";
import { formatMAD } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Order } from "@/lib/types";
import type { Invoice } from "@/lib/data";

/**
 * Dashboard card: generate a facture in one click from a recent invoiceable order,
 * or (if none pending) see the most recent factures. Entry point to /admin/factures.
 */
export function FacturesCard({ invoiceable, recent }: { invoiceable: Order[]; recent: Invoice[] }) {
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
    <Card className="gap-0 overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-sm ring-0">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Badge className="h-8 w-8 justify-center rounded-lg bg-emerald-50 p-0 text-emerald-600">
            <Receipt className="h-4 w-4" />
          </Badge>
          <CardTitle className="font-display font-bold text-ink">{t("admin.dash.facturesTitle")}</CardTitle>
        </div>
        <Link
          href="/admin/factures"
          className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          {t("admin.dash.seeAll")} <ArrowUpRight className="h-4 w-4" />
        </Link>
      </CardHeader>

      {error ? (
        <p className="border-b border-rose-100 bg-rose-50 px-5 py-2 text-sm font-semibold text-rose-600">{error}</p>
      ) : null}

      {invoiceable.length > 0 ? (
        <Table>
          <TableBody>
            {invoiceable.map((o) => (
              <TableRow key={o.id} className="border-0 hover:bg-muted/50">
                <TableCell className="py-3 ps-5">
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-ink" dir="auto">
                      {o.customerName}
                    </span>
                    <span className="text-xs text-ink-soft">
                      {o.id} · {formatMAD(o.total)}
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
                    {t("admin.factures.generate")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : recent.length > 0 ? (
        <Table>
          <TableBody>
            {recent.map((inv) => (
              <TableRow key={inv.id} className="border-0 hover:bg-muted/50">
                <TableCell className="py-3 ps-5">
                  <Link href={`/admin/factures/${inv.id}`} className="flex flex-col">
                    <span className="text-sm font-semibold text-brand-700">{inv.ref}</span>
                    <span className="text-xs text-ink-soft" dir="auto">
                      {inv.customerName}
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="py-3 pe-5 text-end text-sm font-semibold text-ink">
                  {formatMAD(inv.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="px-5 py-12 text-center text-sm font-semibold text-ink-soft">
          {t("admin.factures.noneToInvoice")}
        </p>
      )}
    </Card>
  );
}
