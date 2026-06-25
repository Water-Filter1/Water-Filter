"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Boxes,
  Wallet,
  ShoppingCart,
  PackageX,
  Package,
  Loader2,
  Pencil,
  History,
  ArrowUp,
  ArrowDown,
  PackagePlus,
} from "lucide-react";
import { useI18n } from "@/i18n/i18n-context";
import { formatMAD, formatDate, cn } from "@/lib/utils";
import { dashboardFont, dashboardFontStyle } from "@/lib/fonts";
import { ProductPhoto } from "@/components/product-photo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { adjustStockAction, setReorderPointAction, getStockMovementsAction } from "@/lib/admin-actions";
import type { StockRow, StockSummary, StockMovementRow, StockReason } from "@/lib/data";
import { KpiCard } from "@/components/admin/kpi-card";
import { DataTable, type Column } from "@/components/admin/data-table";

const REASONS: StockReason[] = ["received", "return", "damaged", "correction"];

function statusOf(r: StockRow, t: (k: string) => string) {
  if (r.stock <= 0 && r.allowBackorder)
    return { label: t("admin.stock.statusBackorder"), cls: "bg-indigo-50 text-indigo-600" };
  if (r.stock <= 0) return { label: t("admin.stock.statusOut"), cls: "bg-rose-50 text-rose-600" };
  if (r.stock <= r.reorderPoint) return { label: t("admin.stock.statusLow"), cls: "bg-amber-50 text-amber-700" };
  return { label: t("admin.stock.statusOk"), cls: "bg-emerald-50 text-emerald-700" };
}

type Tab = "all" | "reorder" | "out";

