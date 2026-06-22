"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  MessageCircle,
  MapPin,
  User,
  Check,
  RotateCcw,
  PhoneOff,
  X,
} from "lucide-react";
import { confirmOrderAction, recordCallOutcomeAction, logWhatsappAction } from "@/lib/order-actions";
import { formatMAD, formatDate, waNumber } from "@/lib/utils";
import type { Order } from "@/lib/types";
import { useI18n } from "@/i18n/i18n-context";

export function ConfirmOrderCard({
  order,
  plombiers,
}: {
  order: Order;
  plombiers: { email: string; name: string | null; city: string | null }[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  // Auto-match a plombier whose city equals the order's city (dispatch by zone).
  const cityMatch = plombiers.find(
    (p) => p.city && p.city.trim().toLowerCase() === order.city.trim().toLowerCase(),
  );
  const [assignedTo, setAssignedTo] = useState((cityMatch ?? plombiers[0])?.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const tel = order.phone.replace(/\s/g, "");

  function confirm() {
    setError(null);
    if (!date) {
      setError(t("conf.card.errNoDate"));
      return;
    }
    if (plombiers.length > 0 && !assignedTo) {
      setError(t("conf.card.errNoTechnician"));
      return;
    }
    startTransition(async () => {
      const res = await confirmOrderAction({
        id: order.id,
        installDate: new Date(date).toISOString(),
        note: note.trim() || undefined,
        assignedTo: assignedTo || undefined,
      });
      if (res.ok) router.refresh();
      else setError(res.error ?? t("conf.card.errGeneric"));
    });
  }

  function outcome(o: "rappeler" | "pas_reponse" | "annuler") {
    setError(null);
    startTransition(async () => {
      const res = await recordCallOutcomeAction(order.id, o);
      if (res.ok) router.refresh();
      else setError(res.error ?? t("conf.card.errGeneric"));
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-ink">{order.id}</span>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            {t("conf.card.statusToConfirm")}
          </span>
          {order.source === "phone" && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-ink-soft">
              {t("conf.card.sourcePhone")}
            </span>
          )}
        </div>
        <span className="text-xs text-ink-soft">{formatDate(order.createdAt)}</span>
      </div>

      {/* Body: client + products */}
      <div className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1.5 text-sm">
          <p className="flex items-center gap-2 font-medium text-ink" dir="auto">
            <User className="h-4 w-4 shrink-0 text-ink-soft" /> {order.customerName}
          </p>
          <a href={`tel:${tel}`} className="flex items-center gap-2 text-ink-soft hover:text-brand-600">
            <Phone className="h-4 w-4 shrink-0" /> {order.phone}
          </a>
          <p className="flex items-start gap-2 text-ink-soft" dir="auto">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> <span>{order.address}, {order.city}</span>
          </p>
        </div>
        <div className="sm:text-right">
          <p className="mb-1 text-xs text-ink-soft">{t("conf.card.requestedProducts")}</p>
          <div className="flex flex-wrap gap-1.5 sm:justify-end">
            {order.items.map((it, i) => (
              <span key={i} className="rounded-lg bg-slate-50 px-2 py-1 text-xs text-ink" dir="auto">
                {it.name} ×{it.qty}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-soft">{t("conf.card.totalAmount")}</p>
          <p className="font-display text-2xl font-extrabold text-brand-700">{formatMAD(order.total)}</p>
        </div>
      </div>

      {order.note && (
        <p className="mx-5 mb-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-ink-soft" dir="auto">
          📝 {order.note}
        </p>
      )}
      {order.confirmationNote && (
        <p className="mx-5 mb-2 text-xs font-medium text-amber-600">⏱ {order.confirmationNote}</p>
      )}

      {/* Quick contact */}
      <div className="grid grid-cols-2 gap-2 px-5">
        <a
          href={`tel:${tel}`}
          className="flex items-center justify-center gap-2 rounded-full border border-slate-200 py-2.5 text-sm font-semibold text-ink transition hover:bg-slate-50"
        >
          <Phone className="h-4 w-4" /> {t("conf.card.call")}
        </a>
        <a
          href={`https://wa.me/${waNumber(order.phone)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => logWhatsappAction(order.id)}
          className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
      </div>

      {/* Treatment */}
      <div className="mt-4 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
        <p className="mb-2 text-sm font-semibold text-ink">{t("conf.card.processingTitle")}</p>

        {plombiers.length > 0 && (
          <>
            <label className="mb-1 block text-xs font-medium text-ink-soft">{t("conf.card.assignedTechnician")}</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="mb-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
            >
              {plombiers.map((p) => (
                <option key={p.email} value={p.email}>
                  {p.name ?? p.email}
                  {p.city ? ` — ${p.city}` : ""}
                  {p.city && p.city.trim().toLowerCase() === order.city.trim().toLowerCase()
                    ? " ✓"
                    : ""}
                </option>
              ))}
            </select>
          </>
        )}

        <label className="mb-1 block text-xs font-medium text-ink-soft">{t("conf.card.plannedInstallDate")}</label>
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("conf.card.notePlaceholder")}
          className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
        />
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => outcome("rappeler")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink-soft transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RotateCcw className="h-3.5 w-3.5" /> {t("conf.card.toCallBack")}
          </button>
          <button
            onClick={() => outcome("pas_reponse")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink-soft transition hover:bg-slate-50 disabled:opacity-60"
          >
            <PhoneOff className="h-3.5 w-3.5" /> {t("conf.card.noAnswer")}
          </button>
          <button
            onClick={() => outcome("annuler")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" /> {t("conf.card.cancel")}
          </button>
          <button
            onClick={confirm}
            disabled={pending}
            className="ms-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
          >
            <Check className="h-4 w-4" /> {pending ? "…" : t("conf.card.confirmAndSchedule")}
          </button>
        </div>
      </div>
    </div>
  );
}
