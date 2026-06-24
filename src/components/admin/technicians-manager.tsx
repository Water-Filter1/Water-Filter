"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { useI18n } from "@/i18n/i18n-context";
import { formatMAD } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/admin/data-table";
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

function RateCell({ r }: { r: TechRow }) {
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
    <div className="flex items-center gap-1.5">
      <Input type="number" value={val} onChange={(e) => setVal(e.target.value)} className="h-8 w-24" />
      <Button
        variant="primary"
        size="sm"
        onClick={save}
        disabled={busy || Number(val) === r.rate}
        className="h-8 gap-1 px-2.5 text-xs font-semibold"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : done ? <Check className="h-3.5 w-3.5" /> : t("admin.techPage.save")}
      </Button>
    </div>
  );
}

export function TechniciansManager({ rows }: { rows: TechRow[] }) {
  const { t } = useI18n();

  const columns: Column<TechRow>[] = [
    {
      key: "name",
      header: t("admin.techPage.thName"),
      sort: (r) => r.name,
      cell: (r) => (
        <span className="font-semibold text-ink" dir="auto">{r.name}</span>
      ),
    },
    {
      key: "city",
      header: t("admin.techPage.thCity"),
      sort: (r) => r.city || "",
      cell: (r) => (
        <span className="text-ink-soft" dir="auto">{r.city || "—"}</span>
      ),
    },
    {
      key: "installs",
      header: t("admin.techPage.thInstalls"),
      sort: (r) => r.installs,
      cell: (r) => <span className="text-ink">{r.installs}</span>,
    },
    {
      key: "sav",
      header: t("admin.techPage.thSav"),
      sort: (r) => r.sav,
      cell: (r) => <span className="text-ink">{r.sav}</span>,
    },
    {
      key: "revenue",
      header: t("admin.techPage.thRevenue"),
      sort: (r) => r.revenue,
      cell: (r) => <span className="font-semibold text-ink">{formatMAD(r.revenue)}</span>,
    },
    {
      key: "rate",
      header: t("admin.techPage.thRate"),
      sort: (r) => r.rate,
      cell: (r) => <RateCell r={r} />,
    },
    {
      key: "commission",
      header: t("admin.techPage.thCommission"),
      sort: (r) => r.commission,
      cell: (r) => <span className="font-semibold text-ink">{formatMAD(r.commission)}</span>,
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      search={(r) => `${r.name} ${r.city ?? ""}`}
      searchPlaceholder={t("admin.techPage.thName")}
      csv={{
        filename: "technicians.csv",
        row: (r) => ({
          Name: r.name,
          City: r.city ?? "",
          Installs: r.installs,
          SAV: r.sav,
          Revenue: r.revenue,
          Rate: r.rate,
          Commission: r.commission,
        }),
      }}
      defaultSortKey="installs"
      defaultSortDir="desc"
      emptyText={t("admin.techPage.empty")}
      minWidth="min-w-[820px]"
    />
  );
}
