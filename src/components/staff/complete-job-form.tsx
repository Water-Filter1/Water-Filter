"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Receipt, MessageCircle } from "lucide-react";
import { completeInstallationAction } from "@/lib/order-actions";
import { waNumber } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CompleteJobForm({
  orderId,
  phone,
  customerName,
}: {
  orderId: string;
  phone: string;
  customerName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ invoiceUrl?: string; invoiceRef?: string } | null>(null);
  const { t } = useI18n();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError(t("tech.complete.errorNoPhoto"));
      return;
    }
    const fd = new FormData();
    fd.set("orderId", orderId);
    fd.set("photo", file);
    startTransition(async () => {
      const res = await completeInstallationAction(fd);
      if (res.ok) setDone({ invoiceUrl: res.invoiceUrl, invoiceRef: res.invoiceRef });
      else setError(res.error ?? t("tech.complete.errorGeneric"));
    });
  }

  // After completion: confirm + let the technician send the client's invoice on WhatsApp.
  if (done) {
    const waText = done.invoiceUrl
      ? t("tech.complete.invoiceMsg", { name: customerName, ref: done.invoiceRef ?? "", url: done.invoiceUrl })
      : "";
    return (
      <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
        <p className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-600">
          <Check className="h-4 w-4" /> {t("tech.complete.installed")}
        </p>
        {done.invoiceUrl ? (
          <>
            <a
              href={`https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(waText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "whatsapp", size: "sm", className: "w-full font-semibold" })}
            >
              <MessageCircle className="h-4 w-4" /> {t("tech.complete.sendInvoice")}
            </a>
            <a
              href={done.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm", className: "w-full font-semibold" })}
            >
              <Receipt className="h-4 w-4" /> {t("tech.complete.viewInvoice")}
            </a>
          </>
        ) : null}
        <Button onClick={() => router.refresh()} variant="dark" size="sm" className="w-full">
          {t("tech.complete.done")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 border-t border-slate-100 pt-3">
      <Label className="cursor-pointer justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm font-semibold text-ink-soft transition hover:border-brand-300 hover:text-brand-600">
        <Camera className="h-5 w-5" />
        {file ? t("tech.complete.changePhoto") : t("tech.complete.installationPhoto")}
        <Input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </Label>
      {file && <p className="mt-1 truncate text-xs font-semibold text-emerald-600">✓ {file.name}</p>}
      {error && <p className="mt-1 text-sm font-semibold text-rose-600">{error}</p>}
      <Button
        type="submit"
        disabled={pending}
        size="sm"
        className="mt-3 w-full gap-2 bg-emerald-500 hover:bg-emerald-600"
      >
        <Check className="h-4 w-4" /> {pending ? t("tech.complete.sending") : t("tech.complete.markInstalled")}
      </Button>
    </form>
  );
}
