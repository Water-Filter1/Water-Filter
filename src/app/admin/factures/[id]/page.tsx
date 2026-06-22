import { notFound } from "next/navigation";
import { getInvoiceById, getSettings } from "@/lib/data";
import { FactureDocument } from "@/components/admin/facture-document";
import { FacturePrintBar } from "@/components/admin/facture-print-bar";

export const dynamic = "force-dynamic";

export default async function FacturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await getInvoiceById(id);
  if (!inv) notFound();
  const settings = await getSettings();

  return (
    <div className="bg-neutral-100 p-4 print:bg-white print:p-0">
      <FacturePrintBar />
      <FactureDocument inv={inv} settings={settings} />
    </div>
  );
}
