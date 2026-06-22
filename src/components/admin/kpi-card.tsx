import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiSparkline } from "@/components/admin/kpi-sparkline";

export type KpiCardProps = {
  icon: ComponentType<{ className?: string }>;
  tone: string;
  label: string;
  value: string;
  /** Small grey text shown top-right when there's no trend. */
  hint?: string;
  /** Colored blur accent (e.g. "bg-brand-400"). */
  glow?: string;
  /** Month-over-month %; renders a green/red chip. null = hide, undefined = use hint. */
  trend?: number | null;
  /** When set, the card is a link. */
  href?: string;
  /** Override the value color (e.g. negative profit). */
  valueClassName?: string;
  /** Daily values for a bottom trend sparkline (Stripe/Vercel style). */
  spark?: number[];
  /** Sparkline stroke/fill color (CSS color or var). */
  sparkColor?: string;
};

/** Shared admin KPI card — built on the shadcn <Card> + <Badge>. */
export function KpiCard({
  icon: Icon,
  tone,
  label,
  value,
  hint,
  glow,
  trend,
  href,
  valueClassName,
  spark,
  sparkColor,
}: KpiCardProps) {
  const card = (
    <Card
      className={cn(
        "group relative gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-0 transition-all",
        href && "hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[var(--shadow-soft)]",
      )}
    >
      {glow && (
        <span
          className={cn(
            "pointer-events-none absolute -end-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-30",
            glow,
          )}
        />
      )}
      <div className="relative flex items-center justify-between">
        <Badge className={cn("h-11 w-11 justify-center rounded-xl p-0", tone)}>
          <Icon className="h-5 w-5" />
        </Badge>
        {trend !== undefined ? (
          trend === null ? null : (
            <Badge
              className={cn(
                "gap-0.5 px-2 py-0.5 text-xs font-bold",
                trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600",
              )}
            >
              {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(trend)}%
            </Badge>
          )
        ) : (
          hint && <span className="text-xs text-ink-soft">{hint}</span>
        )}
      </div>
      <p className={cn("relative mt-4 font-display text-2xl font-extrabold tracking-tight text-ink", valueClassName)}>
        {value}
      </p>
      <p className="relative text-sm text-ink-soft">{label}</p>
      {spark && spark.length > 1 && (
        <div className="relative -mx-5 -mb-5 mt-3">
          <KpiSparkline data={spark} color={sparkColor} />
        </div>
      )}
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}
