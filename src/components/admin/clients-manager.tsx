"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  ShoppingCart,
  UserPlus,
  UserX,
  Wallet,
  Eye,
  Phone,
  MessageCircle,
  Pencil,
  X,
  MapPin,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Power,
  Mail,
} from "lucide-react";
import { useI18n } from "@/i18n/i18n-context";
import { formatMAD, formatDate, cn, waNumber } from "@/lib/utils";
import {
  getClientDetailAction,
  setClientStatusAction,
  updateClientAction,
} from "@/lib/client-actions";
import type { ClientRow, ClientSegments, ClientDetail } from "@/lib/data";
import { STATUS_META } from "@/lib/order-status";
import { KpiCard } from "@/components/admin/kpi-card";
import { SearchInput } from "@/components/admin/search-input";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const PAGE = 10;
type Tab = "all" | "withOrders" | "newMonth" | "inactive";

const CITY_COLORS = ["#3b82f6", "#22c55e", "#14b8a6", "#f59e0b", "#ef4444"];

const shortId = (id: string) => "#CLT-" + id.slice(-6).toUpperCase();
const startOfMonth = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).getTime();
};

export function ClientsManager({
  clients,
  segments,
}: {
  clients: ClientRow[];
  segments: ClientSegments;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const pct = (v: number) => (segments.total ? Math.round((v / segments.total) * 100) : 0);

  const filtered = useMemo(() => {
    const startMonth = startOfMonth();
    let list = clients;
    if (tab === "withOrders") list = list.filter((c) => c.orderCount > 0);
    else if (tab === "inactive") list = list.filter((c) => c.status === "inactive");
    else if (tab === "newMonth")
      list = list.filter((c) => new Date(c.firstOrderAt).getTime() >= startMonth);
    const s = q.trim().toLowerCase();
    if (s)
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.phone.includes(s.replace(/\s/g, "")) ||
          c.city.toLowerCase().includes(s) ||
          (c.email ?? "").toLowerCase().includes(s),
      );
    return list;
  }, [clients, tab, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE, safePage * PAGE);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE + 1;
  const to = Math.min(safePage * PAGE, filtered.length);

  function switchTab(next: Tab) {
    setTab(next);
    setPage(1);
  }

  async function openDetail(phone: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    const d = await getClientDetailAction(phone);
    setDetail(d);
    setDetailLoading(false);
  }

  const KPIS = [
    { icon: Users, tone: "bg-brand-50 text-brand-600", label: t("admin.crm.kpiTotal"), value: String(segments.total), hint: t("admin.crm.kpiTotalHint") },
    { icon: UserCheck, tone: "bg-emerald-50 text-emerald-600", label: t("admin.crm.kpiActive"), value: String(segments.active), hint: t("admin.crm.ofTotal", { pct: pct(segments.active) }) },
    { icon: ShoppingCart, tone: "bg-amber-50 text-amber-600", label: t("admin.crm.kpiWithOrders"), value: String(segments.withOrders), hint: t("admin.crm.ofTotal", { pct: pct(segments.withOrders) }) },
    { icon: UserPlus, tone: "bg-indigo-50 text-indigo-600", label: t("admin.crm.kpiNewMonth"), value: String(segments.newThisMonth), hint: t("admin.crm.ofTotal", { pct: pct(segments.newThisMonth) }) },
    { icon: UserX, tone: "bg-rose-50 text-rose-600", label: t("admin.crm.kpiInactive"), value: String(segments.inactive), hint: t("admin.crm.ofTotal", { pct: pct(segments.inactive) }) },
    { icon: Wallet, tone: "bg-sky-50 text-sky-600", label: t("admin.crm.kpiRevenue"), value: formatMAD(segments.revenue), hint: t("admin.crm.kpiTotalHint") },
  ];

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: t("admin.crm.tabAll"), count: segments.total },
    { key: "withOrders", label: t("admin.crm.tabWithOrders"), count: segments.withOrders },
    { key: "newMonth", label: t("admin.crm.tabNewMonth"), count: segments.newThisMonth },
    { key: "inactive", label: t("admin.crm.tabInactive"), count: segments.inactive },
  ];

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {KPIS.map((k) => (
          <KpiCard key={k.label} icon={k.icon} tone={k.tone} label={k.label} value={k.value} hint={k.hint} />
        ))}
      </div>

      {/* Tabs + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              type="button"
              onClick={() => switchTab(tb.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
                tab === tb.key ? "bg-brand-600 text-white" : "bg-white text-ink-soft hover:bg-slate-50 border border-slate-200",
              )}
            >
              {tb.label} <span className={cn("ms-1", tab === tb.key ? "text-white/80" : "text-ink-soft")}>{tb.count}</span>
            </button>
          ))}
        </div>
        <SearchInput
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder={t("admin.crm.searchPlaceholder")}
          className="w-full sm:w-80"
        />
      </div>

      {/* Table */}
      <Card className="gap-0 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow className="text-xs uppercase tracking-wide text-ink-soft">
                <TableHead>{t("admin.crm.thId")}</TableHead>
                <TableHead>{t("admin.crm.thName")}</TableHead>
                <TableHead>{t("admin.crm.thPhone")}</TableHead>
                <TableHead>{t("admin.crm.thCity")}</TableHead>
                <TableHead>{t("admin.crm.thOrders")}</TableHead>
                <TableHead>{t("admin.crm.thSpent")}</TableHead>
                <TableHead>{t("admin.crm.thLastOrder")}</TableHead>
                <TableHead>{t("admin.crm.thStatus")}</TableHead>
                <TableHead className="text-end">{t("admin.crm.thActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-16 text-center text-ink-soft">
                    {t("admin.crm.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((c) => (
                  <TableRow
                    key={c.id}
                    onClick={() => openDetail(c.phone)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <TableCell className="font-mono text-xs text-brand-700">{shortId(c.id)}</TableCell>
                    <TableCell className="font-medium text-ink" dir="auto">{c.name}</TableCell>
                    <TableCell className="text-ink-soft" dir="ltr">{c.phone}</TableCell>
                    <TableCell className="text-ink-soft" dir="auto">{c.city || "—"}</TableCell>
                    <TableCell className="font-semibold text-ink">{c.orderCount}</TableCell>
                    <TableCell className="font-semibold text-ink">{formatMAD(c.totalSpent)}</TableCell>
                    <TableCell className="text-ink-soft">{c.lastOrderAt ? formatDate(c.lastOrderAt) : "—"}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          c.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600",
                        )}
                      >
                        {c.status === "active" ? t("admin.crm.statusActive") : t("admin.crm.statusInactive")}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDetail(c.phone)}
                          title={t("admin.crm.viewClient")}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition hover:bg-brand-50 hover:text-brand-600"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <a
                          href={`tel:${c.phone}`}
                          title={t("admin.crm.actCall")}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition hover:bg-brand-50 hover:text-brand-600"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                        <a
                          href={`https://wa.me/${waNumber(c.phone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="WhatsApp"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition hover:bg-emerald-50 hover:text-emerald-600"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm">
          <span className="text-ink-soft">
            {t("admin.crm.range", { from, to, total: filtered.length })}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-ink-soft transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-semibold text-ink">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-ink-soft transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Bottom widgets */}
      <div className="grid gap-6 lg:grid-cols-3">
        <CityDonut segments={segments} />
        <TopSpenders segments={segments} />
        <NewClients segments={segments} />
      </div>

      {/* Detail drawer */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDetailOpen(false)} />
          <aside className="relative z-10 h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
            <ClientDetailPanel
              detail={detail}
              loading={detailLoading}
              onClose={() => setDetailOpen(false)}
              onChanged={(d) => setDetail(d)}
            />
          </aside>
        </div>
      )}
    </div>
  );
}

/* ---------------- Detail panel ---------------- */

function ClientDetailPanel({
  detail,
  loading,
  onClose,
  onChanged,
}: {
  detail: ClientDetail | null;
  loading: boolean;
  onClose: () => void;
  onChanged: (d: ClientDetail) => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", city: "", email: "", address: "", note: "" });

  function startEdit() {
    if (!detail) return;
    setForm({
      name: detail.name,
      city: detail.city,
      email: detail.email ?? "",
      address: detail.address ?? "",
      note: detail.note ?? "",
    });
    setError(null);
    setEditing(true);
  }

  async function save() {
    if (!detail) return;
    setBusy(true);
    setError(null);
    const res = await updateClientAction(detail.phone, {
      name: form.name,
      city: form.city,
      email: form.email || null,
      address: form.address || null,
      note: form.note || null,
    });
    setBusy(false);
    if (res.ok) {
      onChanged({
        ...detail,
        name: form.name.trim(),
        city: form.city.trim(),
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        note: form.note.trim() || null,
      });
      setEditing(false);
    } else {
      setError(t("admin.crm.errorGeneric"));
    }
  }

  async function toggleStatus() {
    if (!detail) return;
    const next = detail.status === "active" ? "inactive" : "active";
    setBusy(true);
    const res = await setClientStatusAction(detail.phone, next);
    setBusy(false);
    if (res.ok) onChanged({ ...detail, status: next });
  }

  const input =
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100";

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h3 className="font-display font-bold text-ink">{t("admin.crm.detailTitle")}</h3>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-slate-100">
          <X className="h-5 w-5" />
        </button>
      </div>

      {loading || !detail ? (
        <div className="flex flex-1 items-center justify-center py-24 text-ink-soft">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-5 p-5">
          {/* identity */}
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
              {detail.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold text-ink" dir="auto">{detail.name}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-mono text-xs text-ink-soft">{shortId(detail.id)}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    detail.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600",
                  )}
                >
                  {detail.status === "active" ? t("admin.crm.statusActive") : t("admin.crm.statusInactive")}
                </span>
              </div>
            </div>
          </div>

          {editing ? (
            <div className="space-y-2">
              <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("admin.crm.editName")} />
              <input className={input} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={t("admin.crm.editCity")} />
              <input className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t("admin.crm.editEmail")} inputMode="email" />
              <input className={input} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t("admin.crm.editAddress")} />
              <textarea className={`${input} h-auto py-2`} rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={t("admin.crm.editNote")} />
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <div className="flex gap-2">
                <button onClick={save} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} {busy ? t("admin.crm.saving") : t("admin.crm.save")}
                </button>
                <button onClick={() => setEditing(false)} className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink-soft hover:bg-slate-50">
                  {t("admin.crm.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* contact */}
              <div className="space-y-2 text-sm">
                <a href={`tel:${detail.phone}`} className="flex items-center gap-2 text-ink hover:text-brand-700" dir="ltr">
                  <Phone className="h-4 w-4 text-ink-soft" /> {detail.phone}
                </a>
                {detail.email && (
                  <p className="flex items-center gap-2 text-ink" dir="ltr">
                    <Mail className="h-4 w-4 text-ink-soft" /> {detail.email}
                  </p>
                )}
                {detail.address && (
                  <p className="flex items-start gap-2 text-ink" dir="auto">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" /> {detail.address}{detail.city ? `, ${detail.city}` : ""}
                  </p>
                )}
                <p className="flex items-center gap-2 text-ink-soft">
                  <CalendarDays className="h-4 w-4" /> {t("admin.crm.registeredOn")}: {formatDate(detail.firstOrderAt)}
                </p>
                <p className="text-xs text-ink-soft">
                  {t("admin.crm.source")}: {detail.source === "phone" ? t("admin.crm.sourcePhone") : t("admin.crm.sourceWeb")}
                </p>
              </div>

              {/* stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-display text-lg font-bold text-ink">{detail.orderCount}</p>
                  <p className="text-[11px] text-ink-soft">{t("admin.crm.statOrders")}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-display text-sm font-bold text-ink">{formatMAD(detail.totalSpent)}</p>
                  <p className="text-[11px] text-ink-soft">{t("admin.crm.statSpent")}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-display text-sm font-bold text-ink">{formatMAD(detail.avgBasket)}</p>
                  <p className="text-[11px] text-ink-soft">{t("admin.crm.statBasket")}</p>
                </div>
              </div>

              {/* recent orders */}
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">{t("admin.crm.recentOrders")}</p>
                {detail.orders.length === 0 ? (
                  <p className="text-sm text-ink-soft">{t("admin.crm.noOrders")}</p>
                ) : (
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {detail.orders.map((o) => (
                      <Link
                        key={o.id}
                        href={`/admin/orders/${o.id}`}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm transition hover:bg-slate-50"
                      >
                        <span className="font-semibold text-brand-700">{o.id}</span>
                        <span className="text-ink-soft">{formatDate(o.createdAt)}</span>
                        <span className="font-medium text-ink">{formatMAD(o.total)}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", (STATUS_META as Record<string, { className: string }>)[o.status]?.className ?? "bg-slate-100 text-ink-soft")}>
                          {t(`status.${o.status}`)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {detail.note && (
                <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  <span className="font-semibold">{t("admin.crm.note")}: </span>
                  <span dir="auto">{detail.note}</span>
                </div>
              )}

              {/* actions */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <a href={`https://wa.me/${waNumber(detail.phone)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-full bg-[#25D366] py-2.5 text-sm font-semibold text-white transition hover:brightness-105">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
                <a href={`tel:${detail.phone}`} className="flex items-center justify-center gap-1.5 rounded-full border border-slate-200 py-2.5 text-sm font-semibold text-ink transition hover:bg-slate-50">
                  <Phone className="h-4 w-4" /> {t("admin.crm.actCall")}
                </a>
                <button onClick={startEdit} className="flex items-center justify-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100">
                  <Pencil className="h-4 w-4" /> {t("admin.crm.actEdit")}
                </button>
                <button onClick={toggleStatus} disabled={busy} className={cn("flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold transition disabled:opacity-60", detail.status === "active" ? "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50" : "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50")}>
                  <Power className="h-4 w-4" /> {detail.status === "active" ? t("admin.crm.actDeactivate") : t("admin.crm.actActivate")}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Bottom widgets ---------------- */

function CityDonut({ segments }: { segments: ClientSegments }) {
  const { t } = useI18n();
  const data = segments.byCity;
  const total = data.reduce((s, d) => s + d.count, 0);
  const R = 48;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-soft">{t("admin.crm.cityTitle")}</p>
      {total === 0 ? (
        <p className="py-10 text-center text-sm text-ink-soft">—</p>
      ) : (
        <div className="flex items-center gap-5">
          <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0">
            <circle cx="60" cy="60" r={R} fill="none" stroke="#f1f5f9" strokeWidth="14" />
            {data.map((d, i) => {
              const frac = d.count / total;
              const len = frac * C;
              const el = (
                <circle
                  key={i}
                  cx="60"
                  cy="60"
                  r={R}
                  fill="none"
                  stroke={CITY_COLORS[i % CITY_COLORS.length]}
                  strokeWidth="14"
                  strokeDasharray={`${len} ${C - len}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 60 60)"
                />
              );
              offset += len;
              return el;
            })}
            <text x="60" y="56" textAnchor="middle" className="fill-ink font-bold" fontSize="20">{total}</text>
            <text x="60" y="72" textAnchor="middle" className="fill-slate-400" fontSize="9">{t("admin.crm.clientsWord")}</text>
          </svg>
          <ul className="flex-1 space-y-1.5 text-sm">
            {data.map((d, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-ink" dir="auto">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: CITY_COLORS[i % CITY_COLORS.length] }} />
                  {d.city === "__other__" ? t("admin.crm.otherCity") : d.city}
                </span>
                <span className="text-ink-soft">{Math.round((d.count / total) * 100)}% ({d.count})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TopSpenders({ segments }: { segments: ClientSegments }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-soft">{t("admin.crm.topTitle")}</p>
      {segments.topSpenders.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-soft">—</p>
      ) : (
        <ol className="space-y-3">
          {segments.topSpenders.map((c, i) => (
            <li key={c.phone} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink" dir="auto">{c.name}</span>
              <span className="text-sm font-semibold text-ink">{formatMAD(c.spent)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function NewClients({ segments }: { segments: ClientSegments }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-soft">{t("admin.crm.newTitle")}</p>
      {segments.newClients.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-soft">—</p>
      ) : (
        <ul className="space-y-3">
          {segments.newClients.map((c) => (
            <li key={c.phone} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium text-ink" dir="auto">{c.name}</span>
              <span className="text-ink-soft">{formatDate(c.firstOrderAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
