import Link from "next/link";
import { getT } from "@/i18n/server";
import { CalendarClock, Wrench, RotateCw, Clock, ArrowUpRight } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { UpcomingJob } from "@/lib/data";

type Kind = UpcomingJob["type"];

const META: Record<Kind, { dot: string; chip: string; icon: typeof Wrench; labelKey: string }> = {
  install: { dot: "bg-brand-500", chip: "bg-brand-50 text-brand-700", icon: Wrench, labelKey: "agenda.typeInstall" },
  maintenance: { dot: "bg-violet-500", chip: "bg-violet-50 text-violet-700", icon: RotateCw, labelKey: "agenda.typeMaintenance" },
  maintenance_due: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700", icon: Clock, labelKey: "agenda.typeMaintenanceDue" },
};

/**
 * Dashboard agenda — a vertical timeline of the team's next jobs (installs to
 * schedule, scheduled installs/maintenance, and 6-month maintenance coming due).
 * Composed entirely from shadcn primitives (Card / Table / Badge / Avatar).
 */
export async function AgendaTimeline({ items }: { items: UpcomingJob[] }) {
  const { t } = await getT();

  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-sm ring-0">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <Badge className="h-8 w-8 justify-center rounded-lg bg-brand-50 p-0 text-brand-600">
            <CalendarClock className="h-4 w-4" />
          </Badge>
          <CardTitle className="font-display font-bold text-ink">{t("admin.dash.agendaTitle")}</CardTitle>
        </div>
        <Link
          href="/admin/orders?status=confirmed"
          className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          {t("admin.dash.seeAll")} <ArrowUpRight className="h-4 w-4" />
        </Link>
      </CardHeader>

      {items.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm font-semibold text-ink-soft">{t("admin.dash.agendaEmpty")}</p>
      ) : (
        <Table>
          <TableBody>
            {items.map((j) => {
              const m = META[j.type];
              const sub = [j.product, j.city].filter(Boolean).join(" · ");
              return (
                <TableRow key={j.id} className="border-0 hover:bg-slate-50">
                  {/* Timeline rail: a continuous line with a colored dot per job (decorative) */}
                  <TableCell className="relative w-10 py-3">
                    <span className="absolute start-1/2 top-0 h-full w-px -translate-x-1/2 bg-slate-200" aria-hidden />
                    <span className={cn("relative z-10 mx-auto block h-3 w-3 rounded-full ring-4 ring-white", m.dot)} aria-hidden />
                  </TableCell>

                  {/* Date + type, then customer · product · city */}
                  <TableCell className="py-3">
                    <span className="flex flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        {j.date ? (
                          <span className="text-sm font-bold text-ink">{formatDate(j.date)}</span>
                        ) : (
                          <Badge className="bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
                            {t("agenda.toSchedule")}
                          </Badge>
                        )}
                        <Badge className={cn("gap-1 px-2 py-0.5 text-xs font-semibold", m.chip)}>
                          <m.icon className="h-3 w-3" />
                          {t(m.labelKey)}
                        </Badge>
                      </span>
                      <span className="text-xs font-semibold text-ink-soft" dir="auto">
                        {j.customerName}
                        {sub ? ` · ${sub}` : ""}
                      </span>
                    </span>
                  </TableCell>

                  {/* Assigned technician */}
                  <TableCell className="py-3 pe-5 text-end">
                    {j.technicianName ? (
                      <span className="flex items-center justify-end gap-2">
                        <span className="hidden text-xs font-semibold text-ink sm:inline" dir="auto">
                          {j.technicianName}
                        </span>
                        <Avatar className="size-7">
                          <AvatarFallback className="bg-indigo-100 text-xs font-bold text-indigo-700">
                            {j.technicianName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </span>
                    ) : (
                      <Badge className="bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                        {t("agenda.unassigned")}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
