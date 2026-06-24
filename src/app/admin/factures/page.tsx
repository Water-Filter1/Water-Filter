import { getInvoices, getInvoiceableOrders } from "@/lib/data";
import { getT } from "@/i18n/server";
import { FacturesManager } from "@/components/admin/factures-manager";

export const dynamic = "force-dynamic";

export default async function FacturesPage() {
  const { t } = await getT();
  const [invoices, invoiceable] = await Promise.all([getInvoices(), getInvoiceableOrders(12)]);

  return (
    <div className="font-semibold">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">{t("admin.factures.title")}</h1>
        <p className="text-sm text-ink-soft">{t("admin.factures.subtitle")}</p>
      </div>
      <FacturesManager invoices={invoices} invoiceable={invoiceable} />
    </div>
  );
}
