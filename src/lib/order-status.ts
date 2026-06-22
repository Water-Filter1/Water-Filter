import type { OrderStatus } from "./types";

export const STATUS_META: Record<
  OrderStatus,
  { label: string; className: string; dot: string }
> = {
  pending: {
    label: "En attente",
    className: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  confirmed: {
    label: "Confirmée",
    className: "bg-brand-100 text-brand-700",
    dot: "bg-brand-500",
  },
  installed: {
    label: "Installée",
    className: "bg-teal-100 text-teal-700",
    dot: "bg-teal-500",
  },
  cancelled: {
    label: "Annulée",
    className: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
  },
};

export const STATUS_ORDER: OrderStatus[] = [
  "pending",
  "confirmed",
  "installed",
  "cancelled",
];
