import { getInstallations, getPlombiers } from "@/lib/data";
import { ClientsSuivi } from "@/components/admin/clients-suivi";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminMaintenancePage() {
  const { t } = await getT();
  const [installations, plombiers] = await Promise.all([getInstallations(), getPlombiers()]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">{t("admin.maintenancePage.title")}</h1>
        <p className="text-sm text-ink-soft">{t("admin.maintenancePage.subtitle")}</p>
      </div>
      <ClientsSuivi installations={installations} plombiers={plombiers} />
    </div>
  );
}
