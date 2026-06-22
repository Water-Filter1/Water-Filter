"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  MessageCircle,
  MapPin,
  ShieldCheck,
  Wrench,
  CalendarClock,
  Search,
  Send,
  Check,
} from "lucide-react";
import {
  scheduleMaintenanceAction,
  setMaintenanceIntervalAction,
  markMaintenanceDoneAction,
} from "@/lib/order-actions";
import { formatDate, waNumber, addMonths } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-context";
import type { Order } from "@/lib/types";

type Plombier = { email: string; name: string | null; city: string | null };

const INTERVALS = [3, 4, 6, 8, 12];

function InstallationCard({ o, plombiers }: { o: Order; plombiers: Plombier[] }) {
  const router = useRouter();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [scheduling, setScheduling] = useState(false);
  const [date, setDate] = useState("");
  const cityMatch = plombiers.find(
    (p) => p.city && p.city.trim().toLowerCase() === o.city.trim().toLowerCase(),
  );
  const [assignedTo, setAssignedTo] = useState((cityMatch ?? plombiers[0])?.email ?? "");
  const [error, setError] = useState<string | null>(null);

  const tel = o.phone.replace(/\s/g, "");
  const now = Date.now();
  const warrantyEnd = o.completedAt ? addMonths(o.completedAt, o.warrantyMonths) : null;
  const warrantyActive = warrantyEnd ? warrantyEnd.getTime() > now : false;
  const next = o.nextMaintenanceAt ? new Date(o.nextMaintenanceAt) : null;
  const overdue = next ? next.getTime() < now : false;
  const soon = next ? !overdue && next.getTime() < now + 14 * 86_400_000 : false;

  const maintPill = overdue
    ? { label: t("admin.clientsSuivi.maintOverdue"), cls: "bg-rose-100 text-rose-700" }
    : soon
      ? { label: t("admin.clientsSuivi.maintSoon"), cls: "bg-orange-100 text-orange-700" }
      : { label: t("admin.clientsSuivi.maintUpToDate"), cls: "bg-emerald-100 text-emerald-700" };

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setScheduling(false);
        router.refresh();
      } else setError(res.error ?? t("admin.clientsSuivi.errorGeneric"));
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display font-bold text-ink" dir="auto">{o.customerName}</p>
          <p className="flex items-center gap-1.5 text-xs text-ink-soft" dir="auto">
            <MapPin className="h-3.5 w-3.5" /> {o.city}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${warrantyActive ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-ink-soft"}`}>
            <ShieldCheck className="h-3.5 w-3.5" /> {warrantyActive ? t("admin.clientsSuivi.warrantyActive") : t("admin.clientsSuivi.warrantyExpired")}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${maintPill.cls}`}>
            <Wrench className="h-3.5 w-3.5" /> {maintPill.label}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {o.items.map((it, i) => (
          <span key={i} className="rounded-lg bg-slate-50 px-2 py-1 text-xs text-ink" dir="auto">
            {it.name} ×{it.qty}
          </span>
        ))}
      </div>

      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-soft">{t("admin.clientsSuivi.installedOn")}</dt>
          <dd className="font-medium text-ink">{o.completedAt ? formatDate(o.completedAt) : "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-soft">{t("admin.clientsSuivi.warrantyUntil")}</dt>
          <dd className="font-medium text-ink">{warrantyEnd ? formatDate(warrantyEnd.toISOString()) : "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-soft">{t("admin.clientsSuivi.nextMaintenance")}</dt>
          <dd className={`font-medium ${overdue ? "text-rose-600" : soon ? "text-orange-600" : "text-ink"}`}>
            {next ? formatDate(next.toISOString()) : "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-soft">{t("admin.clientsSuivi.interval")}</dt>
          <dd>
            <select
              value={o.maintenanceMonths}
              onChange={(e) => run(() => setMaintenanceIntervalAction(o.id, Number(e.target.value)))}
              disabled={pending}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-brand-300"
            >
              {INTERVALS.map((m) => (
                <option key={m} value={m}>{t("admin.clientsSuivi.months", { m })}</option>
              ))}
            </select>
          </dd>
        </div>
      </dl>

      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <a href={`tel:${tel}`} className="flex items-center justify-center gap-1.5 rounded-full border border-slate-200 py-2 text-sm font-semibold text-ink transition hover:bg-slate-50">
          <Phone className="h-4 w-4" /> {t("admin.clientsSuivi.call")}
        </a>
        <a href={`https://wa.me/${waNumber(o.phone)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-full bg-[#25D366] py-2 text-sm font-semibold text-white transition hover:brightness-105">
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          onClick={() => setScheduling((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <CalendarClock className="h-4 w-4" /> {t("admin.clientsSuivi.scheduleMaintenance")}
        </button>
        <button
          onClick={() => run(() => markMaintenanceDoneAction(o.id))}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
        >
          <Check className="h-4 w-4" /> {t("admin.clientsSuivi.maintenanceDone")}
        </button>
      </div>

      {scheduling && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <p className="mb-2 text-sm font-semibold text-ink">{t("admin.clientsSuivi.sendTechnicianTitle")}</p>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
          />
          {plombiers.length > 0 && (
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
            >
              {plombiers.map((p) => (
                <option key={p.email} value={p.email}>
                  {p.name ?? p.email}{p.city ? ` — ${p.city}` : ""}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => {
              if (!date) { setError(t("admin.clientsSuivi.errorNoDate")); return; }
              run(() => scheduleMaintenanceAction({ parentId: o.id, installDate: new Date(date).toISOString(), assignedTo: assignedTo || undefined }));
            }}
            disabled={pending}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> {pending ? t("admin.clientsSuivi.sending") : t("admin.clientsSuivi.sendTechnician")}
          </button>
        </div>
      )}
    </div>
  );
}

export function ClientsSuivi({
  installations,
  plombiers,
}: {
  installations: Order[];
  plombiers: Plombier[];
}) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const s = q.trim().toLowerCase();
  const list = s
    ? installations.filter(
        (o) =>
          o.customerName.toLowerCase().includes(s) ||
          o.phone.replace(/\s/g, "").includes(s.replace(/\s/g, "")) ||
          o.city.toLowerCase().includes(s),
      )
    : installations;

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("admin.clientsSuivi.searchPlaceholder")}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white ps-10 pe-4 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
        />
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="mt-4 font-display text-lg font-semibold text-ink">
            {installations.length === 0 ? t("admin.clientsSuivi.emptyTitle") : t("admin.clientsSuivi.noResultsTitle")}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {installations.length === 0
              ? t("admin.clientsSuivi.emptyHint")
              : t("admin.clientsSuivi.noResultsHint")}
          </p>
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {list.map((o) => (
            <InstallationCard key={o.id} o={o} plombiers={plombiers} />
          ))}
        </div>
      )}
    </div>
  );
}