export function StockManager({ rows, summary }: { rows: StockRow[]; summary: StockSummary }) {
  const { t } = useI18n();
  const router = useRouter();

  const reasonLabel = (r: string) => t(`admin.stock.reason.${r}`);

  const [tab, setTab] = useState<Tab>("all");

  // Adjust dialog (lastRow keeps content during the close animation)
  const [adjustRow, setAdjustRow] = useState<StockRow | null>(null);
  const [lastRow, setLastRow] = useState<StockRow | null>(null);
  const [reason, setReason] = useState<StockReason>("received");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Reorder-point inline edit
  const [openRP, setOpenRP] = useState<string | null>(null);
  const [rpVals, setRpVals] = useState<Record<string, string>>({});
  const [rpBusy, setRpBusy] = useState<string | null>(null);

  // History sheet
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [historyName, setHistoryName] = useState("");
  const [movements, setMovements] = useState<StockMovementRow[] | null>(null);
  const historyReq = useRef(0);

  function openAdjust(r: StockRow) {
    setAdjustRow(r);
    setLastRow(r);
    setReason("received");
    setQty("");
    setNote("");
    setErr(null);
  }

  async function submitAdjust() {
    if (!adjustRow) return;
    const q = Number(qty);
    if (qty.trim() === "" || !Number.isFinite(q) || q < 0) {
      setErr(t("admin.stock.qtyError"));
      return;
    }
    setSaving(true);
    setErr(null);
    const res = await adjustStockAction(adjustRow.id, reason, q, note || undefined);
    setSaving(false);
    if (res.ok) {
      setAdjustRow(null);
      toast.success(t("admin.toast.saved"));
      router.refresh();
    } else {
      toast.error(t("admin.toast.error"));
      setErr(t("admin.stock.saveError"));
    }
  }

  const dlgRow = adjustRow ?? lastRow;
  const previewAfter = dlgRow
    ? (() => {
        const q = Math.abs(Math.round(Number(qty) || 0));
        return reason === "correction"
          ? q
          : reason === "damaged"
            ? Math.max(0, dlgRow.stock - q)
            : dlgRow.stock + q;
      })()
    : null;

  function rpFor(r: StockRow) {
    return rpVals[r.id] ?? String(r.reorderPoint);
  }

  async function saveRP(r: StockRow) {
    const raw = rpFor(r).trim();
    if (raw === "") return;
    const v = Number(raw);
    if (!Number.isFinite(v) || v < 0 || v === r.reorderPoint) return;
    setRpBusy(r.id);
    const res = await setReorderPointAction(r.id, v);
    setRpBusy(null);
    if (res.ok) {
      setOpenRP(null);
      setRpVals((prev) => {
        const next = { ...prev };
        delete next[r.id];
        return next;
      });
      toast.success(t("admin.toast.saved"));
      router.refresh();
    } else {
      toast.error(t("admin.toast.error"));
    }
  }

  async function openHistory(r: StockRow) {
    const reqId = ++historyReq.current;
    setHistoryId(r.id);
    setHistoryName(r.name);
    setMovements(null);
    const res = await getStockMovementsAction(r.id);
    if (historyReq.current !== reqId) return; // a newer open superseded this fetch
    setMovements(res.ok ? res.rows : []);
  }

  const kpis = [
    { icon: Boxes, tone: "bg-brand-50 text-brand-600", label: t("admin.stock.kpiUnits"), value: String(summary.totalUnits) },
    { icon: Wallet, tone: "bg-emerald-50 text-emerald-600", label: t("admin.stock.kpiValue"), value: formatMAD(summary.totalValue) },
    { icon: ShoppingCart, tone: "bg-amber-50 text-amber-600", label: t("admin.stock.kpiReorder"), value: String(summary.reorderCount) },
    { icon: PackageX, tone: "bg-rose-50 text-rose-600", label: t("admin.stock.kpiOut"), value: String(summary.outCount) },
    { icon: Package, tone: "bg-sky-50 text-sky-600", label: t("admin.stock.kpiSku"), value: String(summary.skuCount) },
  ];

  const filtered =
    tab === "reorder"
      ? rows.filter((r) => r.stock <= r.reorderPoint && !r.allowBackorder)
      : tab === "out"
        ? rows.filter((r) => r.stock <= 0 && !r.allowBackorder)
        : rows;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: t("admin.stock.tabAll"), count: summary.skuCount },
    { key: "reorder", label: t("admin.stock.kpiReorder"), count: summary.reorderCount },
    { key: "out", label: t("admin.stock.tabOut"), count: summary.outCount },
  ];

  const columns: Column<StockRow>[] = [
    {
      key: "name",
      header: t("admin.stock.thProduct"),
      sort: (r) => r.name,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <ProductPhoto src={r.image} alt={r.name} hue={r.hue} sizes="40px" className="p-0.5" />
          </div>
          <span className="line-clamp-1 font-semibold text-ink" dir="auto">{r.name}</span>
        </div>
      ),
    },
    {
      key: "category",
      header: t("admin.stock.thCategory"),
      className: "text-ink-soft",
      cell: (r) => t(`cat.${r.categorySlug}.name`),
    },
    {
      key: "stock",
      header: t("admin.stock.thStock"),
      sort: (r) => r.stock,
      cell: (r) => <span className="font-bold tabular-nums text-ink">{r.stock}</span>,
    },
    {
      key: "reorder",
      header: t("admin.stock.thReorder"),
      sort: (r) => r.reorderPoint,
      cell: (r) => (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold tabular-nums text-ink-soft">{r.reorderPoint}</span>
          <Popover open={openRP === r.id} onOpenChange={(o) => setOpenRP(o ? r.id : null)}>
            <PopoverTrigger
              className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "text-ink-soft hover:bg-brand-50 hover:text-brand-600")}
            >
              <Pencil className="h-3 w-3" />
              <span className="sr-only">{t("admin.stock.editReorder")}</span>
            </PopoverTrigger>
            <PopoverContent align="start" className={cn(dashboardFont.variable, "w-auto gap-2 font-semibold")} style={dashboardFontStyle}>
              <Label className="text-xs font-semibold text-ink-soft">{t("admin.stock.reorderLabel")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  value={rpFor(r)}
                  onChange={(e) => setRpVals((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  className="h-9 w-20"
                  autoFocus
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => saveRP(r)}
                  disabled={rpBusy === r.id || rpFor(r).trim() === "" || Number(rpFor(r)) === r.reorderPoint}
                  className="h-9 font-semibold"
                >
                  {rpBusy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin.stock.save")}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ),
    },
    {
      key: "price",
      header: t("admin.stock.thPrice"),
      sort: (r) => r.price,
      className: "text-ink-soft",
      cell: (r) => formatMAD(r.price),
    },
    {
      key: "value",
      header: t("admin.stock.thValue"),
      sort: (r) => r.value,
      className: "font-semibold text-ink",
      cell: (r) => formatMAD(r.value),
    },
    {
      key: "status",
      header: t("admin.stock.thStatus"),
      cell: (r) => {
        const st = statusOf(r, t);
        return <Badge className={cn("text-xs", st.cls)}>{st.label}</Badge>;
      },
    },
    {
      key: "actions",
      header: t("admin.stock.thActions"),
      headClassName: "text-end",
      className: "text-end",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openAdjust(r)}
            className="gap-1.5 font-semibold text-ink-soft hover:bg-brand-50 hover:text-brand-600"
          >
            <PackagePlus className="h-4 w-4" />
            {t("admin.stock.adjust")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openHistory(r)}
            className="gap-1.5 font-semibold text-ink-soft hover:bg-slate-100 hover:text-ink"
          >
            <History className="h-4 w-4" />
            {t("admin.stock.history")}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <KpiCard key={k.label} icon={k.icon} tone={k.tone} label={k.label} value={k.value} />
        ))}
      </div>

      {/* Filter chips — same pattern as the Customers page */}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((tb) => (
          <Button
            key={tb.key}
            type="button"
            size="sm"
            variant={tab === tb.key ? "primary" : "outline"}
            onClick={() => setTab(tb.key)}
            className="font-semibold"
          >
            {tb.label}
            <span className={cn("ms-1", tab === tb.key ? "text-white/80" : "text-ink-soft")}>{tb.count}</span>
          </Button>
        ))}
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        search={(r) => r.name}
        searchPlaceholder={t("admin.stock.searchPlaceholder")}
        rowClassName={(r) =>
          r.stock <= 0 && !r.allowBackorder
            ? "bg-rose-50/40"
            : r.stock <= r.reorderPoint && !r.allowBackorder
              ? "bg-amber-50/40"
              : undefined
        }
        defaultSortKey="name"
        defaultSortDir="asc"
        emptyText={t("admin.stock.empty")}
        minWidth="min-w-[1120px]"
      />

      {/* Adjust stock dialog */}
      <Dialog open={!!adjustRow} onOpenChange={(o) => { if (!o) setAdjustRow(null); }}>
        <DialogContent className={cn(dashboardFont.variable, "font-semibold sm:max-w-md")} style={dashboardFontStyle}>
          {dlgRow && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display font-bold text-ink">{t("admin.stock.adjustTitle")}</DialogTitle>
                <p className="text-sm text-ink-soft" dir="auto">{dlgRow.name}</p>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-semibold text-ink-soft">{t("admin.stock.current")}</span>
                  <span className="font-bold tabular-nums text-ink">{dlgRow.stock}</span>
                </div>
                <div>
                  <Label className="mb-1 text-xs font-semibold text-ink-soft">{t("admin.stock.reasonLabel")}</Label>
                  <Select value={reason} onValueChange={(v) => setReason(String(v) as StockReason)}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue>{(value) => reasonLabel(String(value))}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className={cn(dashboardFont.variable, "font-semibold")} style={dashboardFontStyle}>
                      {REASONS.map((rs) => (
                        <SelectItem key={rs} value={rs}>{reasonLabel(rs)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 text-xs font-semibold text-ink-soft">
                    {reason === "correction" ? t("admin.stock.newTotal") : t("admin.stock.qty")}
                  </Label>
                  <Input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" className="h-10" autoFocus />
                </div>
                <div>
                  <Label className="mb-1 text-xs font-semibold text-ink-soft">{t("admin.stock.noteOptional")}</Label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} className="h-10" />
                </div>
                {qty.trim() !== "" && previewAfter !== null && (
                  <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-sm">
                    <span className="font-semibold text-brand-700">{t("admin.stock.newTotal")}</span>
                    <span className="font-bold tabular-nums text-brand-700">{previewAfter}</span>
                  </div>
                )}
                {err && <p className="text-sm font-semibold text-rose-600">{err}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAdjustRow(null)} className="font-semibold">{t("admin.stock.cancel")}</Button>
                <Button onClick={submitAdjust} disabled={saving || qty.trim() === ""} className="font-semibold">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin.stock.apply")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* History sheet */}
      <Sheet open={!!historyId} onOpenChange={(o) => { if (!o) setHistoryId(null); }}>
        <SheetContent
          className={cn(dashboardFont.variable, "w-full gap-0 overflow-y-auto p-0 font-semibold sm:max-w-md")}
          style={dashboardFontStyle}
        >
          <SheetHeader className="border-b border-slate-200 px-5 py-4">
            <SheetTitle className="font-display font-bold text-ink">{t("admin.stock.historyTitle")}</SheetTitle>
            <p className="text-sm text-ink-soft" dir="auto">{historyName}</p>
          </SheetHeader>
          <div className="p-5">
            {movements === null ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
              </div>
            ) : movements.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-soft">{t("admin.stock.noHistory")}</p>
            ) : (
              <div className="space-y-3">
                {movements.map((m) => (
                  <Card key={m.id} className="flex-row items-start gap-3 p-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        m.delta >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600",
                      )}
                    >
                      {m.delta >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink">{reasonLabel(m.reason)}</span>
                        <span className={cn("font-bold tabular-nums", m.delta >= 0 ? "text-emerald-600" : "text-rose-600")}>
                          {m.delta >= 0 ? `+${m.delta}` : m.delta}
                        </span>
                      </div>
                      <p className="text-xs text-ink-soft">
                        {m.before} → {m.after} · {formatDate(m.createdAt)}
                      </p>
                      {m.note && <p className="mt-0.5 text-xs text-ink" dir="auto">{m.note}</p>}
                      {m.actor && <p className="text-[11px] text-ink-soft">{t("admin.stock.by")} {m.actor}</p>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
