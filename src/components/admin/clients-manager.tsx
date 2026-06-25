"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Label as ChartLabel, Pie, PieChart, Cell } from "recharts";
import {
  Users,
  ShoppingCart,
  UserPlus,
  PackageCheck,
  Wallet,
  Eye,
  Phone,
  MessageCircle,
  Pencil,
  MapPin,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Loader2,
  Power,
  Mail,
  Star,
  Receipt,
  Wrench,
  ShoppingBag,
  StickyNote,
  X,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/i18n-context";
import { formatMAD, formatDate, cn, waNumber } from "@/lib/utils";
import {
  getClientDetailAction,
  setClientStatusAction,
  updateClientAction,
  setClientTagsAction,
  addClientNoteAction,
  createClientAction,
} from "@/lib/client-actions";
import type { ClientRow, ClientSegments, ClientDetail, ClientLifecycle, ClientTimelineEvent } from "@/lib/data";
import { STATUS_META } from "@/lib/order-status";
import { dashboardFont, dashboardFontStyle } from "@/lib/fonts";
import { KpiCard } from "@/components/admin/kpi-card";
import { SearchInput } from "@/components/admin/search-input";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

const PAGE = 10;
const CITY_COLORS = ["#3b82f6", "#22c55e", "#14b8a6", "#f59e0b", "#ef4444"];

type Seg = "all" | ClientLifecycle | "vip";
type SortKey = "name" | "orderCount" | "totalSpent" | "lastOrderAt";
type SortDir = "asc" | "desc";

const shortId = (id: string) => "#CLT-" + id.slice(-6).toUpperCase();

/** Lifecycle badge colors. */
const LIFE_STYLE: Record<ClientLifecycle, string> = {
  lead: "bg-slate-100 text-slate-600",
  new: "bg-brand-100 text-brand-700",
  active: "bg-emerald-100 text-emerald-700",
  due: "bg-amber-100 text-amber-700",
  lost: "bg-rose-100 text-rose-600",
};

function lifeLabel(t: (k: string) => string, life: ClientLifecycle) {
  return t(`admin.crm.seg.${life}`);
}

function outcomeLabel(t: (k: string) => string, o: string) {
  if (o === "rappeler") return t("admin.ordersPage.outcomeCallBack");
  if (o === "pas_reponse") return t("admin.ordersPage.outcomeNoAnswer");
  return t(`status.${o}`);
}

function channelLabel(t: (k: string) => string, ch: string) {
  if (ch === "__unknown__") return t("admin.crm.channelUnknown");
  if (ch === "referral") return t("admin.crm.channelReferral");
  if (ch === "other") return t("admin.crm.channelOther");
  return ch.charAt(0).toUpperCase() + ch.slice(1); // Facebook, Tiktok, Instagram, Google
}

export function ClientsManager({
  clients,
  segments,
}: {
  clients: ClientRow[];
  segments: ClientSegments;
}) {
  const { t } = useI18n();
  const [seg, setSeg] = useState<Seg>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("lastOrderAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [cForm, setCForm] = useState({ phone: "", name: "", city: "", email: "", address: "" });
  const [cBusy, setCBusy] = useState(false);
  const [cError, setCError] = useState<string | null>(null);

  const pct = (v: number) => (segments.total ? Math.round((v / segments.total) * 100) : 0);

  const filtered = useMemo(() => {
    let list = clients;
    if (seg === "vip") list = list.filter((c) => c.isVip);
    else if (seg !== "all") list = list.filter((c) => c.lifecycle === seg);
    const s = q.trim().toLowerCase();
    if (s)
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.phone.includes(s.replace(/\s/g, "")) ||
          c.city.toLowerCase().includes(s) ||
          (c.email ?? "").toLowerCase().includes(s),
      );
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "orderCount") cmp = a.orderCount - b.orderCount;
      else if (sortKey === "totalSpent") cmp = a.totalSpent - b.totalSpent;
      else {
        const av = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
        const bv = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
        cmp = av - bv;
      }
      return cmp * dir;
    });
  }, [clients, seg, q, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE, safePage * PAGE);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE + 1;
  const to = Math.min(safePage * PAGE, filtered.length);

  function switchSeg(next: Seg) {
    setSeg(next);
    setPage(1);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  async function openDetail(phone: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    const d = await getClientDetailAction(phone);
    setDetail(d);
    setDetailLoading(false);
  }

  async function submitCreate() {
    setCBusy(true);
    setCError(null);
    const res = await createClientAction({
      phone: cForm.phone,
      name: cForm.name,
      city: cForm.city,
      email: cForm.email || null,
      address: cForm.address || null,
    });
    setCBusy(false);
    if (res.ok) {
      setCreateOpen(false);
      setCForm({ phone: "", name: "", city: "", email: "", address: "" });
      toast.success(t("admin.toast.created"));
      router.refresh();
    } else {
      toast.error(t("admin.toast.error"));
      setCError(
        res.error === "EXISTS"
          ? t("admin.crm.errExists")
          : res.error === "INVALID_PHONE"
            ? t("admin.crm.errPhone")
            : t("admin.crm.errorGeneric"),
      );
    }
  }

  const KPIS = [
    { icon: Users, tone: "bg-brand-50 text-brand-600", label: t("admin.crm.kpiTotal"), value: String(segments.total), hint: t("admin.crm.kpiTotalHint") },
    { icon: ShoppingCart, tone: "bg-emerald-50 text-emerald-600", label: t("admin.crm.kpiWithOrders"), value: String(segments.acheteurs), hint: t("admin.crm.ofTotal", { pct: pct(segments.acheteurs) }) },
    { icon: PackageCheck, tone: "bg-indigo-50 text-indigo-600", label: t("admin.crm.kpiInstalled"), value: String(segments.installed), hint: t("admin.crm.kpiInstalledHint") },
    { icon: Wrench, tone: "bg-amber-50 text-amber-600", label: t("admin.crm.kpiDue"), value: String(segments.due), hint: t("admin.crm.kpiDueHint") },
    { icon: UserPlus, tone: "bg-sky-50 text-sky-600", label: t("admin.crm.kpiNewMonth"), value: String(segments.newThisMonth), hint: t("admin.crm.ofTotal", { pct: pct(segments.newThisMonth) }) },
    { icon: Wallet, tone: "bg-violet-50 text-violet-600", label: t("admin.crm.kpiRevenue"), value: formatMAD(segments.revenue), hint: t("admin.crm.kpiRevenueHint") },
  ];

  const SEGS: { key: Seg; label: string; count: number }[] = [
    { key: "all", label: t("admin.crm.tabAll"), count: segments.total },
    { key: "lead", label: lifeLabel(t, "lead"), count: segments.leads },
    { key: "new", label: lifeLabel(t, "new"), count: segments.newCount },
    { key: "active", label: lifeLabel(t, "active"), count: segments.active },
    { key: "due", label: lifeLabel(t, "due"), count: segments.due },
    { key: "lost", label: lifeLabel(t, "lost"), count: segments.lost },
    { key: "vip", label: t("admin.crm.seg.vip"), count: segments.vip },
  ];

  function SortHead({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) {
    const active = sortKey === k;
    return (
      <TableHead className={className}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => toggleSort(k)}
          className="-ms-2 h-auto gap-1 px-2 py-0 font-semibold uppercase tracking-wide text-ink-soft hover:bg-transparent hover:text-ink"
        >
          {children}
          {active ? (
            sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
          )}
        </Button>
      </TableHead>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {KPIS.map((k) => (
          <KpiCard key={k.label} icon={k.icon} tone={k.tone} label={k.label} value={k.value} hint={k.hint} />
        ))}
      </div>

      {/* Segment chips + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {SEGS.map((s) => (
            <Button
              key={s.key}
              type="button"
              size="sm"
              variant={seg === s.key ? "primary" : "outline"}
              onClick={() => switchSeg(s.key)}
              className="font-semibold"
            >
              {s.key === "vip" && <Star className="h-3.5 w-3.5" />}
              {s.label}
              <span className={cn("ms-1", seg === s.key ? "text-white/80" : "text-ink-soft")}>{s.count}</span>
            </Button>
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

      {/* Range + new client */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink-soft">
          {t("admin.crm.range", { from, to, total: filtered.length })}
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 font-semibold">
          <Plus className="h-4 w-4" /> {t("admin.crm.newClient")}
        </Button>
      </div>

      {/* Table */}
      <Card className="gap-0 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="text-xs uppercase tracking-wide text-ink-soft">
                <TableHead>{t("admin.crm.thId")}</TableHead>
                <SortHead k="name">{t("admin.crm.thName")}</SortHead>
                <TableHead>{t("admin.crm.thPhone")}</TableHead>
                <TableHead>{t("admin.crm.thCity")}</TableHead>
                <SortHead k="orderCount">{t("admin.crm.thOrders")}</SortHead>
                <SortHead k="totalSpent">{t("admin.crm.thSpent")}</SortHead>
                <SortHead k="lastOrderAt">{t("admin.crm.thLastOrder")}</SortHead>
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
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell onClick={(e) => e.stopPropagation()} className="font-mono text-xs">
                      <Link href={`/admin/clients/${c.id}`} className="text-brand-700 hover:underline">{shortId(c.id)}</Link>
                    </TableCell>
                    <TableCell dir="auto">
                      <span className="flex items-center gap-2 font-semibold text-ink">
                        {c.name}
                        {c.isVip && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                      </span>
                    </TableCell>
                    <TableCell className="text-ink-soft" dir="ltr">{c.phone}</TableCell>
                    <TableCell className="text-ink-soft" dir="auto">{c.city || "—"}</TableCell>
                    <TableCell className="font-semibold text-ink">{c.orderCount}</TableCell>
                    <TableCell className="font-semibold text-ink">{formatMAD(c.totalSpent)}</TableCell>
                    <TableCell className="text-ink-soft">{c.lastOrderAt ? formatDate(c.lastOrderAt) : "—"}</TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", LIFE_STYLE[c.lifecycle])}>{lifeLabel(t, c.lifecycle)}</Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="icon-sm" onClick={() => openDetail(c.phone)} className="rounded-lg text-ink-soft hover:bg-brand-50 hover:text-brand-600">
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">{t("admin.crm.viewClient")}</span>
                        </Button>
                        <a href={`tel:${c.phone}`} title={t("admin.crm.actCall")} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition hover:bg-brand-50 hover:text-brand-600">
                          <Phone className="h-4 w-4" />
                        </a>
                        <a href={`https://wa.me/${waNumber(c.phone)}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition hover:bg-emerald-50 hover:text-emerald-600">
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
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
          <span className="font-semibold text-ink-soft">{t("admin.crm.range", { from, to, total: filtered.length })}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="text-ink-soft">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">prev</span>
            </Button>
            <span className="px-2 font-semibold text-ink">{safePage} / {totalPages}</span>
            <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="text-ink-soft">
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">next</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Bottom widgets */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <CityDonut segments={segments} />
        <Channels segments={segments} />
        <TopSpenders segments={segments} />
        <NewClients segments={segments} />
      </div>

      {/* Detail sheet (font-scoped so the portal stays on the dashboard font) */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent
          side="right"
          className={cn(dashboardFont.variable, "w-full gap-0 overflow-y-auto p-0 font-semibold sm:max-w-md")}
          style={dashboardFontStyle}
        >
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="font-display font-bold text-ink">{t("admin.crm.detailTitle")}</SheetTitle>
          </SheetHeader>
          <ClientDetailPanel detail={detail} loading={detailLoading} onChanged={(d) => setDetail(d)} />
        </SheetContent>
      </Sheet>

      {/* New client dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          className={cn(dashboardFont.variable, "font-semibold sm:max-w-md")}
          style={dashboardFontStyle}
        >
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-ink">{t("admin.crm.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-ink-soft">{t("admin.crm.createPhone")} *</Label>
              <Input value={cForm.phone} onChange={(e) => setCForm({ ...cForm, phone: e.target.value })} dir="ltr" inputMode="tel" placeholder="06 12 34 56 78" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-ink-soft">{t("admin.crm.editName")} *</Label>
              <Input value={cForm.name} onChange={(e) => setCForm({ ...cForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input value={cForm.city} onChange={(e) => setCForm({ ...cForm, city: e.target.value })} placeholder={t("admin.crm.editCity")} />
              <Input value={cForm.email} onChange={(e) => setCForm({ ...cForm, email: e.target.value })} placeholder={t("admin.crm.editEmail")} inputMode="email" />
            </div>
            <Input value={cForm.address} onChange={(e) => setCForm({ ...cForm, address: e.target.value })} placeholder={t("admin.crm.editAddress")} />
            {cError && <p className="text-sm font-semibold text-rose-600">{cError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="font-semibold">{t("admin.crm.cancel")}</Button>
            <Button onClick={submitCreate} disabled={cBusy || !cForm.phone.trim() || cForm.name.trim().length < 2} className="gap-1.5 font-semibold">
              {cBusy && <Loader2 className="h-4 w-4 animate-spin" />} {t("admin.crm.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Detail panel ---------------- */

const EVT_META: Record<ClientTimelineEvent["type"], { icon: typeof Receipt; tone: string; labelKey: string }> = {
  order: { icon: ShoppingBag, tone: "bg-brand-50 text-brand-600", labelKey: "admin.crm.evtOrder" },
  maintenance: { icon: Wrench, tone: "bg-amber-50 text-amber-600", labelKey: "admin.crm.evtMaintenance" },
  invoice: { icon: Receipt, tone: "bg-emerald-50 text-emerald-600", labelKey: "admin.crm.evtInvoice" },
  note: { icon: StickyNote, tone: "bg-slate-100 text-slate-600", labelKey: "admin.crm.evtNote" },
  review: { icon: Star, tone: "bg-violet-50 text-violet-600", labelKey: "admin.crm.evtReview" },
};

export function ClientDetailPanel({
  detail,
  loading,
  onChanged,
}: {
  detail: ClientDetail | null;
  loading: boolean;
  onChanged: (d: ClientDetail) => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", city: "", email: "", address: "", note: "" });
  const [tagInput, setTagInput] = useState("");
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  async function addTag(raw: string) {
    const tag = raw.trim();
    if (!detail || !tag || detail.tags.includes(tag)) return;
    const optimistic = [...detail.tags, tag];
    onChanged({ ...detail, tags: optimistic });
    setTagInput("");
    const res = await setClientTagsAction(detail.phone, optimistic);
    onChanged({ ...detail, tags: res.ok ? res.tags : detail.tags }); // reconcile (server caps/cleans) or roll back
    if (res.ok) toast.success(t("admin.toast.saved"));
    else toast.error(t("admin.toast.error"));
  }
  async function removeTag(tag: string) {
    if (!detail) return;
    const optimistic = detail.tags.filter((x) => x !== tag);
    onChanged({ ...detail, tags: optimistic });
    const res = await setClientTagsAction(detail.phone, optimistic);
    onChanged({ ...detail, tags: res.ok ? res.tags : detail.tags });
    if (res.ok) toast.success(t("admin.toast.saved"));
    else toast.error(t("admin.toast.error"));
  }
  async function submitNote() {
    if (!detail || !noteText.trim()) return;
    setSavingNote(true);
    const res = await addClientNoteAction(detail.phone, noteText);
    setSavingNote(false);
    if (res.ok) {
      const ev = { id: res.note.id, type: "note" as const, date: res.note.createdAt, title: res.note.body, amount: null, status: null, href: null };
      onChanged({ ...detail, notes: [res.note, ...detail.notes], timeline: [ev, ...detail.timeline] });
      setNoteText("");
      toast.success(t("admin.toast.created"));
    } else {
      toast.error(t("admin.toast.error"));
    }
  }

  function startEdit() {
    if (!detail) return;
    setForm({ name: detail.name, city: detail.city, email: detail.email ?? "", address: detail.address ?? "", note: detail.note ?? "" });
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
      onChanged({ ...detail, name: form.name.trim(), city: form.city.trim(), email: form.email.trim() || null, address: form.address.trim() || null, note: form.note.trim() || null });
      setEditing(false);
      toast.success(t("admin.toast.saved"));
    } else {
      toast.error(t("admin.toast.error"));
      setError(t("admin.crm.errorGeneric"));
    }
  }

  async function toggleStatus() {
    if (!detail) return;
    const next = detail.status === "active" ? "inactive" : "active";
    setBusy(true);
    const res = await setClientStatusAction(detail.phone, next);
    setBusy(false);
    if (res.ok) {
      onChanged({ ...detail, status: next });
      toast.success(t("admin.toast.saved"));
    } else {
      toast.error(t("admin.toast.error"));
    }
  }

  if (loading || !detail) {
    return (
      <div className="space-y-5 p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-5">
      {/* identity */}
      <div className="flex items-center gap-3">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="bg-brand-100 text-xl font-bold text-brand-700">{detail.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-display text-lg font-bold text-ink" dir="auto">
            {detail.name}
            {detail.isVip && <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-ink-soft">{shortId(detail.id)}</span>
            <Badge className={cn("text-xs", LIFE_STYLE[detail.lifecycle])}>{lifeLabel(t, detail.lifecycle)}</Badge>
            <Badge className={cn("text-xs", detail.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600")}>
              {detail.status === "active" ? t("admin.crm.statusActive") : t("admin.crm.statusInactive")}
            </Badge>
          </div>
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <Input className="h-10" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("admin.crm.editName")} />
          <Input className="h-10" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={t("admin.crm.editCity")} />
          <Input className="h-10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t("admin.crm.editEmail")} inputMode="email" />
          <Input className="h-10" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t("admin.crm.editAddress")} />
          <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={t("admin.crm.editNote")} />
          {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={save} disabled={busy} className="flex-1 gap-1.5 font-semibold">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} {busy ? t("admin.crm.saving") : t("admin.crm.save")}
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)} className="font-semibold">{t("admin.crm.cancel")}</Button>
          </div>
        </div>
      ) : (
        <>
          {/* tags */}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">{t("admin.crm.tagsTitle")}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {detail.tags.map((tag) => (
                <Badge key={tag} className="gap-1 bg-muted text-foreground">
                  {tag}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeTag(tag)}
                    className="h-4 w-4 rounded-full p-0 text-muted-foreground hover:bg-transparent hover:text-rose-600"
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">{t("admin.crm.removeTag")}</span>
                  </Button>
                </Badge>
              ))}
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                placeholder={t("admin.crm.addTag")}
                className="h-7 w-32 text-xs"
              />
            </div>
          </div>

          {/* contact */}
          <div className="space-y-2 text-sm">
            <a href={`tel:${detail.phone}`} className="flex items-center gap-2 text-ink hover:text-brand-700" dir="ltr">
              <Phone className="h-4 w-4 text-ink-soft" /> {detail.phone}
            </a>
            {detail.email && (
              <p className="flex items-center gap-2 text-ink" dir="ltr"><Mail className="h-4 w-4 text-ink-soft" /> {detail.email}</p>
            )}
            {detail.address && (
              <p className="flex items-start gap-2 text-ink" dir="auto"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" /> {detail.address}{detail.city ? `, ${detail.city}` : ""}</p>
            )}
            <p className="flex items-center gap-2 text-ink-soft"><CalendarDays className="h-4 w-4" /> {t("admin.crm.registeredOn")}: {formatDate(detail.firstOrderAt)}</p>
            <p className="text-xs text-ink-soft">{t("admin.crm.source")}: {detail.source === "phone" ? t("admin.crm.sourcePhone") : t("admin.crm.sourceWeb")}</p>
            {(detail.acquisitionSource || detail.whatsappOptIn) && (
              <p className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                {detail.acquisitionSource && (
                  <span>{t("admin.crm.channel")}: <span className="font-semibold text-ink">{channelLabel(t, detail.acquisitionSource)}</span></span>
                )}
                {detail.whatsappOptIn && <Badge className="bg-emerald-50 text-emerald-700">{t("admin.crm.consentWhatsapp")}</Badge>}
              </p>
            )}
            {detail.contact.callAttempts > 0 && (
              <p className="flex flex-wrap items-center gap-2 text-ink-soft">
                <Phone className="h-4 w-4" /> {t("admin.crm.calls", { n: detail.contact.callAttempts })}
                {detail.contact.lastOutcome && (
                  <Badge className="bg-muted text-ink-soft">{outcomeLabel(t, detail.contact.lastOutcome)}</Badge>
                )}
              </p>
            )}
          </div>

          {/* stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="font-display text-lg font-bold text-ink">{detail.orderCount}</p>
              <p className="text-[11px] text-ink-soft">{t("admin.crm.statOrders")}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="font-display text-sm font-bold text-ink">{formatMAD(detail.totalSpent)}</p>
              <p className="text-[11px] text-ink-soft">{t("admin.crm.statSpent")}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="font-display text-sm font-bold text-ink">{formatMAD(detail.avgBasket)}</p>
              <p className="text-[11px] text-ink-soft">{t("admin.crm.statBasket")}</p>
            </div>
          </div>

          {/* installed devices (parc) */}
          {detail.devices.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">{t("admin.crm.devicesTitle")}</p>
              <div className="space-y-2">
                {detail.devices.map((d) => (
                  <div key={d.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-semibold text-ink" dir="auto">
                        <PackageCheck className="h-4 w-4 shrink-0 text-brand-500" /> {d.model}
                      </span>
                      {d.due && <Badge className="bg-amber-100 text-amber-700">{t("admin.crm.seg.due")}</Badge>}
                    </div>
                    <div className="mt-1.5 grid grid-cols-1 gap-0.5 text-xs text-ink-soft sm:grid-cols-3">
                      <span>{t("admin.crm.installedOn")}: {d.installedAt ? formatDate(d.installedAt) : "—"}</span>
                      <span>{t("admin.crm.nextMaint")}: {d.nextMaintenanceAt ? formatDate(d.nextMaintenanceAt) : "—"}</span>
                      <span>{t("admin.crm.warranty")}: {d.warrantyUntil ? formatDate(d.warrantyUntil) : "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* actions */}
          <div className="grid grid-cols-2 gap-2">
            <a href={`https://wa.me/${waNumber(detail.phone)}`} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "whatsapp", size: "sm" }), "w-full")}>
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
            <a href={`tel:${detail.phone}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}>
              <Phone className="h-4 w-4" /> {t("admin.crm.actCall")}
            </a>
            <Button variant="outline" size="sm" onClick={startEdit} className="border-brand-200 bg-brand-50 font-semibold text-brand-700 hover:bg-brand-100">
              <Pencil className="h-4 w-4" /> {t("admin.crm.actEdit")}
            </Button>
            <Button variant="outline" size="sm" onClick={toggleStatus} disabled={busy} className={cn("font-semibold", detail.status === "active" ? "border-rose-200 bg-card text-rose-600 hover:bg-rose-50" : "border-emerald-200 bg-card text-emerald-700 hover:bg-emerald-50")}>
              <Power className="h-4 w-4" /> {detail.status === "active" ? t("admin.crm.actDeactivate") : t("admin.crm.actActivate")}
            </Button>
          </div>

          {detail.note && (
            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              <span className="font-semibold">{t("admin.crm.note")}: </span>
              <span dir="auto">{detail.note}</span>
            </div>
          )}

          {/* add note */}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">{t("admin.crm.notesTitle")}</p>
            <div className="flex items-start gap-2">
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={2}
                placeholder={t("admin.crm.addNote")}
                className="flex-1"
              />
              <Button onClick={submitNote} disabled={savingNote || !noteText.trim()} size="sm" className="font-semibold">
                {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* unified activity timeline */}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">{t("admin.crm.timeline")}</p>
            {detail.timeline.length === 0 ? (
              <p className="text-sm text-ink-soft">{t("admin.crm.noOrders")}</p>
            ) : (
              <ol className="space-y-3">
                {detail.timeline.map((e) => {
                  const m = EVT_META[e.type];
                  const Icon = m.icon;
                  const inner = (
                    <>
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", m.tone)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-ink">{t(m.labelKey)}</span>
                          {e.amount != null && <span className="font-semibold text-ink">{formatMAD(e.amount)}</span>}
                        </span>
                        <span className="flex items-center justify-between gap-2 text-xs text-ink-soft">
                          <span className="truncate">{e.title}</span>
                          <span className="shrink-0">{formatDate(e.date)}</span>
                        </span>
                      </span>
                    </>
                  );
                  return e.href ? (
                    <li key={`${e.type}-${e.id}`}>
                      <Link href={e.href} className="flex items-center gap-3 rounded-xl border border-border p-2.5 transition hover:bg-muted/50">{inner}</Link>
                    </li>
                  ) : (
                    <li key={`${e.type}-${e.id}`} className="flex items-center gap-3 rounded-xl border border-border p-2.5">{inner}</li>
                  );
                })}
              </ol>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Bottom widgets ---------------- */

function CityDonut({ segments }: { segments: ClientSegments }) {
  const { t } = useI18n();
  const data = segments.byCity.map((d, i) => ({
    key: d.city,
    label: d.city === "__other__" ? t("admin.crm.otherCity") : d.city,
    value: d.count,
    fill: CITY_COLORS[i % CITY_COLORS.length],
  }));
  const total = data.reduce((s, d) => s + d.value, 0);
  const config = Object.fromEntries(data.map((d) => [d.key, { label: d.label, color: d.fill }])) satisfies ChartConfig;

  return (
    <Card className="gap-0 p-5">
      <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-soft">{t("admin.crm.cityTitle")}</p>
      {total === 0 ? (
        <p className="py-10 text-center text-sm text-ink-soft">—</p>
      ) : (
        <div className="flex items-center gap-5">
          <ChartContainer config={config} className="aspect-square h-32 w-32 shrink-0">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="key" innerRadius={40} outerRadius={58} strokeWidth={2}>
                {data.map((d) => (
                  <Cell key={d.key} fill={d.fill} />
                ))}
                <ChartLabel
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && viewBox.cx != null && viewBox.cy != null) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-ink font-extrabold" fontSize="20">{total}</tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy as number) + 16} className="fill-slate-400 font-semibold" fontSize="9">{t("admin.crm.clientsWord")}</tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="flex-1 space-y-1.5 text-sm">
            {data.map((d) => (
              <li key={d.key} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-ink" dir="auto">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.fill }} />
                  {d.label}
                </span>
                <span className="font-semibold text-ink-soft">{Math.round((d.value / total) * 100)}% ({d.value})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Channels({ segments }: { segments: ClientSegments }) {
  const { t } = useI18n();
  const total = segments.byChannel.reduce((s, d) => s + d.count, 0);
  return (
    <Card className="gap-0 p-5">
      <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-soft">{t("admin.crm.channelsTitle")}</p>
      {segments.byChannel.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-soft">—</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {segments.byChannel.map((d) => (
            <li key={d.channel} className="flex items-center justify-between gap-2">
              <span className="text-ink">{channelLabel(t, d.channel)}</span>
              <span className="font-semibold text-ink-soft">{total ? Math.round((d.count / total) * 100) : 0}% ({d.count})</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function TopSpenders({ segments }: { segments: ClientSegments }) {
  const { t } = useI18n();
  return (
    <Card className="gap-0 p-5">
      <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-soft">{t("admin.crm.topTitle")}</p>
      {segments.topSpenders.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-soft">—</p>
      ) : (
        <ol className="space-y-3">
          {segments.topSpenders.map((c, i) => (
            <li key={c.phone} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink" dir="auto">{c.name}</span>
              <span className="text-sm font-semibold text-ink">{formatMAD(c.spent)}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function NewClients({ segments }: { segments: ClientSegments }) {
  const { t } = useI18n();
  return (
    <Card className="gap-0 p-5">
      <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-soft">{t("admin.crm.newTitle")}</p>
      {segments.newClients.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-soft">—</p>
      ) : (
        <ul className="space-y-3">
          {segments.newClients.map((c) => (
            <li key={c.phone} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-semibold text-ink" dir="auto">{c.name}</span>
              <span className="text-ink-soft">{formatDate(c.firstOrderAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
