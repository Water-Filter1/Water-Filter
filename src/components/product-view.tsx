"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Minus,
  Plus,
  Check,
  Truck,
  ShieldCheck,
  Banknote,
  MessageCircle,
  CircleCheck,
} from "lucide-react";
import type { Product } from "@/lib/types";
import { ProductGallery } from "./product-gallery";
import { StarRating } from "./star-rating";
import { Badge, toneForBadge } from "./ui/badge";
import { Button } from "./ui/button";
import { useCart } from "@/context/cart-context";
import { useSettings } from "@/context/settings-context";
import { formatMAD, discountPercent, cn } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-context";
import { translateBadge } from "@/i18n/dictionary";

export function ProductView({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { t, locale } = useI18n();
  const settings = useSettings();
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState(product.variants?.[0]);
  const [added, setAdded] = useState(false);

  const outOfStock = !product.inStock || product.stock <= 0;
  const canOrder = !outOfStock || !!product.allowBackorder;
  const unitPrice = product.price + (variant?.priceDelta ?? 0);
  const off = discountPercent(product.price, product.oldPrice);
  const images = product.images;

  function add() {
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: unitPrice,
        hue: product.hue,
        image: product.images[0],
        variantLabel: variant?.label,
      },
      qty,
    );
  }

  function handleAddToCart() {
    if (!canOrder) return;
    add();
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  function handleBuyNow() {
    if (!canOrder) return;
    add();
    router.push("/checkout");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      {/* Gallery */}
      <ProductGallery images={images} name={product.name} hue={product.hue} />

      {/* Info */}
      <div>
        <div className="flex flex-wrap gap-2">
          {product.badges.map((b) => (
            <Badge key={b} tone={toneForBadge(b)}>{translateBadge(locale, b)}</Badge>
          ))}
          {!outOfStock ? (
            <Badge tone="success"><CircleCheck className="h-3 w-3" /> {t("common.inStock")}</Badge>
          ) : product.allowBackorder ? (
            <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
              {t("common.backorder")}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {t("common.outOfStockFull")}
            </span>
          )}
        </div>

        <h1
          dir="auto"
          className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl"
        >
          {product.name}
        </h1>

        <div className="mt-3 flex items-center gap-2">
          <StarRating value={product.rating} size={18} />
          <span className="font-semibold text-ink">{product.rating}</span>
          <span className="text-ink-soft">· {product.reviewCount} {t("common.reviews")}</span>
        </div>

        <p dir="auto" className="mt-4 text-ink-soft">
          {product.shortDescription}
        </p>

        {/* Price */}
        <div className="mt-5 flex items-end gap-3">
          <span className="font-display text-4xl font-extrabold text-brand-700">
            {formatMAD(unitPrice)}
          </span>
          {product.oldPrice && (
            <span className="mb-1 text-lg text-ink-soft line-through">
              {formatMAD(product.oldPrice)}
            </span>
          )}
          {off && <Badge tone="sale" className="mb-1.5">-{off}%</Badge>}
        </div>

        {/* Quick specs */}
        {(product.stages || product.capacity || product.warranty) && (
          <div className="mt-5 flex flex-wrap gap-2">
            {product.stages && (
              <span className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">
                {product.stages} {t("common.stages")}
              </span>
            )}
            {product.capacity && (
              <span className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">
                {product.capacity}
              </span>
            )}
            {product.warranty && product.warranty !== "—" && (
              <span className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">
                {t("common.warranty")} {product.warranty}
              </span>
            )}
          </div>
        )}

        {/* Variants */}
        {product.variants && product.variants.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold text-ink">{t("product.optionLabel")}</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVariant(v)}
                  className={cn(
                    "rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all",
                    variant?.id === v.id
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-line text-ink hover:border-brand-300",
                  )}
                >
                  {v.label}
                  {v.priceDelta > 0 && (
                    <span className="ms-1 text-xs text-ink-soft">
                      +{formatMAD(v.priceDelta)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity + actions */}
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-full border border-line">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-12 w-12 items-center justify-center rounded-full text-brand-700 hover:bg-brand-50"
              aria-label={t("product.qtyDecrease")}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center font-bold text-ink">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="flex h-12 w-12 items-center justify-center rounded-full text-brand-700 hover:bg-brand-50"
              aria-label={t("product.qtyIncrease")}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!canOrder}
            className={cn(
              "flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-6 font-semibold text-white transition-all",
              !canOrder
                ? "cursor-not-allowed bg-slate-300"
                : "shadow-[var(--shadow-glow)] hover:-translate-y-0.5 " +
                  (added ? "bg-emerald-500" : "bg-brand-500 hover:bg-brand-600"),
            )}
          >
            {!canOrder ? (
              t("common.outOfStockFull")
            ) : added ? (
              <><Check className="h-5 w-5" /> {t("common.added")}</>
            ) : (
              <><ShoppingCart className="h-5 w-5" /> {t("common.addToCart")}</>
            )}
          </button>
        </div>

        {canOrder && (
          <div className="mt-3 flex flex-wrap gap-3">
            <Button onClick={handleBuyNow} variant="dark" size="lg" className="flex-1">
              <Banknote className="h-5 w-5" /> {t("common.orderCod")}
            </Button>
            {settings.whatsapp && (
              <a
                href={`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(
                  `${t("product.whatsappMessage")} ${product.name}`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-14 items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 font-semibold text-white transition hover:brightness-105"
              >
                <MessageCircle className="h-5 w-5" /> {t("common.whatsapp")}
              </a>
            )}
          </div>
        )}

        {/* Trust row */}
        <div className="mt-7 grid grid-cols-1 gap-3 rounded-card bg-brand-50/70 p-4 sm:grid-cols-3">
          <div className="flex items-center gap-2 text-sm">
            <Truck className="h-5 w-5 text-brand-500" />
            <span className="text-ink-soft">{t("product.trust.delivery")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Banknote className="h-5 w-5 text-brand-500" />
            <span className="text-ink-soft">{t("product.trust.cod")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-5 w-5 text-brand-500" />
            <span className="text-ink-soft">{t("product.trust.warranty")}</span>
          </div>
        </div>

        {/* Features */}
        {product.features.length > 0 && (
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {product.features.map((f) => (
              <li key={f} dir="auto" className="flex items-start gap-2 text-sm text-ink">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
