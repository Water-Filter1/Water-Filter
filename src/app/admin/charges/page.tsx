import { getFinanceSummary, getExpenses } from "@/lib/data";
import { ChargesManager } from "@/components/admin/charges-manager";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminChargesPage() {
  const { t } = await getT();
  const [summary, expenses] = await Promise.all([getFinanceSummary(), getExpenses()]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">{t("admin.charges.title")}</h1>
        <p className="text-sm text-ink-soft">{t("admin.charges.subtitle")}</p>
      </div>
      <ChargesManager summary={summary} expenses={expenses} />
    </div>
  );
}
