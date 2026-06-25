"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, MapPin, CalendarClock, Wrench, MessageCircle, Receipt, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/i18n-context";
import { formatMAD, formatDateTime, waNumber } from "@/lib/utils";
import { ensureInvoiceAction } from "@/lib/invoice-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import type { Order } from "@/lib/types";

/** Read-only card for a technician's completed (installed) job — the history view, with the
 *  ability to re-send the client's facture on WhatsApp any time. */
export function CompletedJobCard({ order }: { order: Order }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const res = await ensureInvoiceAction(order.id);
      if (res.ok) router.refresh();
      else toast.error(t("admin.toast.error"));
    });
  }

  return (
    <Card className="gap-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-0">
      <div className="flex items-center justify-between gap-3">
        <Badge className="gap-1.5 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
          <Check className="h-4 w-4" /> {t("tech.installedBadge")}
        </Badge>
        {order.kind === "maintenance" ? (
          <Badge className="gap-1.5 bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
            <Wrench className="h-3.5 w-3.5" /> {t("tech.job.maintenance")}
          </Badge>
        ) : (
          <span className="font-display text-lg font-extrabold text-ink">{formatMAD(order.total)}</span>
        )}
      </div>

      <p className="mt-3 font-display text-lg font-bold text-ink" dir="auto">{order.customerName}</p>
      <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-soft" dir="auto">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {order.address}, {order.city}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {order.items.map((it, i) => (
          <Badge key={i} className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-semibold text-ink" dir="auto">
            {it.name} ×{it.qty}
          </Badge>
        ))}
      </div>

      {order.completedAt && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
          <CalendarClock className="h-4 w-4" /> {t("tech.installedOn")} {formatDateTime(order.completedAt)}
        </p>
      )}

      {/* Re-send the facture to the client at any time (maintenance visits have no facture). */}
      {order.kind !== "maintenance" && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          {order.invoiceUrl ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={`https://wa.me/${waNumber(order.phone)}?text=${encodeURIComponent(
                  t("tech.complete.invoiceMsg", {
                    name: order.customerName,
                    ref: order.invoiceRef ?? "",
                    url: order.invoiceUrl,
                  }),
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "whatsapp", size: "sm", className: "flex-1 font-semibold" })}
              >
                <MessageCircle className="h-4 w-4" /> {t("tech.complete.sendInvoice")}
              </a>
              <a
                href={order.invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm", className: "flex-1 font-semibold" })}
              >
                <Receipt className="h-4 w-4" /> {t("tech.complete.viewInvoice")}
              </a>
            </div>
          ) : (
            <Button
              type="button"
              variant="dark"
              size="sm"
              disabled={pending}
              onClick={generate}
              className="w-full font-semibold"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              {pending ? t("tech.genInvoice.pending") : t("tech.genInvoice")}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
