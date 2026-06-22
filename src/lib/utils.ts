import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as Moroccan Dirhams, e.g. 1900 -> "1 900 MAD". */
export function formatMAD(value: number): string {
  return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(value) + " MAD";
}

/** Discount percentage from old/new price. */
export function discountPercent(price: number, oldPrice?: number): number | null {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

/** The store operates in Morocco — pin all date formatting to its timezone. */
export const TZ = "Africa/Casablanca";

/** Short, human date, e.g. "12 mai 2026". */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-MA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(iso));
}

/** Long localized date + time, e.g. "lundi 12 mai 14:30". */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-MA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

/** Add `months` to a date (ISO string or Date) → a new Date. */
export function addMonths(d: string | Date, months: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
}

/** Moroccan local number (06.., 07..) → wa.me international format (212XXXXXXXXX). */
export function waNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("212")) return digits;
  if (digits.startsWith("0")) return "212" + digits.slice(1);
  return digits;
}
