import { MapPin } from "lucide-react";
import { getStockList, getStockSummary } from "@/lib/data";
import { StockManager } from "@/components/admin/stock-manager";
import { Badge } from "@/components/ui/badge";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminStockPage() {
  const { t } = await getT();
  const [rows, summary] = await Promise.all([getStockList(), getStockSummary()]);

  return (
    <div className="font-semibold">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold text-ink">{t("admin.stock.title")}</h1>
          <Badge className="gap-1 bg-brand-50 text-brand-700">
            <MapPin className="h-3 w-3" />
            {t("admin.stock.location")}
          </Badge>
        </div>
        <p className="text-sm text-ink-soft">{t("admin.stock.subtitle")}</p>
      </div>
      <StockManager rows={rows} summary={summary} />
    </div>
  );
}
