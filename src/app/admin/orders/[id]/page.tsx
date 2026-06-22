import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  MapPin,
  StickyNote,
  Banknote,
} from "lucide-react";
import { getOrderById, getInvoiceByOrderId } from "@/lib/data";
import { StatusBadge } from "@/components/admin/status-badge";
import { OrderFactureButton } from "@/components/admin/order-facture-button";
import { formatMAD, formatDate, waNumber } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { getT } from "@/i18n/server";

/**
 * Admin order view — READ-ONLY. The admin monitors what's happening; the order
 * status is driven by the confirmateur (confirm/cancel) and the plombier (install).
 */
export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const [{ t }, invoice] = await Promise.all([getT(), getInvoiceByOrderId(id)]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/admin/orders"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-ink hover:bg-slate-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-ink">{order.id}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-ink-soft">{t("admin.orderDetail.placedOn", { date: formatDate(order.createdAt) })}</p>
        </div>
        <OrderFactureButton orderId={order.id} invoiceId={invoice?.id ?? null} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        {/* Left: items */}
        <div className="space-y-6">
          <Card className="gap-0 overflow-hidden p-0">
            <h2 className="border-b border-slate-200 px-5 py-4 font-display font-bold text-ink">
              {t("admin.orderDetail.orderedItems")}
            </h2>
            <Table>
              <TableBody>
                {order.items.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <p className="font-medium text-ink" dir="auto">{it.name}</p>
                      {it.variantLabel && (
                        <p className="text-xs text-ink-soft">{it.variantLabel}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-ink-soft">× {it.qty}</TableCell>
                    <TableCell className="text-end font-semibold text-ink">
                      {formatMAD(it.price * it.qty)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between bg-slate-50 px-5 py-4">
              <span className="font-bold text-ink">{t("admin.orderDetail.totalToCollect")}</span>
              <span className="font-display text-xl font-extrabold text-brand-700">
                {formatMAD(order.total)}
              </span>
            </div>
          </Card>

          {order.note && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 font-semibold text-ink">
                <StickyNote className="h-4 w-4 text-brand-500" /> {t("admin.orderDetail.customerNote")}
              </h3>
              <p className="mt-2 text-sm text-ink-soft" dir="auto">{order.note}</p>
            </section>
          )}

          {order.confirmationNote && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-ink">{t("admin.orderDetail.confirmationNote")}</h3>
              <p className="mt-2 text-sm text-ink-soft" dir="auto">{order.confirmationNote}</p>
            </section>
          )}
        </div>

        {/* Right: customer + tracking (read-only) */}
        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-display font-bold text-ink">{t("admin.orderDetail.customer")}</h3>
            <p className="mt-3 font-semibold text-ink" dir="auto">{order.customerName}</p>
            <div className="mt-1 flex items-center gap-2 text-sm text-ink-soft">
              <Phone className="h-4 w-4" /> {order.phone}
            </div>
            <div className="mt-2 flex items-start gap-2 text-sm text-ink-soft">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span dir="auto">{order.address}, {order.city}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href={`tel:${order.phone}`}
                className="flex items-center justify-center gap-2 rounded-full bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                <Phone className="h-4 w-4" /> {t("admin.orderDetail.call")}
              </a>
              <a
                href={`https://wa.me/${waNumber(order.phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-display font-bold text-ink">{t("admin.orderDetail.payment")}</h3>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-brand-50 p-3 text-sm">
              <Banknote className="h-5 w-5 text-brand-600" />
              <span className="font-medium text-ink">{t("admin.orderDetail.cod")}</span>
            </div>
          </section>

          {/* Suivi (confirmation + installation) — read-only */}
          {(order.confirmedAt ||
            order.installDate ||
            order.assignedTo ||
            order.completedAt ||
            order.source === "phone") && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-display font-bold text-ink">{t("admin.orderDetail.tracking")}</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">{t("admin.orderDetail.source")}</dt>
                  <dd className="font-medium text-ink">
                    {order.source === "phone" ? t("admin.orderDetail.sourcePhone") : t("admin.orderDetail.sourceWeb")}
                  </dd>
                </div>
                {order.confirmedAt && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-soft">{t("admin.orderDetail.confirmedOn")}</dt>
                    <dd className="font-medium text-ink">{formatDate(order.confirmedAt)}</dd>
                  </div>
                )}
                {order.installDate && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-soft">{t("admin.orderDetail.plannedInstall")}</dt>
                    <dd className="text-end font-medium text-ink">
                      {new Date(order.installDate).toLocaleString("fr-MA", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Africa/Casablanca",
                      })}
                    </dd>
                  </div>
                )}
                {order.assignedTo && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-soft">{t("admin.orderDetail.technician")}</dt>
                    <dd className="break-all font-medium text-ink">{order.assignedTo}</dd>
                  </div>
                )}
                {order.completedAt && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-soft">{t("admin.orderDetail.installedOn")}</dt>
                    <dd className="font-medium text-emerald-600">{formatDate(order.completedAt)}</dd>
                  </div>
                )}
              </dl>

              {order.photoUrl && (
                <a
                  href={order.photoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block overflow-hidden rounded-xl border border-slate-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={order.photoUrl}
                    alt={t("admin.orderDetail.installationPhotoAlt")}
                    className="h-40 w-full object-cover"
                  />
                  <span className="block bg-slate-50 px-3 py-2 text-xs font-medium text-brand-600">
                    {t("admin.orderDetail.viewInstallationPhoto")}
                  </span>
                </a>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
