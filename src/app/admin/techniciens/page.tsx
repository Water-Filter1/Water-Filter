import { getTechnicians, getTechnicianPerformance } from "@/lib/data";
import { TechniciansManager, type TechRow } from "@/components/admin/technicians-manager";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminTechniciansPage() {
  const { t } = await getT();
  const [techs, perf] = await Promise.all([getTechnicians(), getTechnicianPerformance()]);
  const perfByEmail = new Map(perf.map((p) => [p.email, p]));

  const rows: TechRow[] = techs.map((tx) => {
    const p = perfByEmail.get(tx.email);
    return {
      id: tx.id,
      name: tx.name ?? tx.email,
      city: tx.city,
      installs: p?.installs ?? 0,
      sav: p?.sav ?? 0,
      revenue: p?.revenue ?? 0,
      rate: tx.commissionPerInstall,
      commission: (p?.installs ?? 0) * tx.commissionPerInstall,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">{t("admin.techPage.title")}</h1>
        <p className="text-sm text-ink-soft">{t("admin.techPage.subtitle")}</p>
      </div>
      <TechniciansManager rows={rows} />
    </div>
  );
}
