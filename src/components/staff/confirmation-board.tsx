"use client";

import { useState } from "react";
import { Search, Inbox, AlertTriangle, CalendarCheck } from "lucide-react";
import { ConfirmOrderCard } from "./confirm-order-card";
import { ConfirmedOrderCard } from "./confirmed-order-card";
import { PhoneOrderForm } from "./phone-order-form";
import { Input } from "@/components/ui/input";
import type { Order } from "@/lib/types";
import { useI18n } from "@/i18n/i18n-context";

type PickItem = { id: string; name: string; price: number };

function matches(o: Order, s: string): boolean {
  if (!s) return true;
  return (
    o.customerName.toLowerCase().includes(s) ||
    o.phone.replace(/\s/g, "").includes(s.replace(/\s/g, "")) ||
    o.id.toLowerCase().includes(s)
  );
}

export function ConfirmationBoard({
  orders,
  confirmed,
  products,
  plombiers,
  hasPlombier,
}: {
  orders: Order[];
  confirmed: Order[];
  products: PickItem[];
  plombiers: { email: string; name: string | null; city: string | null }[];
  hasPlombier: boolean;
}) {
  const [q, setQ] = useState("");
  const { t } = useI18n();
  const s = q.trim().toLowerCase();
  const filtered = orders.filter((o) => matches(o, s));
  const filteredConfirmed = confirmed.filter((o) => matches(o, s));

  return (
    <div className="space-y-5">
      {!hasPlombier && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {t("conf.board.noTechnicianWarning")}
        </div>
      )}

      <PhoneOrderForm products={products} />

      <div className="relative">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("conf.board.searchPlaceholder")}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white ps-10 pe-4 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
            <Inbox className="h-7 w-7" />
          </div>
          <p className="mt-4 font-display text-lg font-semibold text-ink">
            {orders.length === 0 ? t("conf.board.emptyTitle") : t("conf.board.noResultsTitle")}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {orders.length === 0
              ? t("conf.board.emptyHint")
              : t("conf.board.noResultsHint")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((o) => (
            <ConfirmOrderCard key={o.id} order={o} plombiers={plombiers} />
          ))}
        </div>
      )}

      {/* Already confirmed / scheduled — view + cancel */}
      {filteredConfirmed.length > 0 && (
        <div className="pt-2">
          <h2 className="mb-3 flex items-center gap-2 font-display font-bold text-ink">
            <CalendarCheck className="h-5 w-5 text-emerald-500" />
            {t("conf.board.confirmedUpcoming", { count: filteredConfirmed.length })}
          </h2>
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredConfirmed.map((o) => (
              <ConfirmedOrderCard key={o.id} order={o} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
