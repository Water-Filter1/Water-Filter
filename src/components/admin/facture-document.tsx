import { getT } from "@/i18n/server";
import { formatMAD, formatDate } from "@/lib/utils";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Invoice, SiteSettings } from "@/lib/data";

/**
 * The printable facture document — shared by the admin view (/admin/factures/[id])
 * and the public customer link (/facture/[id]). Pure presentation; built from shadcn
 * Table/Badge + layout. Forces background colors to print (accent bar, total box).
 */
export async function FactureDocument({ inv, settings }: { inv: Invoice; settings: SiteSettings }) {
  const { t } = await getT();
  const contact = [settings.phone1, settings.phone2].filter(Boolean).join(" · ");
  const customerLoc = [inv.customerAddress, inv.customerCity].filter(Boolean).join(", ");
  const footerLine = [settings.siteName, contact, settings.email].filter(Boolean).join("  ·  ");

  return (
    <div className="mx-auto max-w-[820px] overflow-hidden rounded-2xl bg-white shadow-sm [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:max-w-none print:rounded-none print:shadow-none">
      {/* Branded accent bar */}
      <div className="h-2 bg-gradient-to-r from-brand-500 via-brand-400 to-aqua-400" />

      <div className="p-8 sm:p-10">
        {/* Header: company (left) + invoice title & meta (right) */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt="" className="h-16 w-16 rounded-xl object-contain" />
            ) : null}
            <div className="leading-tight">
              <p className="font-display text-2xl font-extrabold text-ink">{settings.siteName}</p>
              {settings.addressText ? <p className="text-sm text-ink-soft">{settings.addressText}</p> : null}
              {contact ? <p className="text-sm text-ink-soft">{contact}</p> : null}
              {settings.email ? <p className="text-sm text-ink-soft">{settings.email}</p> : null}
            </div>
          </div>

          <div className="shrink-0 text-end">
            <p className="font-display text-3xl font-black tracking-tight text-brand-600">{t("facture.doc")}</p>
            <div className="mt-3 inline-block rounded-xl bg-slate-50 px-4 py-3 text-end">
              <p className="text-sm font-bold text-ink">{inv.ref}</p>
              <p className="mt-0.5 text-xs text-ink-soft">{formatDate(inv.createdAt)}</p>
            </div>
            {inv.status === "cancelled" ? (
              <div className="mt-2">
                <Badge className="bg-rose-50 text-rose-600">{t("facture.statusCancelled")}</Badge>
              </div>
            ) : null}
          </div>
        </div>

        {/* Billed to + payment */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("facture.billedTo")}</p>
            <p className="mt-1.5 text-base font-bold text-ink" dir="auto">
              {inv.customerName}
            </p>
            {customerLoc ? (
              <p className="text-sm text-ink-soft" dir="auto">
                {customerLoc}
              </p>
            ) : null}
            {inv.customerPhone ? <p className="text-sm text-ink-soft">{inv.customerPhone}</p> : null}
          </div>
          <div className="sm:text-end">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("facture.payment")}</p>
            <div className="mt-1.5">
              <Badge className="bg-emerald-50 text-emerald-700">{t("facture.paidOnDelivery")}</Badge>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                <TableHead className="h-11 text-xs font-bold uppercase tracking-wide text-ink-soft">
                  {t("facture.colItem")}
                </TableHead>
                <TableHead className="h-11 text-center text-xs font-bold uppercase tracking-wide text-ink-soft">
                  {t("facture.colQty")}
                </TableHead>
                <TableHead className="h-11 text-end text-xs font-bold uppercase tracking-wide text-ink-soft">
                  {t("facture.colUnit")}
                </TableHead>
                <TableHead className="h-11 text-end text-xs font-bold uppercase tracking-wide text-ink-soft">
                  {t("facture.colTotal")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inv.items.map((it, i) => (
                <TableRow key={i} className="border-slate-100 hover:bg-transparent">
                  <TableCell className="py-3.5 font-semibold text-ink" dir="auto">
                    {it.name}
                  </TableCell>
                  <TableCell className="py-3.5 text-center text-ink">{it.qty}</TableCell>
                  <TableCell className="py-3.5 text-end text-ink-soft">{formatMAD(it.price)}</TableCell>
                  <TableCell className="py-3.5 text-end font-bold text-ink">{formatMAD(it.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-[300px] space-y-2">
            <div className="flex justify-between px-1 text-sm text-ink-soft">
              <span>{t("facture.subtotal")}</span>
              <span className="font-semibold text-ink">{formatMAD(inv.subtotal)}</span>
            </div>
            {inv.deliveryFee > 0 ? (
              <div className="flex justify-between px-1 text-sm text-ink-soft">
                <span>{t("facture.delivery")}</span>
                <span className="font-semibold text-ink">{formatMAD(inv.deliveryFee)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3 text-brand-700">
              <span className="text-sm font-bold uppercase tracking-wide">{t("facture.grandTotal")}</span>
              <span className="font-display text-xl font-black">{formatMAD(inv.total)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 border-t border-slate-200 pt-5 text-center">
          <p className="text-sm font-semibold text-ink">{t("facture.thanks")}</p>
          {footerLine ? <p className="mt-1 text-xs text-ink-soft">{footerLine}</p> : null}
        </div>
      </div>
    </div>
  );
}
