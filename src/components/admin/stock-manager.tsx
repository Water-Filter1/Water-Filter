"use client";

import { useState, useMemo } from "react";
import { Boxes, Wallet, AlertTriangle, PackageX, Loader2, Check } from "lucide-react";
import { useI18n } from "@/i18n/i18n-context";
import { formatMAD, cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { setProductStockAction } from "@/lib/admin-actions";
import { useRouter } from "next/navigation";
import type { StockRow, StockSummary } from "@/lib/data";
import { KpiCard } from "@/components/admin/kpi-card";
import { SearchInput } from "@/components/admin/search-input";

function statusOf(r: StockRow, t: (k: string) => string) {
  if (r.stock <= 0 && r.allowBackorder)
    return { label: t("admin.stock.statusBackorder"), cls: "bg-indigo-50 text-indigo-600" };
  if (r.stock <= 0) return { label: t("admin.stock.statusOut"), cls: "bg-rose-50 text-rose-600" };
  if (r.stock <= 5) return { label: t("admin.stock.statusLow"), cls: "bg-amber-50 text-amber-700" };
  return { label: t("admin.stock.statusOk"), cls: "bg-emerald-50 text-emerald-700" };
}

function StockRowItem({ r }: { r: StockRow }) {
  const { t } = useI18n();
  const router = useRouter();
  const [val, setVal] = useState(String(r.stock));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const st = statusOf(r, t);

  async function save() {
    const n = Number(val);
    if (!Number.isFinite(n) || n === r.stock) return;
    setBusy(true);
    const res = await setProductStockAction(r.id, n);
    setBusy(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
      setTimeout(() => setDone(false), 1500);
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium text-ink" dir="auto">{r.name}</TableCell>
      <TableCell className="text-ink-soft">{t(`cat.${r.categorySlug}.name`)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="h-8 w-20"
          />
          <button
            onClick={save}
            disabled={busy || Number(val) === r.stock}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-600 px-2.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : done ? <Check className="h-3.5 w-3.5" /> : t("admin.stock.save")}
          </button>
        </div>
      </TableCell>
      <TableCell className="text-ink-soft">{formatMAD(r.price)}</TableCell>
      <TableCell className="font-semibold text-ink">{formatMAD(r.value)}</TableCell>
      <TableCell>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", st.cls)}>{st.label}</span>
      </TableCell>
    </TableRow>
  );
}

export function StockManager({ rows, summary }: { rows: StockRow[]; summary: StockSummary }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => r.name.toLowerCase().includes(s)) : rows;
  }, [rows, q]);

  const kpis = [
    { icon: Boxes, tone: "bg-brand-50 text-brand-600", label: t("admin.stock.kpiUnits"), value: String(summary.totalUnits) },
    { icon: Wallet, tone: "bg-emerald-50 text-emerald-600", label: t("admin.stock.kpiValue"), value: formatMAD(summary.totalValue) },
    { icon: AlertTriangle, tone: "bg-amber-50 text-amber-600", label: t("admin.stock.kpiLow"), value: String(summary.lowCount) },
    { icon: PackageX, tone: "bg-rose-50 text-rose-600", label: t("admin.stock.kpiOut"), value: String(summary.outCount) },
    { icon: Boxes, tone: "bg-sky-50 text-sky-600", label: t("admin.stock.kpiSku"), value: String(summary.skuCount) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <KpiCard key={k.label} icon={k.icon} tone={k.tone} label={k.label} value={k.value} />
        ))}
      </div>

      <SearchInput
        value={q}
        onChange={setQ}
        placeholder={t("admin.stock.searchPlaceholder")}
        className="w-full sm:w-80"
      />

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.stock.thProduct")}</TableHead>
                <TableHead>{t("admin.stock.thCategory")}</TableHead>
                <TableHead>{t("admin.stock.thStock")}</TableHead>
                <TableHead>{t("admin.stock.thPrice")}</TableHead>
                <TableHead>{t("admin.stock.thValue")}</TableHead>
                <TableHead>{t("admin.stock.thStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-ink-soft">
                    {t("admin.stock.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => <StockRowItem key={r.id} r={r} />)
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
