"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, MessageCircle, MapPin, CalendarClock, X, User } from "lucide-react";
import { toast } from "sonner";
import { recordCallOutcomeAction } from "@/lib/order-actions";
import { formatMAD, waNumber, formatDateTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n-context";
import type { Order } from "@/lib/types";

function formatWhen(iso: string | undefined, t: (key: string) => string): string {
  return iso ? formatDateTime(iso) : t("conf.confirmed.toSchedule");
}

export function ConfirmedOrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();
  const tel = order.phone.replace(/\s/g, "");

  function cancel() {
    if (!confirm(t("conf.confirmed.cancelConfirm", { id: order.id }))) return;
    setError(null);
    startTransition(async () => {
      const res = await recordCallOutcomeAction(order.id, "annuler");
      if (res.ok) {
        toast.success(t("admin.toast.deleted"));
        router.refresh();
      } else {
        toast.error(t("admin.toast.error"));
        setError(res.error ?? t("conf.confirmed.genericError"));
      }
    });
  }

  return (
    <Card className="font-semibold shadow-sm">
      <CardContent>
      <div className="flex items-center justify-between gap-3">
        <span className="font-display font-bold text-ink">{order.id}</span>
        <span className="font-display text-lg font-extrabold text-brand-700">
          {formatMAD(order.total)}
        </span>
      </div>

      <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800">
        <CalendarClock className="h-4 w-4 shrink-0" /> {formatWhen(order.installDate, t)}
      </p>

      <div className="mt-3 space-y-1 text-sm">
        <p className="flex items-center gap-2 font-semibold text-ink" dir="auto">
          <User className="h-4 w-4 shrink-0 text-ink-soft" /> {order.customerName}
        </p>
        <p className="flex items-start gap-2 text-ink-soft" dir="auto">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> <span>{order.address}, {order.city}</span>
        </p>
        {order.assignedTo && (
          <p className="text-xs text-ink-soft">🔧 {order.assignedTo}</p>
        )}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {order.items.map((it, i) => (
            <Badge key={i} tone="neutral" className="rounded-lg bg-slate-50 px-2 py-1 text-xs text-ink" >
              <span dir="auto">{it.name} ×{it.qty}</span>
            </Badge>
          ))}
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          href={`tel:${tel}`}
          className="flex items-center justify-center gap-1.5 rounded-full border border-slate-200 py-2.5 text-sm font-semibold text-ink transition hover:bg-slate-50"
        >
          <Phone className="h-4 w-4" /> {t("conf.confirmed.call")}
        </a>
        <a
          href={`https://wa.me/${waNumber(order.phone)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-full bg-[#25D366] py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
      </div>

      <Button
        variant="outline"
        onClick={cancel}
        disabled={pending}
        className="mt-2 w-full border-rose-200 bg-white py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
      >
        <X className="h-4 w-4" /> {pending ? t("conf.confirmed.cancelling") : t("conf.confirmed.cancelOrder")}
      </Button>
      </CardContent>
    </Card>
  );
}
