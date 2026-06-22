import { getStockList, getStockSummary } from "@/lib/data";
import { StockManager } from "@/components/admin/stock-manager";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminStockPage() {
  const { t } = await getT();
  const [rows, summary] = await Promise.all([getStockList(), getStockSummary()]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">{t("admin.stock.title")}</h1>
        <p className="text-sm text-ink-soft">{t("admin.stock.subtitle")}</p>
      </div>
      <StockManager rows={rows} summary={summary} />
    </div>
  );
}
