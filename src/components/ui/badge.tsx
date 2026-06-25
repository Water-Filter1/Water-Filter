import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
  {
    variants: {
      tone: {
        sale: "bg-rose-50 text-rose-600",
        best: "bg-amber-50 text-amber-700",
        new: "bg-brand-50 text-brand-700",
        neutral: "bg-neutral-100 text-neutral-600",
        success: "bg-emerald-50 text-emerald-700",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

type Tone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

/** Map a French badge label to a visual tone. */
export function toneForBadge(label: string): Tone {
  const l = label.toLowerCase();
  if (l.includes("promo")) return "sale";
  if (l.includes("best")) return "best";
  if (l.includes("nouveau")) return "new";
  return "neutral";
}

export function Badge({
  children,
  tone,
  className,
  ...props
}: React.ComponentProps<"span"> & {
  tone?: Tone;
}) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {children}
    </span>
  );
}
