"use client";

import { useState } from "react";
import { Wrench } from "lucide-react";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlombierJobCard } from "@/components/staff/plombier-job-card";
import { CompletedJobCard } from "@/components/staff/completed-job-card";
import type { Order } from "@/lib/types";

/** Technician jobs split into Active (with actions) and Completed (history), big-player style. */
export function TechJobsTabs({ active, completed }: { active: Order[]; completed: Order[] }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"active" | "done">("active");

  const tabs = [
    { key: "active" as const, label: t("tech.tabActive"), count: active.length },
    { key: "done" as const, label: t("tech.tabDone"), count: completed.length },
  ];
  const list = tab === "done" ? completed : active;

  return (
    <div className="space-y-5">
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

      {list.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed border-slate-300 py-20 text-center font-semibold">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
            <Wrench className="h-7 w-7" />
          </div>
          <p className="mt-4 font-display text-lg font-semibold text-ink">
            {tab === "done" ? t("tech.doneEmpty") : t("tech.empty.title")}
          </p>
          {tab === "active" && (
            <p className="mt-1 text-sm font-semibold text-ink-soft">{t("tech.empty.subtitle")}</p>
          )}
        </Card>
      ) : (
        <div className="grid items-start gap-5 font-semibold lg:grid-cols-2">
          {tab === "done"
            ? completed.map((o) => <CompletedJobCard key={o.id} order={o} />)
            : active.map((o) => <PlombierJobCard key={o.id} order={o} />)}
        </div>
      )}
    </div>
  );
}
