"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, PhoneCall, X } from "lucide-react";
import { createPhoneOrderAction } from "@/lib/order-actions";
import { formatMAD } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PickItem = { id: string; name: string; price: number };

export function PhoneOrderForm({ products }: { products: PickItem[] }) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ customerName: "", phone: "", city: "", address: "", note: "" });
  const [rows, setRows] = useState<{ productId: string; qty: number }[]>([
    { productId: products[0]?.id ?? "", qty: 1 },
  ]);

  const byId = new Map(products.map((p) => [p.id, p]));
  const subtotal = rows.reduce((s, r) => s + (byId.get(r.productId)?.price ?? 0) * r.qty, 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    const items = rows.filter((r) => r.productId).map((r) => ({ productId: r.productId, qty: r.qty }));
    if (items.length === 0) {
      setError(t("conf.phone.errorNoProduct"));
      return;
    }
    startTransition(async () => {
      const res = await createPhoneOrderAction({ ...form, items });
      if (res.ok) {
        setOkMsg(t("conf.phone.orderCreated", { id: res.id ?? "" }));
        setForm({ customerName: "", phone: "", city: "", address: "", note: "" });
        setRows([{ productId: products[0]?.id ?? "", qty: 1 }]);
        router.refresh();
      } else {
        setError(res.error ?? t("conf.phone.errorGeneric"));
      }
    });
  }

  const input = "h-11 w-full rounded-xl px-3 text-sm";

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="font-semibold">
        <PhoneCall className="h-4 w-4" /> {t("conf.phone.addOrderButton")}
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="font-semibold">
      <Card className="gap-0 border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display font-bold text-ink">
            <PhoneCall className="h-5 w-5 text-brand-500" /> {t("conf.phone.title")}
          </h2>
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} className="text-ink-soft hover:text-ink">
            <X className="h-5 w-5" />
            <span className="sr-only">{t("conf.phone.title")}</span>
          </Button>
        </div>

        {error && <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}
        {okMsg && <div className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{okMsg}</div>}

        <div className="grid gap-3 sm:grid-cols-2">
          <Input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className={input} placeholder={t("conf.phone.customerNamePlaceholder")} />
          <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} placeholder={t("conf.phone.phonePlaceholder")} inputMode="tel" />
          <Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={input} placeholder={t("conf.phone.cityPlaceholder")} />
          <Input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={input} placeholder={t("conf.phone.addressPlaceholder")} />
        </div>
        <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={`${input} mt-3`} placeholder={t("conf.phone.notePlaceholder")} />

        {/* Products */}
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-ink">{t("conf.phone.productsLabel")}</p>
          {rows.map((r, i) => (
            <div key={i} className="flex gap-2">
              <Select
                value={r.productId}
                onValueChange={(v) => setRows(rows.map((x, j) => (j === i ? { ...x, productId: String(v ?? "") } : x)))}
              >
                <SelectTrigger className={`${input} flex-1`}>
                  <SelectValue placeholder={t("conf.phone.productOptionPlaceholder")}>
                    {(value) => {
                      const p = byId.get(String(value));
                      return p ? `${p.name} (${formatMAD(p.price)})` : t("conf.phone.productOptionPlaceholder");
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({formatMAD(p.price)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                max={99}
                value={r.qty}
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x)))}
                className={`${input} w-20`}
              />
              {rows.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  className="h-11 w-11 shrink-0 rounded-xl text-ink-soft hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">{t("conf.phone.productsLabel")}</span>
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRows([...rows, { productId: "", qty: 1 }])}
            className="gap-1.5 px-0 text-sm font-semibold text-brand-600 hover:bg-transparent hover:text-brand-700"
          >
            <Plus className="h-4 w-4" /> {t("conf.phone.addProductButton")}
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-sm text-ink-soft">
            {t("conf.phone.subtotalLabel")} <b className="text-ink">{formatMAD(subtotal)}</b>
            <span className="block text-xs">{t("conf.phone.deliveryNote")}</span>
          </span>
          <Button type="submit" disabled={pending} className="font-semibold">
            {pending ? t("conf.phone.submitting") : t("conf.phone.submitButton")}
          </Button>
        </div>
      </Card>
    </form>
  );
}
