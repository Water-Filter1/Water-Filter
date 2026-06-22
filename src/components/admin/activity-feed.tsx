import { getT } from "@/i18n/server";
import { ShoppingBag, Star, UserCheck, UserCog, Activity, CheckCircle2, XCircle } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ActivityEntry } from "@/lib/data";

type Color = "brand" | "amber" | "emerald" | "rose" | "slate";
type View = { icon: typeof ShoppingBag; color: Color; text: string };

const TONE_LIGHT: Record<Color, string> = {
  brand: "bg-brand-50 text-brand-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
  slate: "bg-slate-100 text-slate-600",
};
const TONE_DARK: Record<Color, string> = {
  brand: "bg-brand-500/15 text-brand-300",
  amber: "bg-amber-500/15 text-amber-300",
  emerald: "bg-emerald-500/15 text-emerald-300",
  rose: "bg-rose-500/15 text-rose-300",
  slate: "bg-white/10 text-slate-300",
};

export async function ActivityFeed({ items, dark = false }: { items: ActivityEntry[]; dark?: boolean }) {
  const { t } = await getT();

  function view(e: ActivityEntry): View {
    const m = e.meta ?? {};
    const name = String(m.name ?? "");
    switch (e.action) {
      case "order.created":
        return { icon: ShoppingBag, color: "brand", text: t("activity.orderCreated", { id: e.entity ?? "", name }) };
      case "order.confirmed":
        return { icon: CheckCircle2, color: "emerald", text: t("activity.orderConfirmed", { id: e.entity ?? "" }) };
      case "order.cancelled":
        return { icon: XCircle, color: "rose", text: t("activity.orderCancelled", { id: e.entity ?? "" }) };
      case "review.created":
        return { icon: Star, color: "amber", text: t("activity.reviewCreated", { name }) };
      case "client.status":
        return {
          icon: UserCheck,
          color: "emerald",
          text: t("activity.clientStatus", {
            status: m.status === "active" ? t("activity.statusActive") : t("activity.statusInactive"),
          }),
        };
      case "client.updated":
        return { icon: UserCog, color: "slate", text: t("activity.clientUpdated") };
      default:
        return { icon: Activity, color: "slate", text: e.summary };
    }
  }

  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden rounded-2xl border p-0 shadow-sm ring-0",
        dark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white",
      )}
    >
      <CardHeader className={cn("flex flex-row items-center border-b px-5 py-4", dark ? "border-white/10" : "border-slate-200")}>
        <CardTitle className={cn("font-display font-bold", dark ? "text-white" : "text-ink")}>
          {t("admin.dash.activityTitle")}
        </CardTitle>
      </CardHeader>
      {items.length === 0 ? (
        <p className={cn("px-5 py-12 text-center text-sm", dark ? "text-slate-400" : "text-ink-soft")}>
          {t("admin.dash.activityEmpty")}
        </p>
      ) : (
        <div className="max-h-[22rem] overflow-y-auto">
          <Table>
            <TableBody>
              {items.map((e) => {
                const v = view(e);
                return (
                  <TableRow
                    key={e.id}
                    className={cn("border-0", dark ? "hover:bg-white/5" : "hover:bg-slate-50")}
                  >
                    <TableCell className="py-3">
                      <span className="flex items-center gap-3">
                        <Badge
                          className={cn(
                            "h-9 w-9 shrink-0 justify-center rounded-xl p-0",
                            (dark ? TONE_DARK : TONE_LIGHT)[v.color],
                          )}
                        >
                          <v.icon className="h-4 w-4" />
                        </Badge>
                        <span className={cn("min-w-0 flex-1 text-sm", dark ? "text-white" : "text-ink")} dir="auto">
                          {v.text}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn("py-3 text-end text-xs whitespace-nowrap", dark ? "text-slate-400" : "text-ink-soft")}
                    >
                      {formatDate(e.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
