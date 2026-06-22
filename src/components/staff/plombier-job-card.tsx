"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  MessageCircle,
  MapPin,
  CalendarClock,
  Navigation,
  Check,
  Truck,
  Wrench,
} from "lucide-react";
import { setJobStageAction } from "@/lib/order-actions";
import { CompleteJobForm } from "./complete-job-form";
import { formatMAD, waNumber, formatDateTime } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-context";
import type { Order } from "@/lib/types";

function formatWhen(iso: string | undefined, t: (key: string) => string): string {
  return iso ? formatDateTime(iso) : t("tech.job.toSchedule");
}

const STEP_KEYS = ["tech.job.stepEnroute", "tech.job.stepArrived", "tech.job.stepDone"] as const;

export function PlombierJobCard({ order }: { order: Order }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();
  const tel = order.phone.replace(/\s/g, "");
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${order.address}, ${order.city}`,
  )}`;

  // step index reached: scheduled=0, enroute=1, arrived=2
  const reached = order.installStage === "arrived" ? 2 : order.installStage === "enroute" ? 1 : 0;

  function advance(stage: "enroute" | "arrived") {
    startTransition(async () => {
      await setJobStageAction(order.id, stage);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* date + type/price */}
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700">
          <CalendarClock className="h-4 w-4" /> {formatWhen(order.installDate, t)}
        </span>
        {order.kind === "maintenance" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
            <Wrench className="h-3.5 w-3.5" /> {t("tech.job.maintenance")}
          </span>
        ) : (
          <span className="font-display text-lg font-extrabold text-brand-700">{formatMAD(order.total)}</span>
        )}
      </div>

      <p className="mt-3 font-display text-lg font-bold text-ink" dir="auto">{order.customerName}</p>
      <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-soft" dir="auto">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {order.address}, {order.city}
      </p>

      <div className="mt-3">
        <p className="mb-1 text-xs font-medium text-ink-soft">{t("tech.job.products")}</p>
        <div className="flex flex-wrap gap-1.5">
          {order.items.map((it, i) => (
            <span key={i} className="rounded-lg bg-slate-50 px-2 py-1 text-xs text-ink" dir="auto">
              {it.name} ×{it.qty}
            </span>
          ))}
        </div>
      </div>

      {order.confirmationNote && (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs italic text-ink-soft" dir="auto">
          “{order.confirmationNote}”
        </p>
      )}

      {/* actions */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-full bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <Navigation className="h-4 w-4" /> {t("tech.job.navigate")}
        </a>
        <a
          href={`tel:${tel}`}
          className="flex items-center justify-center gap-1.5 rounded-full border border-slate-200 py-2.5 text-sm font-semibold text-ink transition hover:bg-slate-50"
        >
          <Phone className="h-4 w-4" /> {t("tech.job.call")}
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

      {/* progress stepper */}
      <div className="mt-5 flex items-center">
        {STEP_KEYS.map((label, i) => {
          const done = i < reached;
          const active = i === reached;
          return (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? "bg-brand-600 text-white"
                      : active
                        ? "bg-brand-100 text-brand-700 ring-2 ring-brand-500"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className={`mt-1 text-[11px] ${active || done ? "font-semibold text-ink" : "text-ink-soft"}`}>
                  {t(label)}
                </span>
              </div>
              {i < STEP_KEYS.length - 1 && (
                <span className={`mx-1 h-0.5 flex-1 rounded ${i < reached ? "bg-brand-500" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* advance buttons */}
      {reached < 2 && (
        <button
          onClick={() => advance(reached === 0 ? "enroute" : "arrived")}
          disabled={pending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-brand-200 bg-brand-50 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-60"
        >
          <Truck className="h-4 w-4" />
          {pending ? "…" : reached === 0 ? t("tech.job.imEnroute") : t("tech.job.imArrived")}
        </button>
      )}

      {/* finish: photo + mark installed + send invoice */}
      <CompleteJobForm orderId={order.id} phone={order.phone} customerName={order.customerName} />
    </div>
  );
}
