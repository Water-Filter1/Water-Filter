"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, HardHat } from "lucide-react";
import { useI18n } from "@/i18n/i18n-context";
import { formatMAD } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { setTechnicianCommissionAction } from "@/lib/admin-actions";

export type TechRow = {
  id: string;
  name: string;
  city: string | null;
  installs: number;
  sav: number;
  revenue: number;
  rate: number;
  commission: number;
};

function Row({ r }: { r: TechRow }) {
  const { t } = useI18n();
  const router = useRouter();
  const [val, setVal] = useState(String(r.rate));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function save() {
    const n = Number(val);
    if (!Number.isFinite(n) || n === r.rate) return;
    setBusy(true);
    const res = await setTechnicianCommissionAction(r.id, n);
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
      <TableCell className="text-ink-soft" dir="auto">{r.city || "—"}</TableCell>
      <TableCell className="text-ink">{r.installs}</TableCell>
      <TableCell className="text-ink">{r.sav}</TableCell>
      <TableCell className="font-semibold text-ink">{formatMAD(r.revenue)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Input type="number" value={val} onChange={(e) => setVal(e.target.value)} className="h-8 w-24" />
          <button
            onClick={save}
            disabled={busy || Number(val) === r.rate}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-600 px-2.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : done ? <Check className="h-3.5 w-3.5" /> : t("admin.techPage.save")}
          </button>
        </div>
      </TableCell>
      <TableCell className="font-semibold text-ink">{formatMAD(r.commission)}</TableCell>
    </TableRow>
  );
}

export function TechniciansManager({ rows }: { rows: TechRow[] }) {
  const { t } = useI18n();

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
          <HardHat className="h-7 w-7" />
        </div>
        <p className="mt-4 text-ink-soft">{t("admin.techPage.empty")}</p>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.techPage.thName")}</TableHead>
              <TableHead>{t("admin.techPage.thCity")}</TableHead>
              <TableHead>{t("admin.techPage.thInstalls")}</TableHead>
              <TableHead>{t("admin.techPage.thSav")}</TableHead>
              <TableHead>{t("admin.techPage.thRevenue")}</TableHead>
              <TableHead>{t("admin.techPage.thRate")}</TableHead>
              <TableHead>{t("admin.techPage.thCommission")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <Row key={r.id} r={r} />
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
