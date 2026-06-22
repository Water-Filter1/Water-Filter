"use client";

import { Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n-context";

/** Action bar above the facture document — hidden when printing. */
export function FacturePrintBar() {
  const { t } = useI18n();
  return (
    <div className="mx-auto mb-4 flex max-w-[820px] items-center justify-between print:hidden">
      <Button href="/admin/factures" variant="ghost" size="sm" className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        {t("facture.back")}
      </Button>
      <Button onClick={() => window.print()} variant="primary" size="sm" className="gap-2">
        <Printer className="h-4 w-4" />
        {t("facture.print")}
      </Button>
    </div>
  );
}
