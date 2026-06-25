"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Check, X, MessageSquare } from "lucide-react";
import { approveReviewAction, rejectReviewAction } from "@/lib/review-actions";
import { toast } from "sonner";
import { useI18n } from "@/i18n/i18n-context";
import { formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export type AdminReview = {
  id: string;
  name: string;
  rating: number;
  comment: string;
  status: string;
  createdAt: string;
  productName: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-600",
};

export function ReviewsManager({
  reviews,
  view = "list",
}: {
  reviews: AdminReview[];
  view?: "list" | "grid";
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  function act(id: string, fn: (id: string) => Promise<void>) {
    setBusy(id);
    startTransition(async () => {
      try {
        await fn(id);
        toast.success(t("admin.toast.saved"));
        router.refresh();
      } catch {
        toast.error(t("admin.toast.error"));
      } finally {
        setBusy(null);
      }
    });
  }

  const statusLabel = (s: string) =>
    s === "approved"
      ? t("admin.reviews.statusApproved")
      : s === "rejected"
        ? t("admin.reviews.statusRejected")
        : t("admin.reviews.statusPending");

  if (reviews.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center border border-dashed border-slate-300 bg-white py-20 text-center font-semibold">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
          <MessageSquare className="h-7 w-7" />
        </div>
        <p className="mt-4 text-ink-soft">{t("admin.reviews.empty")}</p>
      </Card>
    );
  }

  return (
    <div className={view === "grid" ? "grid items-start gap-4 lg:grid-cols-2" : "space-y-4"}>
      {reviews.map((r) => (
        <Card key={r.id} className="block gap-0 border border-slate-200 bg-white p-5 font-semibold shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={cn("h-4 w-4", r.rating >= n ? "fill-amber-400 text-amber-400" : "text-neutral-300")}
                    />
                  ))}
                </div>
                <Badge className={cn("text-xs", STATUS_STYLE[r.status] ?? STATUS_STYLE.pending)}>
                  {statusLabel(r.status)}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-ink-soft">
                {t("admin.reviews.onProduct")}{" "}
                <span className="font-semibold text-ink" dir="auto">{r.productName ?? "—"}</span>
              </p>
            </div>
            <span className="text-xs text-ink-soft">{formatDate(r.createdAt)}</span>
          </div>

          <p dir="auto" className="mt-3 text-sm leading-relaxed text-ink">“{r.comment}”</p>
          <p className="mt-2 text-sm font-semibold text-ink" dir="auto">{r.name}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {r.status !== "approved" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => act(r.id, approveReviewAction)}
                disabled={pending && busy === r.id}
                className="gap-1.5 bg-emerald-500 font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
              >
                <Check className="h-4 w-4" /> {t("admin.reviews.approve")}
              </Button>
            )}
            {r.status !== "rejected" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => act(r.id, rejectReviewAction)}
                disabled={pending && busy === r.id}
                className="gap-1.5 border-rose-200 bg-white font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
              >
                <X className="h-4 w-4" /> {t("admin.reviews.reject")}
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
