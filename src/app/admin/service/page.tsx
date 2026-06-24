import { getInstallations, getPlombiers, getTechnicians, getTechnicianPerformance } from "@/lib/data";
import { type TechRow } from "@/components/admin/technicians-manager";
import { ServiceTabs } from "@/components/admin/service-tabs";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminServicePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { t } = await getT();
  const { tab } = await searchParams;
  const [installations, plombiers, techs, perf] = await Promise.all([
    getInstallations(),
    getPlombiers(),
    getTechnicians(),
    getTechnicianPerformance(),
  ]);

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

  const defaultTab = tab === "technicians" ? "technicians" : "maintenance";

  return (
    <div className="font-semibold">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">{t("admin.nav.service")}</h1>
        <p className="text-sm text-ink-soft">{t("admin.service.subtitle")}</p>
      </div>
      <ServiceTabs installations={installations} plombiers={plombiers} rows={rows} defaultTab={defaultTab} />
    </div>
  );
}
