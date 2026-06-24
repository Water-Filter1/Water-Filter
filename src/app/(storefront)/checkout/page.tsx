"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Phone,
  MapPin,
  Home,
  StickyNote,
  Megaphone,
  Banknote,
  ShieldCheck,
  Truck,
  Lock,
} from "lucide-react";
import { useCart } from "@/context/cart-context";
import { ProductPhoto } from "@/components/product-photo";
import { MOROCCAN_CITIES } from "@/lib/mock-data";
import { formatMAD } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-context";
import { useSettings } from "@/context/settings-context";
import { createOrderAction } from "@/lib/order-actions";

type Errors = Partial<Record<"name" | "phone" | "city" | "address", string>>;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear, hydrated } = useCart();
  const { t } = useI18n();
  const settings = useSettings();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    address: "",
    note: "",
    source: "", // how they found us (acquisition channel) — optional
    hp: "", // honeypot — stays empty for humans
  });
  const [optIn, setOptIn] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const delivery = subtotal >= settings.freeDeliveryThreshold ? 0 : settings.deliveryFee;
  const total = subtotal + delivery;

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const e: Errors = {};
    if (form.name.trim().length < 3) e.name = t("checkout.error.name");
    if (!/^0[5-7]\d{8}$/.test(form.phone.replace(/\s/g, "")))
      e.phone = t("checkout.error.phone");
    if (!form.city) e.city = t("checkout.error.city");
    if (form.address.trim().length < 6) e.address = t("checkout.error.address");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setSubmitting(true);

    try {
      const orderItems = items.map((i) => ({
        productId: i.productId,
        qty: i.qty,
        variantLabel: i.variantLabel,
      }));
      const res = await createOrderAction({
        customerName: form.name,
        phone: form.phone,
        city: form.city,
        address: form.address,
        note: form.note || undefined,
        items: orderItems,
        acquisitionSource: form.source || undefined,
        whatsappOptIn: optIn,
        hp: form.hp,
      });

      if (!res.ok) {
        setSubmitting(false);
        setFormError(res.error);
        return;
      }

      const order = {
        id: res.id,
        ...form,
        items: res.items,
        delivery: res.delivery,
        total: res.total,
      };
      sessionStorage.setItem("fm_last_order", JSON.stringify(order));
      clear();
      router.push("/thank-you");
    } catch {
      setSubmitting(false);
      setFormError(t("checkout.error.generic"));
    }
  }

  if (!hydrated) {
    return <div className="container-page py-24 text-center text-ink-soft">{t("common.loading")}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">
          {t("cart.empty.title")}
        </h1>
        <p className="mt-2 text-ink-soft">
          {t("cart.empty.subtitle")}
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block font-semibold text-brand-600 hover:text-brand-700"
        >
          {t("cart.empty.cta")}
        </Link>
      </div>
    );
  }

  const inputBase =
    "h-12 w-full rounded-xl border bg-white ps-11 pe-4 text-sm outline-none transition-all focus:ring-4 focus:ring-brand-100";

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-bold text-ink">
        {t("checkout.title")}
      </h1>
      <p className="mt-2 text-ink-soft">
        {t("checkout.subtitle")}
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]"
      >
        {/* Honeypot — hidden from humans, bots fill it and get rejected */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={form.hp}
          onChange={(e) => set("hp", e.target.value)}
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        />
        {formError && (
          <div className="rounded-card border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 lg:col-span-2">
            {formError}
          </div>
        )}
        {/* Form */}
        <div className="rounded-card border border-line bg-white p-6 shadow-soft sm:p-8">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-sm text-white">
              1
            </span>
            {t("checkout.contact.title")}
          </h2>

          <div className="mt-6 space-y-5">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">
                {t("checkout.field.name")}
              </label>
              <div className="relative">
                <User className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder={t("checkout.field.name.placeholder")}
                  className={`${inputBase} ${errors.name ? "border-rose-400" : "border-line focus:border-brand-300"}`}
                />
              </div>
              {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">
                {t("checkout.field.phone")}
              </label>
              <div className="relative">
                <Phone className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  inputMode="tel"
                  placeholder="0612345678"
                  className={`${inputBase} ${errors.phone ? "border-rose-400" : "border-line focus:border-brand-300"}`}
                />
              </div>
              {errors.phone ? (
                <p className="mt-1 text-xs text-rose-500">{errors.phone}</p>
              ) : (
                <p className="mt-1 text-xs text-ink-soft">
                  {t("checkout.field.phone.helper")}
                </p>
              )}
            </div>

            {/* City */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">
                {t("checkout.field.city")}
              </label>
              <div className="relative">
                <MapPin className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <select
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  className={`${inputBase} appearance-none ${errors.city ? "border-rose-400" : "border-line focus:border-brand-300"}`}
                >
                  <option value="">{t("checkout.field.city.placeholder")}</option>
                  {MOROCCAN_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {errors.city && <p className="mt-1 text-xs text-rose-500">{errors.city}</p>}
            </div>

            {/* Address */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">
                {t("checkout.field.address")}
              </label>
              <div className="relative">
                <Home className="absolute start-4 top-4 h-4 w-4 text-ink-soft" />
                <textarea
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  rows={3}
                  placeholder={t("checkout.field.address.placeholder")}
                  className={`w-full rounded-xl border bg-white py-3 ps-11 pe-4 text-sm outline-none transition-all focus:ring-4 focus:ring-brand-100 ${errors.address ? "border-rose-400" : "border-line focus:border-brand-300"}`}
                />
              </div>
              {errors.address && (
                <p className="mt-1 text-xs text-rose-500">{errors.address}</p>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">
                {t("checkout.field.note")}
              </label>
              <div className="relative">
                <StickyNote className="absolute start-4 top-4 h-4 w-4 text-ink-soft" />
                <textarea
                  value={form.note}
                  onChange={(e) => set("note", e.target.value)}
                  rows={2}
                  placeholder={t("checkout.field.note.placeholder")}
                  className="w-full rounded-xl border border-line bg-white py-3 ps-11 pe-4 text-sm outline-none transition-all focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                />
              </div>
            </div>

            {/* How did you hear about us? (acquisition channel) */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">{t("checkout.sourceLabel")}</label>
              <div className="relative">
                <Megaphone className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <select
                  value={form.source}
                  onChange={(e) => set("source", e.target.value)}
                  className={`${inputBase} appearance-none border-line focus:border-brand-300`}
                >
                  <option value="">{t("checkout.sourcePlaceholder")}</option>
                  <option value="facebook">Facebook</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="google">Google</option>
                  <option value="referral">{t("admin.crm.channelReferral")}</option>
                  <option value="other">{t("admin.crm.channelOther")}</option>
                </select>
              </div>
            </div>

            {/* WhatsApp maintenance-reminder consent */}
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={optIn}
                onChange={(e) => setOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-300"
              />
              <span>{t("checkout.consentLabel")}</span>
            </label>
          </div>

          {/* Payment method */}
          <h2 className="mt-8 flex items-center gap-2 font-display text-lg font-bold text-ink">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-sm text-white">
              2
            </span>
            {t("checkout.payment.title")}
          </h2>
          <div className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-brand-500 bg-brand-50 p-4">
            <Banknote className="h-6 w-6 text-brand-600" />
            <div>
              <p className="font-semibold text-ink">{t("checkout.payment.cod.title")}</p>
              <p className="text-sm text-ink-soft">
                {t("checkout.payment.cod.text")}
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-card border border-line bg-white p-6 shadow-soft">
            <h2 className="font-display text-lg font-bold text-ink">
              {t("checkout.summary.title")}
            </h2>

            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div
                  key={item.productId + (item.variantLabel ?? "")}
                  className="flex items-center gap-3"
                >
                  <div className="relative shrink-0">
                    <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-line bg-white">
                      <ProductPhoto
                        src={item.image}
                        alt={item.name}
                        hue={item.hue}
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                    <span className="absolute -end-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-700 px-1 text-xs font-bold text-white">
                      {item.qty}
                    </span>
                  </div>
                  <div className="flex-1 text-sm">
                    <p dir="auto" className="font-medium text-ink">{item.name}</p>
                    {item.variantLabel && (
                      <p className="text-xs text-ink-soft">{item.variantLabel}</p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-ink">
                    {formatMAD(item.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-sm">
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
              <div className="flex justify-between border-t border-line pt-3">
                <dt className="font-bold text-ink">{t("checkout.summary.totalToPay")}</dt>
                <dd className="font-display text-xl font-extrabold text-brand-700">
                  {formatMAD(total)}
                </dd>
              </div>
            </dl>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-6 font-semibold text-white shadow-[var(--shadow-glow)] transition-all hover:-translate-y-0.5 hover:bg-brand-600 disabled:opacity-60"
            >
              {submitting ? t("checkout.submit.processing") : t("checkout.submit.confirm")}
            </button>

            <div className="mt-4 space-y-2 text-xs text-ink-soft">
              <p className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-brand-500" /> {t("checkout.trust.delivery")}
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-500" /> {t("checkout.trust.warranty")}
              </p>
              <p className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-brand-500" /> {t("checkout.trust.privacy")}
              </p>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
