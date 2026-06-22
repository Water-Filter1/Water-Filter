"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Loader2 } from "lucide-react";
import { generateInvoiceAction } from "@/lib/invoice-actions";
import { useI18n } from "@/i18n/i18n-context";
import { Button } from "@/components/ui/button";

/** Header action on the order page: generate this order's facture, or view it if it exists. */
export function OrderFactureButton({ orderId, invoiceId }: { orderId: string; invoiceId: string | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  if (invoiceId) {
    return (
      <Button href={`/admin/factures/${invoiceId}`} variant="outline" size="sm" className="gap-2">
        <Receipt className="h-4 w-4" />
        {t("admin.orders.viewFacture")}
      </Button>
    );
  }

  async function generate() {
    setError(false);
    setBusy(true);
    try {
      const res = await generateInvoiceAction(orderId);
      if (res.ok) router.push(`/admin/factures/${res.id}`);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={generate} disabled={busy} variant="primary" size="sm" className="gap-2">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
        {t("admin.orders.generateFacture")}
      </Button>
      {error ? <p className="text-xs font-semibold text-rose-600">{t("admin.factures.genError")}</p> : null}
    </div>
  );
}
