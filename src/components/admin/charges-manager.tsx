"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Banknote, TrendingUp, Wallet, Hourglass, Plus, Loader2, Trash2, Users } from "lucide-react";
import { useI18n } from "@/i18n/i18n-context";
import { formatMAD, formatDate, cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { createExpenseAction, deleteExpenseAction } from "@/lib/admin-actions";
import type { ExpenseRow, FinancePnL } from "@/lib/data";
import { KpiCard } from "@/components/admin/kpi-card";
import { DataTable, type Column } from "@/components/admin/data-table";

const CATEGORIES = ["stock", "ads", "rent", "salary", "delivery", "other"];

/** One row of the Profit & Loss statement. Negative values render as "− X". */
function MoneyRow({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant?: "indent" | "subtotal" | "total";
}) {
  const isTotal = variant === "total";
  const isSub = variant === "subtotal";
  return (
    <TableRow className={cn(isTotal && "border-t-2 border-border", (isSub || isTotal) && "bg-muted/50")}>
      <TableCell
        className={cn(
          variant === "indent" ? "ps-6 text-ink-soft" : "font-semibold text-ink",
          (isSub || isTotal) && "font-bold text-ink",
        )}
      >
        {label}
      </TableCell>
      <TableCell
        className={cn(
          "text-end tabular-nums",
          isTotal
            ? value < 0
              ? "font-bold text-rose-600"
              : "font-bold text-emerald-600"
            : value < 0
              ? "font-semibold text-rose-600"
              : "font-semibold text-ink",
        )}
      >
        {value < 0 ? `− ${formatMAD(Math.abs(value))}` : formatMAD(value)}
      </TableCell>
    </TableRow>
  );
}

function SectionRow({ label }: { label: string }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={2} className="pt-4 text-xs font-bold uppercase tracking-wide text-ink-soft">
        {label}
      </TableCell>
    </TableRow>
  );
}

