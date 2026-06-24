import { getClientsList, getClientSegments } from "@/lib/data";
import { ClientsManager } from "@/components/admin/clients-manager";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const { t } = await getT();
  const clients = await getClientsList();
  const segments = await getClientSegments(clients);

  return (
    <div className="font-semibold">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">{t("admin.clientsPage.title")}</h1>
        <p className="text-sm text-ink-soft">{t("admin.clientsPage.subtitle")}</p>
      </div>
      <ClientsManager clients={clients} segments={segments} />
    </div>
  );
}
