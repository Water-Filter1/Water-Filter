import { getT } from "@/i18n/server";
import { ShoppingBag, Star, UserCheck, UserCog, Activity } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { ActivityEntry } from "@/lib/data";

type View = { icon: typeof ShoppingBag; tone: string; text: string };

export async function ActivityFeed({ items }: { items: ActivityEntry[] }) {
  const { t } = await getT();

  function view(e: ActivityEntry): View {
    const m = e.meta ?? {};
    const name = String(m.name ?? "");
    switch (e.action) {
      case "order.created":
        return {
          icon: ShoppingBag,
          tone: "bg-brand-50 text-brand-600",
          text: t("activity.orderCreated", { id: e.entity ?? "", name }),
        };
      case "review.created":
        return {
          icon: Star,
          tone: "bg-amber-50 text-amber-600",
          text: t("activity.reviewCreated", { name }),
        };
      case "client.status":
        return {
          icon: UserCheck,
          tone: "bg-emerald-50 text-emerald-600",
          text: t("activity.clientStatus", {
            status: m.status === "active" ? t("activity.statusActive") : t("activity.statusInactive"),
          }),
        };
      case "client.updated":
        return { icon: UserCog, tone: "bg-slate-100 text-slate-600", text: t("activity.clientUpdated") };
      default:
        return { icon: Activity, tone: "bg-slate-100 text-slate-600", text: e.summary };
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-display font-bold text-ink">{t("admin.dash.activityTitle")}</h2>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-ink-soft">{t("admin.dash.activityEmpty")}</p>
      ) : (
        <ul className="max-h-[22rem] divide-y divide-slate-100 overflow-y-auto">
          {items.map((e) => {
            const v = view(e);
            return (
              <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${v.tone}`}>
                  <v.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink" dir="auto">
                  {v.text}
                </span>
                <span className="shrink-0 text-xs text-ink-soft">{formatDate(e.createdAt)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