export function ChargesManager({ pnl, expenses }: { pnl: FinancePnL; expenses: ExpenseRow[] }) {
  const { t } = useI18n();
  const router = useRouter();

  const [period, setPeriod] = useState<"month" | "year">("month");
  const p = period === "year" ? pnl.year : pnl.month;
  const periodLabel = period === "year" ? t("admin.charges.periodYear") : t("admin.charges.periodMonth");

  const [form, setForm] = useState({ label: "", amount: "", category: "stock", date: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delId, setDelId] = useState<string | null>(null);

  const catLabel = (c: string) => t(`admin.charges.cat.${c}`);

  async function add() {
    setError(null);
    const amount = Number(form.amount);
    if (form.label.trim().length < 2 || !Number.isFinite(amount) || amount <= 0) {
      setError(t("admin.charges.error"));
      return;
    }
    setBusy(true);
    const res = await createExpenseAction({
      label: form.label,
      amount,
      category: form.category,
      note: form.note || undefined,
      date: form.date || undefined,
    });
    setBusy(false);
    if (res.ok) {
      setForm({ label: "", amount: "", category: "stock", date: "", note: "" });
      toast.success(t("admin.toast.created"));
      router.refresh();
    } else {
      toast.error(t("admin.toast.error"));
      setError(t("admin.charges.error"));
    }
  }

  async function remove(id: string) {
    setDelId(id);
    const res = await deleteExpenseAction(id);
    if (res && res.ok === false) {
      toast.error(t("admin.toast.error"));
    } else {
      toast.success(t("admin.toast.deleted"));
    }
    router.refresh();
    setDelId(null);
  }

  const kpis = [
    { icon: Banknote, tone: "bg-emerald-50 text-emerald-600", label: t("admin.charges.revenueRealized"), value: formatMAD(p.revenue) },
    { icon: TrendingUp, tone: "bg-brand-50 text-brand-600", label: t("admin.charges.grossProfit"), value: formatMAD(p.grossProfit), neg: p.grossProfit < 0 },
    { icon: Wallet, tone: p.netProfit < 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600", label: t("admin.charges.netProfit"), value: formatMAD(p.netProfit), neg: p.netProfit < 0 },
    { icon: Hourglass, tone: "bg-amber-50 text-amber-600", label: t("admin.charges.pipeline"), value: formatMAD(pnl.pipeline) },
  ];

  const columns: Column<ExpenseRow>[] = [
    {
      key: "label",
      header: t("admin.charges.thLabel"),
      sort: (e) => e.label,
      className: "font-semibold text-ink",
      cell: (e) => <span dir="auto">{e.label}</span>,
    },
    {
      key: "category",
      header: t("admin.charges.thCategory"),
      sort: (e) => e.category,
      cell: (e) => <Badge className="bg-muted text-ink-soft">{catLabel(e.category)}</Badge>,
    },
    {
      key: "amount",
      header: t("admin.charges.thAmount"),
      sort: (e) => e.amount,
      className: "font-semibold text-ink",
      cell: (e) => formatMAD(e.amount),
    },
    {
      key: "date",
      header: t("admin.charges.thDate"),
      sort: (e) => new Date(e.date).getTime(),
      className: "text-ink-soft",
      cell: (e) => formatDate(e.date),
    },
    {
      key: "actions",
      header: "",
      headClassName: "text-end",
      className: "text-end",
      cell: (e) => (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => remove(e.id)}
          disabled={delId === e.id}
          className="text-ink-soft hover:bg-rose-50 hover:text-rose-600"
        >
          {delId === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          <span className="sr-only">{t("admin.charges.delete")}</span>
        </Button>
      ),
    },
  ];

  const maxCat = Math.max(...pnl.byCategoryMonth.map((c) => c.amount), 1);
  const inputCls = "h-10";

  return (
    <div className="space-y-6">
      {/* Period toggle */}
      <div className="flex flex-wrap gap-1.5">
        {(["month", "year"] as const).map((k) => (
          <Button
            key={k}
            type="button"
            size="sm"
            variant={period === k ? "primary" : "outline"}
            onClick={() => setPeriod(k)}
            className="font-semibold"
          >
            {k === "year" ? t("admin.charges.periodYear") : t("admin.charges.periodMonth")}
          </Button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard
            key={k.label}
            icon={k.icon}
            tone={k.tone}
            label={k.label}
            value={k.value}
            valueClassName={k.neg ? "text-rose-600" : undefined}
          />
        ))}
      </div>

      {/* P&L statement + commission/confirmateur */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <h2 className="mb-3 font-display font-bold text-ink">
            {t("admin.charges.pnlTitle")} · {periodLabel}
          </h2>
          <Table>
            <TableBody>
              <MoneyRow label={t("admin.charges.revenueRealized")} value={p.revenue} />
              <SectionRow label={t("admin.charges.cogs")} />
              <MoneyRow label={t("admin.charges.filterCost")} value={-p.cogs} variant="indent" />
              <MoneyRow label={t("admin.charges.techCommission")} value={-p.techCommission} variant="indent" />
              <MoneyRow label={t("admin.charges.grossProfit")} value={p.grossProfit} variant="subtotal" />
              <SectionRow label={t("admin.charges.opexLine")} />
              <MoneyRow label={t("admin.charges.opexOther")} value={-p.opex} variant="indent" />
              <MoneyRow label={t("admin.charges.netProfit")} value={p.netProfit} variant="total" />
            </TableBody>
          </Table>
        </Card>

        <div className="space-y-6">
          {/* Technician commissions (this month) */}
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display font-bold text-ink">
              <Users className="h-4 w-4 text-ink-soft" />
              {t("admin.charges.commissionTitle")} · {t("admin.charges.periodMonth")}
            </h2>
            {pnl.commissionsMonth.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-soft">{t("admin.charges.noCommission")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="text-xs uppercase tracking-wide text-ink-soft">
                    <TableHead>{t("admin.charges.thTech")}</TableHead>
                    <TableHead className="text-center">{t("admin.charges.thInstalls")}</TableHead>
                    <TableHead className="text-end">{t("admin.charges.thCommission")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pnl.commissionsMonth.map((c) => (
                    <TableRow key={c.name}>
                      <TableCell className="font-semibold text-ink" dir="auto">{c.name}</TableCell>
                      <TableCell className="text-center font-semibold tabular-nums text-ink-soft">{c.installs}</TableCell>
                      <TableCell className="text-end font-semibold tabular-nums text-ink">{formatMAD(c.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      </div>

      {/* Expense management */}
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 font-display font-bold text-ink">{t("admin.charges.addTitle")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="mb-1 text-xs font-semibold text-ink-soft">{t("admin.charges.label")}</Label>
                <Input className={inputCls} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={t("admin.charges.labelPlaceholder")} />
              </div>
              <div>
                <Label className="mb-1 text-xs font-semibold text-ink-soft">{t("admin.charges.amount")}</Label>
                <Input className={inputCls} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
              </div>
              <div>
                <Label className="mb-1 text-xs font-semibold text-ink-soft">{t("admin.charges.category")}</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: String(v) })}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue>{(value) => catLabel(String(value))}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{catLabel(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 text-xs font-semibold text-ink-soft">{t("admin.charges.date")}</Label>
                <Input className={inputCls} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1 text-xs font-semibold text-ink-soft">{t("admin.charges.note")}</Label>
                <Input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
            </div>
            {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
            <Button onClick={add} disabled={busy} className="mt-3 font-semibold">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {busy ? t("admin.charges.adding") : t("admin.charges.add")}
            </Button>
          </Card>

          <div className="space-y-3">
            <h2 className="font-display font-bold text-ink">{t("admin.charges.recent")}</h2>
            <DataTable
              rows={expenses}
              columns={columns}
              getRowId={(e) => e.id}
              search={(e) => `${e.label} ${catLabel(e.category)}`}
              defaultSortKey="date"
              defaultSortDir="desc"
              emptyText={t("admin.charges.empty")}
            />
          </div>
        </div>

        {/* By category */}
        <Card className="h-fit p-5">
          <h2 className="mb-4 font-display font-bold text-ink">{t("admin.charges.byCategory")}</h2>
          {pnl.byCategoryMonth.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-soft">{t("admin.charges.empty")}</p>
          ) : (
            <div className="space-y-3">
              {pnl.byCategoryMonth.map((c) => (
                <div key={c.category}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-ink">{catLabel(c.category)}</span>
                    <span className="font-semibold text-ink">{formatMAD(c.amount)}</span>
                  </div>
                  <Progress
                    value={Math.max(6, Math.round((c.amount / maxCat) * 100))}
                    className="h-2 [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-muted [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-brand-500 [&_[data-slot=progress-indicator]]:to-aqua-400"
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
