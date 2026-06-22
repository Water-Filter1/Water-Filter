import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getInvoiceById, getSettings } from "@/lib/data";
import { getT } from "@/i18n/server";
import { FactureDocument } from "@/components/admin/facture-document";
import { InvoicePrintButton } from "@/components/admin/invoice-print-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Facture", robots: { index: false, follow: false } };

/**
 * PUBLIC facture link — the customer opens this from WhatsApp (no login). Outside the
 * middleware matcher, so it's reachable by anyone with the link; the invoice id (cuid)
 * is unguessable. Renders the same document the admin sees, plus a print/PDF button.
 */
export default async function PublicFacturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await getInvoiceById(id);
  if (!inv) notFound();
  const [settings, { t }] = await Promise.all([getSettings(), getT()]);

  return (
    <div className="min-h-screen bg-neutral-100 p-4 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[820px] justify-end print:hidden">
        <InvoicePrintButton label={t("facture.print")} />
      </div>
      <FactureDocument inv={inv} settings={settings} />
    </div>
  );
}
