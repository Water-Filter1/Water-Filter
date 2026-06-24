"use client";

import Link from "next/link";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Truck,
  Banknote,
} from "lucide-react";
import { useCart } from "@/context/cart-context";
import { ProductPhoto } from "@/components/product-photo";
import { Button } from "@/components/ui/button";
import { formatMAD } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-context";
import { useSettings } from "@/context/settings-context";

export default function CartPage() {
  const { t } = useI18n();
  const { items, subtotal, updateQty, removeItem, hydrated } = useCart();
  const settings = useSettings();

  if (!hydrated) {
    return <div className="container-page py-24 text-center text-ink-soft">{t("common.loading")}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-400">
          <ShoppingBag className="h-9 w-9" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold text-ink">
          {t("cart.empty.title")}
        </h1>
        <p className="mt-2 text-ink-soft">
          {t("cart.empty.text")}
        </p>
        <div className="mt-7">
          <Button href="/shop" size="lg">
            {t("cart.empty.cta")} <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  const delivery = subtotal >= settings.freeDeliveryThreshold ? 0 : settings.deliveryFee;
  const total = subtotal + delivery;
  const remaining = settings.freeDeliveryThreshold - subtotal;

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-bold text-ink">{t("cart.title")}</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        {/* Items */}
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.productId + (item.variantLabel ?? "")}
              className="flex gap-4 rounded-card border border-line bg-white p-4 shadow-soft"
            >
              <Link
                href={`/product/${item.slug}`}
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-line bg-white"
              >
                <ProductPhoto
                  src={item.image}
                  alt={item.name}
                  hue={item.hue}
                  sizes="96px"
                  className="object-cover"
                />
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-2">
                  <div>
                    <Link
                      href={`/product/${item.slug}`}
                      dir="auto"
                      className="block font-display font-semibold text-ink hover:text-brand-600"
                    >
                      {item.name}
                    </Link>
                    {item.variantLabel && (
                      <p className="text-xs text-ink-soft">{item.variantLabel}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.productId, item.variantLabel)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-rose-50 hover:text-rose-500"
                    aria-label={t("cart.remove")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-auto flex items-end justify-between pt-2">
                  <div className="flex items-center rounded-full border border-line">
                    <button
                      onClick={() =>
                        updateQty(item.productId, item.qty - 1, item.variantLabel)
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-full text-brand-700 hover:bg-brand-50"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold">{item.qty}</span>
                    <button
                      onClick={() =>
                        updateQty(item.productId, item.qty + 1, item.variantLabel)
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-full text-brand-700 hover:bg-brand-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="text-end">
                    <p className="font-bold text-brand-700">
                      {formatMAD(item.price * item.qty)}
                    </p>
                    <p className="text-xs text-ink-soft">{formatMAD(item.price)} {t("cart.perUnit")}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Link
            href="/shop"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            ← {t("common.continue")}
          </Link>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-card border border-line bg-white p-6 shadow-soft">
            <h2 className="font-display text-lg font-bold text-ink">{t("cart.summary")}</h2>

            {remaining > 0 ? (
              <div className="mt-4 rounded-2xl bg-brand-50 p-3 text-sm text-brand-700">
                <Truck className="me-1 inline h-4 w-4" />
                {t("cart.freeDeliveryProgress", { amount: formatMAD(remaining) })}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                <Truck className="me-1 inline h-4 w-4" /> {t("cart.freeDeliveryUnlocked")} 🎉
              </div>
            )}

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">{t("common.subtotal")}</dt>
                <dd className="font-semibold text-ink">{formatMAD(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">{t("common.delivery")}</dt>
                <dd className="font-semibold text-ink">
                  {delivery === 0 ? t("common.free") : formatMAD(delivery)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-base">
                <dt className="font-bold text-ink">{t("common.total")}</dt>
                <dd className="font-display text-xl font-extrabold text-brand-700">
                  {formatMAD(total)}
                </dd>
              </div>
            </dl>

            <div className="mt-6">
              <Button href="/checkout" size="lg" className="w-full">
                {t("cart.checkout")} <ArrowRight className="h-5 w-5" />
              </Button>
            </div>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-ink-soft">
              <Banknote className="h-4 w-4 text-brand-500" />
              {t("cart.codNote")}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
