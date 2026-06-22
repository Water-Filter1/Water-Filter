"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Wallet, TrendingUp, CalendarRange, Plus, Loader2, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/i18n-context";
import { formatMAD, formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { createExpenseAction, deleteExpenseAction } from "@/lib/admin-actions";
import type { ExpenseRow, FinanceSummary } from "@/lib/data";
import { KpiCard } from "@/components/admin/kpi-card";

const CATEGORIES = ["stock", "ads", "rent", "salary", "delivery", "other"];

export function ChargesManager({
  summary,
  expenses,
}: {
  summary: FinanceSummary;
  expenses: ExpenseRow[];
}) {
  const { t } = useI18n();
  const router = useRouter();
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
      router.refresh();
    } else {
      setError(t("admin.charges.error"));
    }
  }

  async function remove(id: string) {
    setDelId(id);
    await deleteExpenseAction(id);
    router.refresh();
    setDelId(null);
  }

  const kpis = [
    { icon: Banknote, tone: "bg-emerald-50 text-emerald-600", label: t("admin.charges.kpiRevenue"), value: formatMAD(summary.revenueMonth) },
    { icon: Wallet, tone: "bg-rose-50 text-rose-600", label: t("admin.charges.kpiExpenses"), value: formatMAD(summary.expensesMonth) },
    { icon: TrendingUp, tone: "bg-brand-50 text-brand-600", label: t("admin.charges.kpiProfit"), value: formatMAD(summary.profitMonth), neg: summary.profitMonth < 0 },
    { icon: CalendarRange, tone: "bg-indigo-50 text-indigo-600", label: t("admin.charges.kpiProfitYear"), value: formatMAD(summary.profitYear), neg: summary.profitYear < 0 },
  ];

  const maxCat = Math.max(...summary.byCategory.map((c) => c.amount), 1);
  const inputCls = "h-10";

  return (
    <div className="space-y-6">
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

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        {/* Add + recent expenses */}
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 font-display font-bold text-ink">{t("admin.charges.addTitle")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-ink-soft">{t("admin.charges.label")}</label>
                <Input className={inputCls} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={t("admin.charges.labelPlaceholder")} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-soft">{t("admin.charges.amount")}</label>
                <Input className={inputCls} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-soft">{t("admin.charges.category")}</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{catLabel(c)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-soft">{t("admin.charges.date")}</label>
                <Input className={inputCls} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-soft">{t("admin.charges.note")}</label>
                <Input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
            </div>
            {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
            <button
              onClick={add}
              disabled={busy}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {busy ? t("admin.charges.adding") : t("admin.charges.add")}
            </button>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-display font-bold text-ink">{t("admin.charges.recent")}</h2>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.charges.thLabel")}</TableHead>
                    <TableHead>{t("admin.charges.thCategory")}</TableHead>
                    <TableHead>{t("admin.charges.thAmount")}</TableHead>
                    <TableHead>{t("admin.charges.thDate")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-ink-soft">
                        {t("admin.charges.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium text-ink" dir="auto">{e.label}</TableCell>
                        <TableCell>
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-ink-soft">{catLabel(e.category)}</span>
                        </TableCell>
                        <TableCell className="font-semibold text-ink">{formatMAD(e.amount)}</TableCell>
                        <TableCell className="text-ink-soft">{formatDate(e.date)}</TableCell>
                        <TableCell className="text-end">
                          <button
                            onClick={() => remove(e.id)}
                            disabled={delId === e.id}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                          >
                            {delId === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* By category */}
        <Card className="h-fit p-5">
          <h2 className="mb-4 font-display font-bold text-ink">{t("admin.charges.byCategory")}</h2>
          {summary.byCategory.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-soft">{t("admin.charges.empty")}</p>
          ) : (
            <ul className="space-y-3">
              {summary.byCategory.map((c) => (
                <li key={c.category}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-ink">{catLabel(c.category)}</span>
                    <span className="font-semibold text-ink">{formatMAD(c.amount)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-aqua-400" style={{ width: `${Math.max(6, Math.round((c.amount / maxCat) * 100))}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
