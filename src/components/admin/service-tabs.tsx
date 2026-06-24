"use client";

import type { ComponentProps } from "react";
import { Wrench, HardHat } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useI18n } from "@/i18n/i18n-context";
import { ClientsSuivi } from "@/components/admin/clients-suivi";
import { TechniciansManager, type TechRow } from "@/components/admin/technicians-manager";

type SuiviProps = ComponentProps<typeof ClientsSuivi>;

/** Service = Maintenance/SAV + Technicians under one tabbed page. */
export function ServiceTabs({
  installations,
  plombiers,
  rows,
  defaultTab,
}: {
  installations: SuiviProps["installations"];
  plombiers: SuiviProps["plombiers"];
  rows: TechRow[];
  defaultTab: string;
}) {
  const { t } = useI18n();

  // Reflect the active tab in the URL (deep-link / refresh / share) without a reload.
  const syncUrl = (v: string) => {
    if (typeof window === "undefined") return;
    const url = v === "maintenance" ? window.location.pathname : `${window.location.pathname}?tab=${v}`;
    window.history.replaceState(null, "", url);
  };

  return (
    <Tabs defaultValue={defaultTab} onValueChange={(v) => syncUrl(String(v))} className="gap-6">
      <TabsList className="h-10 bg-muted p-1 font-semibold">
        <TabsTrigger value="maintenance" className="gap-2 text-sm font-semibold">
          <Wrench className="h-4 w-4" />
          {t("admin.service.tabMaintenance")}
        </TabsTrigger>
        <TabsTrigger value="technicians" className="gap-2 text-sm font-semibold">
          <HardHat className="h-4 w-4" />
          {t("admin.nav.techniciens")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="maintenance" keepMounted>
        <ClientsSuivi installations={installations} plombiers={plombiers} />
      </TabsContent>
      <TabsContent value="technicians" keepMounted>
        <TechniciansManager rows={rows} />
      </TabsContent>
    </Tabs>
  );
}
