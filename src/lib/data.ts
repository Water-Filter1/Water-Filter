import type { Product as PRow, Order as ORow } from "@prisma/client";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma, withDbRetry } from "@/lib/prisma";
import type {
  Order,
  OrderItem,
  OrderStatus,
  Product,
  Spec,
  ProductVariant,
} from "@/lib/types";
import { addMonths } from "@/lib/utils";

/* ---------- mappers (DB row -> app type) ---------- */

function toProduct(row: PRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    categorySlug: row.categorySlug,
    shortDescription: row.shortDescription,
    description: row.description,
    price: row.price,
    cost: row.cost,
    oldPrice: row.oldPrice ?? undefined,
    rating: row.rating,
    reviewCount: row.reviewCount,
    stages: row.stages ?? undefined,
    capacity: row.capacity ?? undefined,
    warranty: row.warranty ?? undefined,
    badges: row.badges,
    inStock: row.inStock,
    stock: row.stock,
    allowBackorder: row.allowBackorder ?? false,
    bestSeller: row.bestSeller,
    hue: row.hue,
    images: row.images,
    features: row.features,
    specs: (row.specs as unknown as Spec[]) ?? [],
    variants: (row.variants as unknown as ProductVariant[] | null) ?? undefined,
    reviews: [],
  };
}

function toOrder(row: ORow): Order {
  return {
    id: row.id,
    customerName: row.customerName,
    phone: row.phone,
    city: row.city,
    address: row.address,
    note: row.note ?? undefined,
    items: (row.items as unknown as OrderItem[]) ?? [],
    total: row.total,
    status: row.status as OrderStatus,
    confirmationNote: row.confirmationNote ?? undefined,
    source: (row.source as "web" | "phone") ?? "web",
    confirmedAt: row.confirmedAt?.toISOString(),
    installDate: row.installDate?.toISOString(),
    assignedTo: row.assignedTo ?? undefined,
    completedAt: row.completedAt?.toISOString(),
    photoUrl: row.photoUrl ?? undefined,
    installStage: (row.installStage as "enroute" | "arrived" | null) ?? undefined,
    kind: (row.kind as "install" | "maintenance") ?? "install",
    parentOrderId: row.parentOrderId ?? undefined,
    lastOutcome: (row.lastOutcome as Order["lastOutcome"]) ?? undefined,
    callAttempts: row.callAttempts ?? 0,
    warrantyMonths: row.warrantyMonths ?? 24,
    maintenanceMonths: row.maintenanceMonths ?? 6,
    nextMaintenanceAt: row.nextMaintenanceAt?.toISOString(),
    lastMaintenanceAt: row.lastMaintenanceAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

/* ---------- product reads ---------- */

export async function getProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const row = await prisma.product.findUnique({ where: { slug } });
  return row ? toProduct(row) : null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const row = await prisma.product.findUnique({ where: { id } });
  return row ? toProduct(row) : null;
}

export async function getBestSellers(limit = 8): Promise<Product[]> {
  const best = await prisma.product.findMany({
    where: { bestSeller: true },
    take: limit,
  });
  if (best.length > 0) return best.map(toProduct);
  const any = await prisma.product.findMany({ take: limit, orderBy: { createdAt: "desc" } });
  return any.map(toProduct);
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { categorySlug: product.categorySlug, id: { not: product.id } },
    take: limit,
  });
  return rows.map(toProduct);
}

/* ---------- order reads ---------- */

export async function getOrders(status?: string): Promise<Order[]> {
  const rows = await prisma.order.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toOrder);
}

export async function getOrderById(id: string): Promise<Order | null> {
  const row = await prisma.order.findUnique({ where: { id } });
  return row ? toOrder(row) : null;
}

// "installed" is the field-service done state — it must count as a sale, otherwise
// completing a job would DECREASE revenue.
const SALE_STATUSES = ["confirmed", "installed"];

export type SalesBucket = { revenue: number; count: number; dow?: number; hour?: number; date?: string };
export type SalesSeries = { day: SalesBucket[]; week: SalesBucket[]; month: SalesBucket[] };

/**
 * Real sales revenue (Confirmed + Installed orders only) bucketed three ways for
 * the dashboard chart's Today / 7 days / 30 days toggle. One query covers all three.
 */
export async function getSalesSeries(): Promise<SalesSeries> {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start7 = new Date(startToday);
  start7.setDate(start7.getDate() - 6);
  const start30 = new Date(startToday);
  start30.setDate(start30.getDate() - 29);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: start30 }, status: { in: SALE_STATUSES } },
    select: { createdAt: true, total: true },
  });

  const day: SalesBucket[] = Array.from({ length: 24 }, (_, h) => ({ hour: h, revenue: 0, count: 0 }));
  const week: SalesBucket[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start7);
    d.setDate(d.getDate() + i);
    return { dow: d.getDay(), revenue: 0, count: 0 };
  });
  const month: SalesBucket[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(start30);
    d.setDate(d.getDate() + i);
    return { date: `${d.getDate()}/${d.getMonth() + 1}`, revenue: 0, count: 0 };
  });

  for (const o of orders) {
    const d = new Date(o.createdAt);
    const day0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const mIdx = Math.round((day0.getTime() - start30.getTime()) / 86_400_000);
    if (mIdx >= 0 && mIdx < 30) { month[mIdx].revenue += o.total; month[mIdx].count += 1; }
    const wIdx = Math.round((day0.getTime() - start7.getTime()) / 86_400_000);
    if (wIdx >= 0 && wIdx < 7) { week[wIdx].revenue += o.total; week[wIdx].count += 1; }
    if (day0.getTime() === startToday.getTime()) { day[d.getHours()].revenue += o.total; day[d.getHours()].count += 1; }
  }

  return { day, week, month };
}

/** Daily expense totals for the last 30 days (oldest→newest) — feeds the KPI sparklines. */
export async function getDailyExpenses(): Promise<number[]> {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start30 = new Date(startToday);
  start30.setDate(start30.getDate() - 29);

  const rows = await prisma.expense.findMany({
    where: { date: { gte: start30 } },
    select: { date: true, amount: true },
  });

  const out: number[] = new Array(30).fill(0);
  for (const e of rows) {
    const d = new Date(e.date);
    const day0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const i = Math.round((day0.getTime() - start30.getTime()) / 86_400_000);
    if (i >= 0 && i < 30) out[i] += e.amount;
  }
  return out;
}

/** Daily new-orders and installs counts for the last 30 days (from real order history). */
export async function getOrderActivitySeries(): Promise<{ newOrders: number[]; installs: number[] }> {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start30 = new Date(startToday);
  start30.setDate(start30.getDate() - 29);

  const orders = await prisma.order.findMany({
    where: { OR: [{ createdAt: { gte: start30 } }, { completedAt: { gte: start30 } }] },
    select: { createdAt: true, completedAt: true, installDate: true, status: true },
  });

  const idxOf = (d: Date) => {
    const day0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((day0.getTime() - start30.getTime()) / 86_400_000);
  };
  const newOrders: number[] = new Array(30).fill(0);
  const installs: number[] = new Array(30).fill(0);
  for (const o of orders) {
    const ci = idxOf(new Date(o.createdAt));
    if (ci >= 0 && ci < 30) newOrders[ci] += 1;
    if (o.status === "installed") {
      const when = o.completedAt ?? o.installDate ?? o.createdAt;
      const ii = idxOf(new Date(when));
      if (ii >= 0 && ii < 30) installs[ii] += 1;
    }
  }
  return { newOrders, installs };
}

export type MetricSnapshotValues = {
  stockTotal: number;
  lowStockCount: number;
  pending: number;
  savDue: number;
  activeClients: number;
  installedDevices: number;
  technicians: number;
};
export type MetricSnapshotSeries = {
  stockTotal: number[];
  lowStockCount: number[];
  pending: number[];
  savDue: number[];
};

/** Upsert today's point-in-time metrics so future days accumulate a real trend. */
export async function recordTodaySnapshot(v: MetricSnapshotValues): Promise<void> {
  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  await prisma.metricSnapshot.upsert({
    where: { day },
    update: { ...v },
    create: { day, ...v },
  });
}

/** Last 30 days of point-in-time metrics, forward/back-filled into continuous arrays. */
export async function getMetricSnapshots(): Promise<MetricSnapshotSeries> {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start30 = new Date(startToday);
  start30.setDate(start30.getDate() - 29);

  const rows = await prisma.metricSnapshot.findMany({
    where: { day: { gte: start30 } },
    orderBy: { day: "asc" },
  });

  const byIdx = new Map<number, (typeof rows)[number]>();
  for (const r of rows) {
    const d = new Date(r.day);
    const day0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const i = Math.round((day0.getTime() - start30.getTime()) / 86_400_000);
    if (i >= 0 && i < 30) byIdx.set(i, r);
  }

  const keys = ["stockTotal", "lowStockCount", "pending", "savDue"] as const;
  const out: MetricSnapshotSeries = { stockTotal: [], lowStockCount: [], pending: [], savDue: [] };
  for (const key of keys) {
    const known: (number | null)[] = new Array(30).fill(null);
    for (const [i, r] of byIdx) known[i] = r[key];
    let last: number | null = null;
    for (let i = 0; i < 30; i++) {
      if (known[i] != null) last = known[i];
      else known[i] = last;
    }
    const firstKnown = known.find((x) => x != null) ?? 0;
    out[key] = known.map((x) => (x == null ? firstKnown : x));
  }
  return out;
}

/* ---------- dashboard cards ---------- */

export type LowStockItem = { id: string; name: string; categorySlug: string; stock: number };

/** Products still on sale whose stock has dropped to/below the threshold. */
export async function getLowStockProducts(threshold = 5, limit = 6): Promise<LowStockItem[]> {
  return prisma.product.findMany({
    where: { inStock: true, stock: { lte: threshold } },
    orderBy: { stock: "asc" },
    take: limit,
    select: { id: true, name: true, categorySlug: true, stock: true },
  });
}

export type TopSeller = { name: string; units: number };

/** Best-selling products by units sold — real install orders only (no maintenance, no cancelled/returned). */
export async function getTopSellers(limit = 5): Promise<TopSeller[]> {
  const orders = await prisma.order.findMany({
    where: { kind: "install", status: { notIn: ["cancelled"] } },
    select: { items: true },
  });
  const tally = new Map<string, number>();
  for (const o of orders) {
    const items = (o.items as unknown as OrderItem[]) ?? [];
    for (const it of items) {
      if (!it?.name) continue;
      tally.set(it.name, (tally.get(it.name) ?? 0) + (it.qty ?? 0));
    }
  }
  return [...tally.entries()]
    .map(([name, units]) => ({ name, units }))
    .sort((a, b) => b.units - a.units)
    .slice(0, limit);
}

/* ---------- contact messages ---------- */

export type ContactMessageDTO = {
  id: string;
  name: string;
  phone: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export async function createContactMessage(data: {
  name: string;
  phone: string;
  message: string;
}): Promise<ContactMessageDTO> {
  const m = await prisma.contactMessage.create({ data });
  return {
    id: m.id,
    name: m.name,
    phone: m.phone,
    message: m.message,
    read: m.read,
    createdAt: m.createdAt.toISOString(),
  };
}

export async function getMessages(): Promise<ContactMessageDTO[]> {
  const rows = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map((m) => ({
    id: m.id,
    name: m.name,
    phone: m.phone,
    message: m.message,
    read: m.read,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function markMessageRead(id: string) {
  return prisma.contactMessage.update({ where: { id }, data: { read: true } });
}

/* ---------- admin notifications ---------- */

export type AdminNotifications = {
  pendingCount: number;
  lowStockCount: number;
  unreadMessagesCount: number;
  maintenanceDueCount: number;
  pendingReviewsCount: number;
  pendingOrders: { id: string; customerName: string; total: number; createdAt: string }[];
  lowStock: { id: string; name: string; stock: number }[];
  messages: { id: string; name: string; message: string; createdAt: string }[];
  maintenance: { id: string; name: string; dueAt: string }[];
};

export async function getAdminNotifications(): Promise<AdminNotifications> {
  const dueLimit = new Date();
  dueLimit.setDate(dueLimit.getDate() + 14);
  const [pendingCount, pending, low, unreadMessagesCount, msgs, maintCount, maint, pendingReviewsCount] =
    await withDbRetry(() =>
      Promise.all([
        prisma.order.count({ where: { status: "pending" } }),
        prisma.order.findMany({ where: { status: "pending" }, orderBy: { createdAt: "desc" }, take: 8 }),
        prisma.product.findMany({ where: { inStock: true, stock: { lte: 5 } }, orderBy: { stock: "asc" }, take: 8 }),
        prisma.contactMessage.count({ where: { read: false } }),
        prisma.contactMessage.findMany({ where: { read: false }, orderBy: { createdAt: "desc" }, take: 8 }),
        prisma.order.count({
          where: { status: "installed", kind: "install", nextMaintenanceAt: { lte: dueLimit } },
        }),
        prisma.order.findMany({
          where: { status: "installed", kind: "install", nextMaintenanceAt: { lte: dueLimit } },
          orderBy: { nextMaintenanceAt: "asc" },
          take: 8,
        }),
        prisma.review.count({ where: { status: "pending" } }),
      ]),
    );
  return {
    pendingCount,
    lowStockCount: low.length,
    unreadMessagesCount,
    maintenanceDueCount: maintCount,
    pendingReviewsCount,
    pendingOrders: pending.map((o) => ({
      id: o.id,
      customerName: o.customerName,
      total: o.total,
      createdAt: o.createdAt.toISOString(),
    })),
    lowStock: low.map((p) => ({ id: p.id, name: p.name, stock: p.stock })),
    messages: msgs.map((m) => ({
      id: m.id,
      name: m.name,
      message: m.message,
      createdAt: m.createdAt.toISOString(),
    })),
    maintenance: maint.map((o) => ({
      id: o.id,
      name: o.customerName,
      dueAt: o.nextMaintenanceAt ? o.nextMaintenanceAt.toISOString() : "",
    })),
  };
}

/* ---------- product writes ---------- */

export type ProductInput = {
  slug: string;
  name: string;
  categorySlug: string;
  shortDescription: string;
  description: string;
  price: number;
  cost: number;
  oldPrice?: number | null;
  stages?: number | null;
  capacity?: string | null;
  warranty?: string | null;
  badges: string[];
  inStock: boolean;
  stock: number;
  allowBackorder?: boolean;
  bestSeller?: boolean;
  hue: number;
  images: string[];
  features: string[];
  specs: Spec[];
};

function toData(input: ProductInput) {
  return {
    slug: input.slug,
    name: input.name,
    categorySlug: input.categorySlug,
    shortDescription: input.shortDescription,
    description: input.description,
    price: input.price,
    cost: input.cost ?? 0,
    oldPrice: input.oldPrice ?? null,
    stages: input.stages ?? null,
    capacity: input.capacity ?? null,
    warranty: input.warranty ?? null,
    badges: input.badges,
    inStock: input.inStock,
    stock: input.stock,
    allowBackorder: input.allowBackorder ?? false,
    bestSeller: input.bestSeller ?? false,
    hue: input.hue,
    images: input.images,
    features: input.features,
    specs: input.specs as unknown as object,
  };
}

export async function createProduct(input: ProductInput) {
  return prisma.product.create({ data: toData(input) });
}

export async function updateProduct(id: string, input: ProductInput) {
  return prisma.product.update({ where: { id }, data: toData(input) });
}

export async function deleteProduct(id: string) {
  return prisma.product.delete({ where: { id } });
}

/* ---------- order writes ---------- */

function pickVariantDelta(variantsJson: unknown, label?: string): number {
  if (!label || !variantsJson) return 0;
  const arr = variantsJson as ProductVariant[];
  if (!Array.isArray(arr)) return 0;
  return arr.find((v) => v.label === label)?.priceDelta ?? 0;
}

/**
 * Creates an order. Prices, delivery and total are recomputed SERVER-SIDE
 * from the database — the client's numbers are never trusted. Validates
 * input, generates a collision-proof id, and decrements stock.
 */
export async function createOrder(data: {
  customerName: string;
  phone: string;
  city: string;
  address: string;
  note?: string;
  items: { productId: string; qty: number; variantLabel?: string }[];
  source?: "web" | "phone";
  acquisitionSource?: string | null;
  whatsappOptIn?: boolean;
}): Promise<Order> {
  // validation
  const name = (data.customerName ?? "").trim();
  const phone = (data.phone ?? "").replace(/\s/g, "");
  const city = (data.city ?? "").trim();
  const address = (data.address ?? "").trim();
  if (name.length < 3 || name.length > 60) throw new Error("INVALID_NAME");
  if (!/^0[5-7]\d{8}$/.test(phone)) throw new Error("INVALID_PHONE");
  if (city.length < 2) throw new Error("INVALID_CITY");
  if (address.length < 6) throw new Error("INVALID_ADDRESS");
  if (!Array.isArray(data.items) || data.items.length === 0 || data.items.length > 50)
    throw new Error("INVALID_ITEMS");

  // recompute from DB (never trust client prices/total)
  const ids = [...new Set(data.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: ids } } });
  const byId = new Map(products.map((p) => [p.id, p]));

  const orderItems: OrderItem[] = [];
  let subtotal = 0;
  for (const it of data.items) {
    const p = byId.get(it.productId);
    if (!p) throw new Error("PRODUCT_NOT_FOUND");
    const qty = Math.max(1, Math.min(99, Math.floor(Number(it.qty) || 1)));
    const unit = p.price + pickVariantDelta(p.variants, it.variantLabel);
    subtotal += unit * qty;
    orderItems.push({
      name: p.name,
      qty,
      price: unit,
      variantLabel: it.variantLabel,
      productId: p.id,
    });
  }

  const settings = await getSettings();
  const delivery = subtotal >= settings.freeDeliveryThreshold ? 0 : settings.deliveryFee;
  const total = subtotal + delivery;

  // aggregate quantity per product (handles the same product appearing twice)
  const qtyByProduct = new Map<string, number>();
  for (const it of orderItems) {
    if (it.productId)
      qtyByProduct.set(it.productId, (qtyByProduct.get(it.productId) ?? 0) + it.qty);
  }

  // ATOMIC: guard stock (prevents overselling/negative stock), reserve a
  // collision-proof id, and create the order — all in one transaction.
  const row = await prisma.$transaction(async (tx) => {
    // Ensure the order-number sequence exists in the SAME session as nextval
    // (safe with pooled/PgBouncer connections).
    await tx.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS order_seq START 1`);
    for (const [pid, qty] of qtyByProduct) {
      // "Sur commande" products stay orderable (stock may go negative = backorder).
      if (byId.get(pid)?.allowBackorder) {
        await tx.product.update({ where: { id: pid }, data: { stock: { decrement: qty } } });
        continue;
      }
      const res = await tx.product.updateMany({
        where: { id: pid, stock: { gte: qty } },
        data: { stock: { decrement: qty } },
      });
      if (res.count !== 1) throw new Error("OUT_OF_STOCK");
    }
    const seqRows = await tx.$queryRawUnsafe<{ n: number }[]>(
      `SELECT nextval('order_seq')::int AS n`,
    );
    if (!seqRows?.[0]) throw new Error("ID_GENERATION_FAILED");
    const id = "FM-" + (2000 + seqRows[0].n);
    return tx.order.create({
      data: {
        id,
        customerName: name,
        phone,
        city,
        address,
        note: data.note?.trim() || null,
        items: orderItems as unknown as object,
        total,
        status: "pending",
        source: data.source === "phone" ? "phone" : "web",
        acquisitionSource: data.acquisitionSource ?? null,
      },
    });
  });

  await upsertClientFromOrder({
    phone,
    customerName: name,
    city,
    address,
    source: row.source,
    createdAt: row.createdAt,
    acquisitionSource: data.acquisitionSource ?? null,
    whatsappOptIn: data.whatsappOptIn ?? false,
  });
  await logActivity({
    actor: row.source === "phone" ? "staff" : "customer",
    action: "order.created",
    entity: row.id,
    summary: `New order ${row.id} — ${name}, ${city}`,
    meta: { total, city, name, source: row.source },
  });

  // Audit: record a `sale` stock movement per product + keep inStock in sync.
  // Post-commit and best-effort — must never block/break order creation.
  try {
    const actor = row.source === "phone" ? "staff" : "customer";
    for (const [pid, qty] of qtyByProduct) {
      const cur = await prisma.product.findUnique({ where: { id: pid }, select: { stock: true } });
      if (!cur) continue;
      await prisma.product.update({ where: { id: pid }, data: { inStock: cur.stock > 0 } });
      await prisma.stockMovement.create({
        data: { productId: pid, delta: -qty, before: cur.stock + qty, after: cur.stock, reason: "sale", note: row.id, actor },
      });
    }
  } catch {
    // audit-only; ignore
  }

  return toOrder(row);
}

const STOCK_RELEASING = new Set(["cancelled"]);

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  confirmationNote?: string,
) {
  const noteData = confirmationNote !== undefined ? { confirmationNote } : {};
  const current = await prisma.order.findUnique({ where: { id } });

  // Restore stock when an install order is cancelled/returned (it reserved stock at creation).
  const restore =
    current &&
    current.kind === "install" &&
    STOCK_RELEASING.has(status) &&
    !STOCK_RELEASING.has(current.status);

  if (!restore) {
    return prisma.order.update({ where: { id }, data: { status, ...noteData } });
  }

  const items = (current!.items as unknown as OrderItem[]) ?? [];
  const qtyByProduct = new Map<string, number>();
  for (const it of items) {
    if (it.productId) qtyByProduct.set(it.productId, (qtyByProduct.get(it.productId) ?? 0) + it.qty);
  }
  return prisma.$transaction(async (tx) => {
    for (const [pid, qty] of qtyByProduct) {
      await tx.product.updateMany({ where: { id: pid }, data: { stock: { increment: qty } } });
      const cur = await tx.product.findUnique({ where: { id: pid }, select: { stock: true } });
      if (cur) {
        await tx.product.update({ where: { id: pid }, data: { inStock: cur.stock > 0 } });
        await tx.stockMovement.create({
          data: { productId: pid, delta: qty, before: cur.stock - qty, after: cur.stock, reason: "return", note: id, actor: "staff" },
        });
      }
    }
    return tx.order.update({ where: { id }, data: { status, ...noteData } });
  });
}

/* ---------- confirmation + installation flow ---------- */

/** Orders awaiting a confirmation call (newest first). */
export async function getOrdersToConfirm(): Promise<Order[]> {
  const rows = await prisma.order.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toOrder);
}

/**
 * Confirmateur confirms an order: records the call, schedules the install,
 * and assigns it to the plombier. Returns the updated order.
 */
export async function confirmOrder(
  id: string,
  data: { installDate: Date; assignedTo: string | null; note?: string },
): Promise<Order> {
  // Atomic: only a still-pending order can be confirmed (can't re-confirm a
  // cancelled/installed order, even under a double-submit race).
  const upd = await prisma.order.updateMany({
    where: { id, status: "pending" },
    data: {
      status: "confirmed",
      confirmedAt: new Date(),
      installDate: data.installDate,
      assignedTo: data.assignedTo,
      lastOutcome: "confirmed",
      ...(data.note !== undefined ? { confirmationNote: data.note } : {}),
    },
  });
  if (upd.count !== 1) throw new Error("NOT_PENDING");
  const row = await prisma.order.findUnique({ where: { id } });
  return toOrder(row!);
}

/** Installations assigned to a given plombier (by email) still to do, upcoming first. */
export async function getPlombierJobs(email: string): Promise<Order[]> {
  const rows = await prisma.order.findMany({
    where: { assignedTo: email, status: "confirmed" },
    orderBy: { installDate: "asc" },
  });
  return rows.map(toOrder);
}

/** Confirmed (scheduled) install orders — for the confirmateur to view / cancel. */
export async function getConfirmedOrders(): Promise<Order[]> {
  const rows = await prisma.order.findMany({
    where: { status: "confirmed", kind: "install" },
    orderBy: { installDate: "asc" },
  });
  return rows.map(toOrder);
}

/** All installations still to do (admin oversight view), upcoming first. */
export async function getActiveInstalls(): Promise<Order[]> {
  const rows = await prisma.order.findMany({
    where: { status: "confirmed" },
    orderBy: { installDate: "asc" },
  });
  return rows.map(toOrder);
}

export type UpcomingJob = {
  id: string;
  customerName: string;
  city: string;
  product: string;
  type: "install" | "maintenance" | "maintenance_due";
  date: string | null; // ISO; null = confirmed but not yet scheduled ("à planifier")
  technicianName: string | null;
};

/**
 * Dashboard agenda — the team's next jobs, soonest first:
 * - scheduled installs / maintenance visits (status "confirmed"), and
 * - installations whose 6-month maintenance falls due within 30 days.
 * Jobs still "à planifier" (confirmed, no install date) bubble to the top.
 */
export async function getUpcomingJobs(limit = 7): Promise<UpcomingJob[]> {
  const dueLimit = new Date();
  dueLimit.setDate(dueLimit.getDate() + 30);

  const [confirmed, due, plombiers] = await prisma.$transaction([
    prisma.order.findMany({
      where: { status: "confirmed" },
      orderBy: { installDate: "asc" },
      take: 12,
    }),
    prisma.order.findMany({
      where: { status: "installed", kind: "install", nextMaintenanceAt: { lte: dueLimit } },
      orderBy: { nextMaintenanceAt: "asc" },
      take: 12,
    }),
    prisma.adminUser.findMany({ where: { role: "plombier" }, select: { email: true, name: true } }),
  ]);

  const nameOf = (email: string | null) =>
    email ? plombiers.find((p) => p.email === email)?.name ?? email : null;
  const firstItem = (items: unknown): string => {
    const arr = (items as OrderItem[] | null) ?? [];
    return arr[0]?.name ?? "";
  };

  const jobs: UpcomingJob[] = [
    ...confirmed.map((o) => ({
      id: o.id,
      customerName: o.customerName,
      city: o.city,
      product: firstItem(o.items),
      type: (o.kind === "maintenance" ? "maintenance" : "install") as UpcomingJob["type"],
      date: o.installDate ? o.installDate.toISOString() : null,
      technicianName: nameOf(o.assignedTo),
    })),
    ...due.map((o) => ({
      id: o.id,
      customerName: o.customerName,
      city: o.city,
      product: firstItem(o.items),
      type: "maintenance_due" as const,
      date: o.nextMaintenanceAt ? o.nextMaintenanceAt.toISOString() : null,
      technicianName: null,
    })),
  ];

  // Soonest first; jobs with no date ("à planifier") sort to the top as action items.
  jobs.sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : 0;
    const tb = b.date ? new Date(b.date).getTime() : 0;
    return ta - tb;
  });
  return jobs.slice(0, limit);
}

/** All plombier accounts (for the confirmateur's assignment dropdown). */
export async function getPlombiers(): Promise<{ email: string; name: string | null; city: string | null }[]> {
  return prisma.adminUser.findMany({
    where: { role: "plombier" },
    select: { email: true, name: true, city: true },
    orderBy: { createdAt: "asc" },
  });
}

/* ---------- staff notifications (bell) ---------- */

export type StaffNotif = {
  count: number;
  items: { id: string; title: string; subtitle: string; href: string }[];
};

/** Confirmateur bell: orders waiting to be confirmed. */
export async function getConfirmationNotifications(): Promise<StaffNotif> {
  const [count, rows] = await Promise.all([
    prisma.order.count({ where: { status: "pending" } }),
    prisma.order.findMany({ where: { status: "pending" }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  return {
    count,
    items: rows.map((o) => ({
      id: o.id,
      title: `${o.id} · ${o.customerName}`,
      subtitle: o.city,
      href: "/confirmation",
    })),
  };
}

/** Plombier bell: installations to do (his own, or all when viewed by an admin). */
export async function getPlombierNotifications(email: string | null, all: boolean): Promise<StaffNotif> {
  const where = all
    ? { status: "confirmed" as const }
    : { status: "confirmed" as const, assignedTo: email ?? "__none__" };
  const [count, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, orderBy: { installDate: "asc" }, take: 8 }),
  ]);
  return {
    count,
    items: rows.map((o) => ({
      id: o.id,
      title: `${o.id} · ${o.customerName}`,
      subtitle: o.installDate
        ? new Date(o.installDate).toLocaleDateString("fr-MA", { timeZone: "Africa/Casablanca" })
        : "à planifier",
      href: "/technicien",
    })),
  };
}

/**
 * Plombier marks a job done with a photo.
 * - An installation starts the maintenance clock (completion + interval).
 * - A maintenance visit restarts the parent installation's clock instead.
 */
export async function completeInstallation(id: string, photoUrl: string): Promise<Order> {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id } });
    if (!existing) throw new Error("NOT_FOUND");

    const data: {
      status: string;
      completedAt: Date;
      photoUrl: string;
      nextMaintenanceAt?: Date;
    } = { status: "installed", completedAt: now, photoUrl };
    if (existing.kind !== "maintenance") {
      data.nextMaintenanceAt = addMonths(now, existing.maintenanceMonths ?? 6);
    }

    // Atomic guard: only a still-confirmed job can be completed (blocks double-completion).
    const upd = await tx.order.updateMany({ where: { id, status: "confirmed" }, data });
    if (upd.count !== 1) throw new Error("NOT_CONFIRMED");

    // A completed maintenance visit restarts the original installation's clock.
    if (existing.kind === "maintenance" && existing.parentOrderId) {
      const parent = await tx.order.findUnique({ where: { id: existing.parentOrderId } });
      if (parent) {
        await tx.order.update({
          where: { id: parent.id },
          data: { lastMaintenanceAt: now, nextMaintenanceAt: addMonths(now, parent.maintenanceMonths) },
        });
      }
    }
    const row = await tx.order.findUnique({ where: { id } });
    return toOrder(row!);
  });
}

/* ---------- after-sales: installations + maintenance (Phase 3) ---------- */

/** All completed installations (the "Suivi client" list), maintenance-due first. */
export async function getInstallations(): Promise<Order[]> {
  const rows = await prisma.order.findMany({
    where: { status: "installed", kind: "install" },
    orderBy: { nextMaintenanceAt: "asc" },
  });
  return rows.map(toOrder);
}

/** Admin: change the maintenance interval for an installation and recompute the due date. */
export async function setMaintenanceInterval(id: string, months: number): Promise<Order> {
  const o = await prisma.order.findUnique({ where: { id } });
  if (!o) throw new Error("NOT_FOUND");
  const base = o.lastMaintenanceAt ?? o.completedAt ?? o.createdAt;
  const row = await prisma.order.update({
    where: { id },
    data: { maintenanceMonths: months, nextMaintenanceAt: addMonths(base, months) },
  });
  return toOrder(row);
}

/** Admin: mark a maintenance as done manually (restarts the clock, no visit record). */
export async function markMaintenanceDone(id: string): Promise<Order> {
  const o = await prisma.order.findUnique({ where: { id } });
  if (!o) throw new Error("NOT_FOUND");
  const now = new Date();
  const row = await prisma.order.update({
    where: { id },
    data: { lastMaintenanceAt: now, nextMaintenanceAt: addMonths(now, o.maintenanceMonths) },
  });
  return toOrder(row);
}

/** Admin: schedule a maintenance VISIT — a new work order the plombier will see + complete. */
export async function createMaintenanceVisit(
  parentId: string,
  opts: { installDate: Date; assignedTo: string | null },
): Promise<Order> {
  const parent = await prisma.order.findUnique({ where: { id: parentId } });
  if (!parent) throw new Error("PARENT_NOT_FOUND");

  // All three writes (sequence id, the visit, the parent's pushed-forward due date)
  // run in one transaction/session — safe under pooled (PgBouncer) connections.
  const row = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS order_seq START 1`);
    const seq = await tx.$queryRawUnsafe<{ n: number }[]>(`SELECT nextval('order_seq')::int AS n`);
    if (!seq?.[0]) throw new Error("ID_GENERATION_FAILED");
    const id = "FM-" + (2000 + seq[0].n);
    const created = await tx.order.create({
      data: {
        id,
        customerName: parent.customerName,
        phone: parent.phone,
        city: parent.city,
        address: parent.address,
        note: "Visite d'entretien (changement de filtre)",
        items: (parent.items as unknown as object) ?? [],
        total: 0,
        status: "confirmed",
        kind: "maintenance",
        parentOrderId: parent.id,
        assignedTo: opts.assignedTo,
        installDate: opts.installDate,
        source: "web",
      },
    });
    // Push the parent's due date forward so it leaves the "à prévoir" list while the
    // visit is scheduled. Completing the visit recomputes it precisely (see completeInstallation).
    await tx.order.update({
      where: { id: parent.id },
      data: { nextMaintenanceAt: addMonths(opts.installDate, parent.maintenanceMonths) },
    });
    return created;
  });
  return toOrder(row);
}

/** Plombier advances his progress on a job: "enroute" | "arrived". */
export async function setJobStage(id: string, stage: "enroute" | "arrived"): Promise<Order> {
  const row = await prisma.order.update({ where: { id }, data: { installStage: stage } });
  return toOrder(row);
}

/** Emails of all confirmateur accounts (to alert on new orders). */
export async function getConfirmateurEmails(): Promise<string[]> {
  const rows = await prisma.adminUser.findMany({
    where: { role: "confirmateur" },
    select: { email: true },
  });
  return rows.map((r) => r.email);
}

/* ---------- staff (admin users) ---------- */

export type StaffUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  city: string | null;
  createdAt: string;
};

export async function getStaffUsers(): Promise<StaffUser[]> {
  const rows = await prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    city: u.city,
    createdAt: u.createdAt.toISOString(),
  }));
}

/** The single plombier's email, used to auto-assign installations. */
export async function getPlombierEmail(): Promise<string | null> {
  const p = await prisma.adminUser.findFirst({
    where: { role: "plombier" },
    orderBy: { createdAt: "asc" },
  });
  return p?.email ?? null;
}

/* ---------- site settings ---------- */

export type SiteSettings = {
  siteName: string;
  logoUrl: string | null;
  phone1: string;
  phone2: string | null;
  email: string | null;
  whatsapp: string | null;
  addressText: string | null;
  mapLat: number | null;
  mapLng: number | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  announcement: string | null;
  freeDeliveryThreshold: number;
  deliveryFee: number;
  confirmateurMonthly: number;
};

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "Filtre Maroc",
  logoUrl: "/logo.jpeg",
  phone1: "0660781919",
  phone2: "0664302923",
  email: "filter.water.maoc@gmail.com",
  whatsapp: "212660781919",
  addressText: "Agadir, Maroc",
  mapLat: 30.4144656,
  mapLng: -9.5671467,
  facebook: "https://facebook.com",
  instagram: "https://instagram.com",
  tiktok: "https://tiktok.com",
  announcement: null,
  freeDeliveryThreshold: 1000,
  deliveryFee: 40,
  confirmateurMonthly: 0,
};

export async function getSettings(): Promise<SiteSettings> {
  const row = await prisma.siteSettings.findUnique({ where: { id: "main" } });
  if (!row) return DEFAULT_SETTINGS;
  return {
    siteName: row.siteName,
    logoUrl: row.logoUrl,
    phone1: row.phone1 || DEFAULT_SETTINGS.phone1,
    phone2: row.phone2,
    email: row.email,
    whatsapp: row.whatsapp,
    addressText: row.addressText,
    mapLat: row.mapLat,
    mapLng: row.mapLng,
    facebook: row.facebook,
    instagram: row.instagram,
    tiktok: row.tiktok,
    announcement: row.announcement,
    freeDeliveryThreshold: row.freeDeliveryThreshold,
    deliveryFee: row.deliveryFee ?? DEFAULT_SETTINGS.deliveryFee,
    confirmateurMonthly: row.confirmateurMonthly ?? 0,
  };
}

export async function updateSettings(data: Partial<SiteSettings>) {
  return prisma.siteSettings.upsert({
    where: { id: "main" },
    update: data,
    create: { id: "main", ...DEFAULT_SETTINGS, ...data },
  });
}

/* ---------- product reviews (with admin moderation) ---------- */

export type Review = {
  id: string;
  productId: string;
  name: string;
  rating: number;
  comment: string;
  status: string;
  createdAt: string;
};

type ReviewRow = {
  id: string;
  productId: string;
  name: string;
  rating: number;
  comment: string;
  status: string;
  createdAt: Date;
};

function toReview(r: ReviewRow): Review {
  return {
    id: r.id,
    productId: r.productId,
    name: r.name,
    rating: r.rating,
    comment: r.comment,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Create a pending review (server-side validated). */
export async function createReview(data: {
  productId: string;
  name: string;
  rating: number;
  comment: string;
}): Promise<void> {
  const name = (data.name ?? "").trim();
  const comment = (data.comment ?? "").trim();
  const rating = Math.round(Number(data.rating));
  if (name.length < 2 || name.length > 60) throw new Error("INVALID_NAME");
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw new Error("INVALID_RATING");
  if (comment.length < 3 || comment.length > 1000) throw new Error("INVALID_COMMENT");
  const product = await prisma.product.findUnique({
    where: { id: data.productId },
    select: { id: true },
  });
  if (!product) throw new Error("PRODUCT_NOT_FOUND");
  await prisma.review.create({
    data: { productId: data.productId, name, rating, comment, status: "pending" },
  });
  await logActivity({
    actor: "customer",
    action: "review.created",
    entity: data.productId,
    summary: `New review (${rating}★) by ${name}`,
    meta: { rating, name },
  });
}

/** Approved reviews for a product (newest first) — storefront. */
export async function getApprovedReviews(productId: string): Promise<Review[]> {
  const rows = await prisma.review.findMany({
    where: { productId, status: "approved" },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toReview);
}

/** Average rating + count from APPROVED reviews. */
async function getProductRating(productId: string): Promise<{ avg: number; count: number }> {
  const agg = await prisma.review.aggregate({
    where: { productId, status: "approved" },
    _avg: { rating: true },
    _count: true,
  });
  return { avg: agg._avg.rating ?? 0, count: agg._count };
}

/** Recent approved reviews across all products — homepage social proof. */
export async function getLatestApprovedReviews(
  limit = 3,
): Promise<(Review & { productName: string | null })[]> {
  const rows = await prisma.review.findMany({
    where: { status: "approved" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const ids = [...new Set(rows.map((r) => r.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  const nameById = new Map(products.map((p) => [p.id, p.name]));
  return rows.map((r) => ({ ...toReview(r), productName: nameById.get(r.productId) ?? null }));
}

/** Overall approved-review stats (homepage rating). */
export async function getOverallReviewStats(): Promise<{ avg: number; count: number }> {
  const agg = await prisma.review.aggregate({
    where: { status: "approved" },
    _avg: { rating: true },
    _count: true,
  });
  return { avg: agg._avg.rating ?? 0, count: agg._count };
}

/** Admin moderation: every review, pending first then newest, with product name. */
export async function getReviewsForAdmin(): Promise<(Review & { productName: string | null })[]> {
  const rows = await prisma.review.findMany({ orderBy: { createdAt: "desc" } });
  const ids = [...new Set(rows.map((r) => r.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  const nameById = new Map(products.map((p) => [p.id, p.name]));
  const rank = (s: string) => (s === "pending" ? 0 : s === "approved" ? 1 : 2);
  return rows
    .map((r) => ({ ...toReview(r), productName: nameById.get(r.productId) ?? null }))
    .sort((a, b) => rank(a.status) - rank(b.status));
}

export async function setReviewStatus(id: string, status: "approved" | "rejected"): Promise<void> {
  const r = await prisma.review.update({
    where: { id },
    data: { status },
    select: { productId: true },
  });
  // Keep the product's stored rating/count in sync with its approved reviews,
  // so the stars show correctly everywhere (shop grid, product page) automatically.
  const { avg, count } = await getProductRating(r.productId);
  await prisma.product.update({
    where: { id: r.productId },
    data: { rating: Math.round(avg * 10) / 10, reviewCount: count },
  });
}

/* ============================================================
   Activity log — audit trail / "everything that happened" feed
   ============================================================ */

export type ActivityEntry = {
  id: string;
  actor: string;
  action: string;
  entity: string | null;
  summary: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

/** Write one audit-trail entry. Never throws — logging must not break the flow. */
export async function logActivity(entry: {
  actor?: string;
  action: string;
  entity?: string;
  summary: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        actor: entry.actor ?? "system",
        action: entry.action,
        entity: entry.entity ?? null,
        summary: entry.summary,
        meta: (entry.meta as object) ?? undefined,
      },
    });
  } catch {
    /* swallow — the audit log is best-effort */
  }
  // Every logged activity reflects a change shown on the admin dashboard (a new/confirmed/
  // cancelled order, a call, a stock or expense change, …). Bust the cached dashboard data
  // so the next view recomputes. See getDashboardData. Best-effort: ignored if we're not
  // in a request scope that can revalidate (e.g. a background script).
  try {
    revalidateTag("dashboard", { expire: 0 });
  } catch {
    /* not in a revalidate-able context */
  }
}

export async function getRecentActivity(limit = 14): Promise<ActivityEntry[]> {
  const rows = await prisma.activityLog.findMany({
    where: { action: { notIn: ["order.call", "whatsapp.sent"] } }, // count-only events
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    actor: r.actor,
    action: r.action,
    entity: r.entity,
    summary: r.summary,
    meta: (r.meta as Record<string, unknown> | null) ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

/* ============================================================
   Clients CRM — real customer directory (keyed by phone)
   ============================================================ */

// Canonical Moroccan phone: digits only, +212 / 212 / leading-0 all collapse to 0XXXXXXXXX.
// No-op for already-local "0…" numbers (how checkout stores them), so existing rows are unaffected;
// it just additionally groups any "+212"-formatted order onto the same customer.
const normPhone = (p: string) => {
  let d = (p || "").replace(/\D/g, ""); // strip spaces, +, dashes, parens
  if (d.startsWith("00")) d = d.slice(2); // drop 00 international prefix
  if (d.startsWith("212")) d = d.slice(3); // drop Morocco country code
  if (d.startsWith("0")) d = d.slice(1); // drop trunk prefix
  return d ? "0" + d : ""; // re-add the single local 0
};

/** Create/refresh the CRM record for an order's customer. Best-effort. */
export async function upsertClientFromOrder(o: {
  phone: string;
  customerName: string;
  city: string;
  address: string;
  source: string;
  createdAt: Date;
  acquisitionSource?: string | null;
  whatsappOptIn?: boolean;
}): Promise<void> {
  const phone = normPhone(o.phone);
  try {
    await prisma.client.upsert({
      where: { phone },
      create: {
        phone,
        name: o.customerName,
        city: o.city,
        address: o.address,
        source: o.source === "phone" ? "phone" : "web",
        acquisitionSource: o.acquisitionSource ?? null,
        whatsappOptIn: o.whatsappOptIn ?? false,
        firstOrderAt: o.createdAt,
      },
      // refresh latest contact details + consent (never touch status/note/acquisitionSource)
      update: { name: o.customerName, city: o.city, address: o.address, ...(o.whatsappOptIn ? { whatsappOptIn: true } : {}) },
    });
  } catch {
    /* best-effort */
  }
}

export type ClientLifecycle = "lead" | "new" | "active" | "due" | "lost";

export type ClientRow = {
  id: string;
  phone: string;
  name: string;
  city: string;
  email: string | null;
  status: string;
  source: string;
  firstOrderAt: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  daysSinceLastOrder: number | null;
  installCount: number; // installed devices (status=installed, kind=install)
  nextMaintenanceAt: string | null; // soonest filter-change due date
  maintenanceDue: boolean; // a maintenance is due / overdue now
  lifecycle: ClientLifecycle;
  isVip: boolean;
  acquisitionSource: string | null; // marketing channel
  whatsappOptIn: boolean; // consented to WhatsApp/SMS marketing
  tags: string[];
};

type OrderAgg = { count: number; spent: number; last: Date | null };
type InstallAgg = { installCount: number; nextDue: Date | null };

const DAY_MS = 86_400_000;
const VIP_MIN_SPENT = 10_000; // MAD realized
const VIP_MIN_ORDERS = 4;
const NEW_DAYS = 45;
const LOST_OVERDUE_DAYS = 90; // maintenance overdue this long → treat as lost

/** Lifecycle for a filter + ~6-month-SAV business — driven by install + maintenance state, not purchase frequency. */
function lifecycleOf(realizedCount: number, installCount: number, nextDue: Date | null, firstOrderAt: Date): ClientLifecycle {
  if (realizedCount === 0) return "lead"; // registered / pending, no confirmed sale yet
  const ageDays = (Date.now() - firstOrderAt.getTime()) / DAY_MS;
  if (installCount === 0) return ageDays <= NEW_DAYS ? "new" : "active"; // bought, not yet installed
  if (nextDue) {
    const overdueDays = (Date.now() - nextDue.getTime()) / DAY_MS;
    if (overdueDays > LOST_OVERDUE_DAYS) return "lost"; // long overdue → likely lost the SAV
    if (overdueDays > 0) return "due"; // due / overdue → call for the filter change
  }
  return ageDays <= NEW_DAYS ? "new" : "active";
}

/** Per-phone installed-device count + soonest maintenance-due date. */
async function loadInstallData(): Promise<Map<string, InstallAgg>> {
  const rows = await prisma.order.groupBy({
    by: ["phone"],
    where: { status: "installed", kind: "install" },
    _count: { _all: true },
    _min: { nextMaintenanceAt: true },
  });
  const m = new Map<string, InstallAgg>();
  for (const r of rows) {
    const key = normPhone(r.phone);
    const cur = m.get(key) ?? { installCount: 0, nextDue: null };
    cur.installCount += r._count._all ?? 0;
    const nd = r._min.nextMaintenanceAt;
    if (nd && (!cur.nextDue || nd < cur.nextDue)) cur.nextDue = nd;
    m.set(key, cur);
  }
  return m;
}

/** Aggregate REALIZED purchases (confirmed/installed install orders, excluding free maintenance
 *  visits and cancelled/pending) per normalized phone — one DB-side groupBy, not a full table load. */
async function loadOrderAggregates(): Promise<Map<string, OrderAgg>> {
  const rows = await prisma.order.groupBy({
    by: ["phone"],
    where: { status: { in: SALE_STATUSES }, kind: "install" },
    _count: { _all: true },
    _sum: { total: true },
    _max: { createdAt: true },
  });
  const agg = new Map<string, OrderAgg>();
  for (const r of rows) {
    const key = normPhone(r.phone);
    const a = agg.get(key) ?? { count: 0, spent: 0, last: null };
    a.count += r._count._all ?? 0;
    a.spent += r._sum.total ?? 0;
    const last = r._max.createdAt;
    if (last && (!a.last || last > a.last)) a.last = last;
    agg.set(key, a);
  }
  return agg;
}

function rowFromClient(
  c: { id: string; phone: string; name: string; city: string; email: string | null; status: string; source: string; firstOrderAt: Date; tags: string[]; acquisitionSource: string | null; whatsappOptIn: boolean },
  a: OrderAgg,
  inst: InstallAgg,
): ClientRow {
  const daysSince = a.last ? Math.floor((Date.now() - a.last.getTime()) / DAY_MS) : null;
  return {
    id: c.id,
    phone: c.phone,
    name: c.name,
    city: c.city,
    email: c.email,
    status: c.status,
    source: c.source,
    firstOrderAt: c.firstOrderAt.toISOString(),
    orderCount: a.count,
    totalSpent: a.spent,
    lastOrderAt: a.last?.toISOString() ?? null,
    daysSinceLastOrder: daysSince,
    installCount: inst.installCount,
    nextMaintenanceAt: inst.nextDue?.toISOString() ?? null,
    maintenanceDue: inst.nextDue ? inst.nextDue.getTime() <= Date.now() : false,
    lifecycle: lifecycleOf(a.count, inst.installCount, inst.nextDue, c.firstOrderAt),
    isVip: a.spent >= VIP_MIN_SPENT || a.count >= VIP_MIN_ORDERS,
    acquisitionSource: c.acquisitionSource,
    whatsappOptIn: c.whatsappOptIn,
    tags: c.tags,
  };
}

/** Full client directory with live order aggregates + install/maintenance lifecycle (newest first). */
export async function getClientsList(): Promise<ClientRow[]> {
  const [clients, agg, inst] = await Promise.all([
    prisma.client.findMany({ orderBy: { firstOrderAt: "desc" } }),
    loadOrderAggregates(),
    loadInstallData(),
  ]);
  const EMPTY_AGG: OrderAgg = { count: 0, spent: 0, last: null };
  const EMPTY_INST: InstallAgg = { installCount: 0, nextDue: null };
  return clients.map((c) => rowFromClient(c, agg.get(c.phone) ?? EMPTY_AGG, inst.get(c.phone) ?? EMPTY_INST));
}

/** A single entry in a client's merged history feed (orders + maintenance + invoices + notes + reviews). */
export type ClientTimelineEvent = {
  id: string;
  type: "order" | "maintenance" | "invoice" | "note" | "review";
  date: string;
  title: string; // order id / facture ref / note body / review comment
  amount: number | null;
  status: string | null;
  href: string | null;
};

export type ClientNoteRow = { id: string; body: string; author: string; createdAt: string };

export type ClientDevice = {
  id: string;
  model: string;
  installedAt: string | null;
  warrantyUntil: string | null;
  nextMaintenanceAt: string | null;
  due: boolean;
};

export type ClientDetail = ClientRow & {
  address: string | null;
  note: string | null;
  avgBasket: number;
  orders: { id: string; total: number; status: string; createdAt: string }[];
  notes: ClientNoteRow[];
  devices: ClientDevice[];
  contact: { lastOutcome: string | null; callAttempts: number };
  timeline: ClientTimelineEvent[];
};

export async function getClientDetail(phone: string): Promise<ClientDetail | null> {
  const key = normPhone(phone);
  const c = await prisma.client.findUnique({ where: { phone: key } });
  if (!c) return null;
  const [orders, invoices, notes] = await Promise.all([
    prisma.order.findMany({
      where: { phone: key },
      orderBy: { createdAt: "desc" },
      select: { id: true, total: true, status: true, kind: true, createdAt: true, nextMaintenanceAt: true, items: true, completedAt: true, warrantyMonths: true, lastOutcome: true, callAttempts: true },
    }),
    prisma.invoice.findMany({
      where: { customerPhone: key },
      orderBy: { createdAt: "desc" },
      select: { id: true, ref: true, total: true, status: true, createdAt: true },
    }),
    prisma.clientNote.findMany({
      where: { clientPhone: key },
      orderBy: { createdAt: "desc" },
      select: { id: true, body: true, author: true, createdAt: true },
    }),
  ]);
  const purchases = orders.filter((o) => SALE_STATUSES.includes(o.status) && o.kind !== "maintenance");
  const totalSpent = purchases.reduce((s, o) => s + o.total, 0);
  const purchaseCount = purchases.length;
  const lastPurchase = purchases[0]?.createdAt ?? null; // orders are desc → first purchase is most recent
  const daysSince = lastPurchase ? Math.floor((Date.now() - lastPurchase.getTime()) / DAY_MS) : null;
  const installs = orders.filter((o) => o.status === "installed" && o.kind === "install");
  let nextDue: Date | null = null;
  for (const o of installs) if (o.nextMaintenanceAt && (!nextDue || o.nextMaintenanceAt < nextDue)) nextDue = o.nextMaintenanceAt;
  const devices = installs.map((o) => {
    const items = Array.isArray(o.items) ? (o.items as { name?: string }[]) : [];
    const model = items.map((i) => i?.name).filter(Boolean).join(", ") || "—";
    const warrantyUntil = o.completedAt ? addMonths(o.completedAt, o.warrantyMonths ?? 24) : null;
    return {
      id: o.id,
      model,
      installedAt: o.completedAt?.toISOString() ?? null,
      warrantyUntil: warrantyUntil?.toISOString() ?? null,
      nextMaintenanceAt: o.nextMaintenanceAt?.toISOString() ?? null,
      due: o.nextMaintenanceAt ? o.nextMaintenanceAt.getTime() <= Date.now() : false,
    };
  });
  const lastOutcome = orders.find((o) => o.lastOutcome)?.lastOutcome ?? null;
  const callAttempts = orders.reduce((s, o) => s + (o.callAttempts ?? 0), 0);

  const timeline: ClientTimelineEvent[] = [
    ...orders.map((o) => ({
      id: o.id,
      type: (o.kind === "maintenance" ? "maintenance" : "order") as "order" | "maintenance",
      date: o.createdAt.toISOString(),
      title: o.id,
      amount: o.total,
      status: o.status,
      href: `/admin/orders/${o.id}`,
    })),
    ...invoices.map((inv) => ({
      id: inv.id,
      type: "invoice" as const,
      date: inv.createdAt.toISOString(),
      title: inv.ref,
      amount: inv.total,
      status: inv.status,
      href: `/admin/factures/${inv.id}`,
    })),
    ...notes.map((n) => ({
      id: n.id,
      type: "note" as const,
      date: n.createdAt.toISOString(),
      title: n.body,
      amount: null,
      status: null,
      href: null,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    id: c.id,
    phone: c.phone,
    name: c.name,
    city: c.city,
    email: c.email,
    status: c.status,
    source: c.source,
    firstOrderAt: c.firstOrderAt.toISOString(),
    address: c.address,
    note: c.note,
    orderCount: purchaseCount,
    totalSpent,
    lastOrderAt: lastPurchase?.toISOString() ?? null,
    daysSinceLastOrder: daysSince,
    installCount: installs.length,
    nextMaintenanceAt: nextDue?.toISOString() ?? null,
    maintenanceDue: nextDue ? nextDue.getTime() <= Date.now() : false,
    lifecycle: lifecycleOf(purchaseCount, installs.length, nextDue, c.firstOrderAt),
    isVip: totalSpent >= VIP_MIN_SPENT || purchaseCount >= VIP_MIN_ORDERS,
    acquisitionSource: c.acquisitionSource,
    whatsappOptIn: c.whatsappOptIn,
    avgBasket: purchaseCount ? Math.round(totalSpent / purchaseCount) : 0,
    orders: orders.slice(0, 8).map((o) => ({
      id: o.id,
      total: o.total,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    })),
    tags: c.tags,
    notes: notes.map((n) => ({ id: n.id, body: n.body, author: n.author, createdAt: n.createdAt.toISOString() })),
    devices,
    contact: { lastOutcome, callAttempts },
    timeline,
  };
}

export type ClientSegments = {
  total: number;
  acheteurs: number; // clients with a realized purchase (orderCount > 0)
  installed: number; // clients with an installed device (installCount > 0)
  newThisMonth: number;
  revenue: number;
  // lifecycle chip counts (maintenance model)
  leads: number;
  newCount: number;
  active: number;
  due: number; // maintenance due / overdue — "à entretenir"
  lost: number;
  vip: number;
  consentCount: number; // clients opted in to WhatsApp/SMS
  byCity: { city: string; count: number }[];
  byChannel: { channel: string; count: number }[]; // acquisition source mix
  topSpenders: { name: string; phone: string; spent: number }[];
  newClients: { name: string; phone: string; firstOrderAt: string }[];
};

/** KPI + chart data for the Clients page header and bottom widgets.
 *  Pass an already-fetched list to avoid re-querying (the page fetches it once). */
export async function getClientSegments(list?: ClientRow[]): Promise<ClientSegments> {
  list = list ?? (await getClientsList());
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const total = list.length;
  const acheteurs = list.filter((c) => c.orderCount > 0).length;
  const installed = list.filter((c) => c.installCount > 0).length;
  const newThisMonth = list.filter((c) => new Date(c.firstOrderAt).getTime() >= startMonth).length;
  const revenue = list.reduce((s, c) => s + c.totalSpent, 0);

  const leads = list.filter((c) => c.lifecycle === "lead").length;
  const newCount = list.filter((c) => c.lifecycle === "new").length;
  const active = list.filter((c) => c.lifecycle === "active").length;
  const due = list.filter((c) => c.lifecycle === "due").length;
  const lost = list.filter((c) => c.lifecycle === "lost").length;
  const vip = list.filter((c) => c.isVip).length;
  const consentCount = list.filter((c) => c.whatsappOptIn).length;

  const channelMap = new Map<string, number>();
  for (const c of list) {
    const k = c.acquisitionSource || "__unknown__";
    channelMap.set(k, (channelMap.get(k) ?? 0) + 1);
  }
  const byChannel = [...channelMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([channel, count]) => ({ channel, count }));

  const cityMap = new Map<string, number>();
  for (const c of list) {
    const k = c.city || "—";
    cityMap.set(k, (cityMap.get(k) ?? 0) + 1);
  }
  const sortedCities = [...cityMap.entries()].sort((a, b) => b[1] - a[1]);
  const top4 = sortedCities.slice(0, 4).map(([city, count]) => ({ city, count }));
  const rest = sortedCities.slice(4).reduce((s, [, n]) => s + n, 0);
  const byCity = rest > 0 ? [...top4, { city: "__other__", count: rest }] : top4;

  const topSpenders = [...list]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5)
    .map((c) => ({ name: c.name, phone: c.phone, spent: c.totalSpent }));
  const newClients = [...list]
    .sort((a, b) => new Date(b.firstOrderAt).getTime() - new Date(a.firstOrderAt).getTime())
    .slice(0, 6)
    .map((c) => ({ name: c.name, phone: c.phone, firstOrderAt: c.firstOrderAt }));

  return {
    total,
    acheteurs,
    installed,
    newThisMonth,
    revenue,
    leads,
    newCount,
    active,
    due,
    lost,
    vip,
    consentCount,
    byCity,
    byChannel,
    topSpenders,
    newClients,
  };
}

export async function setClientStatus(phone: string, status: "active" | "inactive"): Promise<void> {
  await prisma.client.update({ where: { phone: normPhone(phone) }, data: { status } });
}

export async function updateClient(
  phone: string,
  data: { name?: string; city?: string; email?: string | null; address?: string | null; note?: string | null },
): Promise<void> {
  await prisma.client.update({ where: { phone: normPhone(phone) }, data });
}

/** Manually create a client / lead — used by the admin "New client" form. */
export async function createClient(data: {
  phone: string;
  name: string;
  city?: string;
  email?: string | null;
  address?: string | null;
  note?: string | null;
}): Promise<{ ok: true; phone: string } | { ok: false; error: string }> {
  const phone = normPhone(data.phone);
  if (!/^0[5-7]\d{8}$/.test(phone)) return { ok: false, error: "INVALID_PHONE" }; // same shape as order phones, so it dedupes/aggregates
  const existing = await prisma.client.findUnique({ where: { phone } });
  if (existing) return { ok: false, error: "EXISTS" };
  await prisma.client.create({
    data: {
      phone,
      name: data.name.trim(),
      city: data.city?.trim() ?? "",
      email: data.email?.trim() || null,
      address: data.address?.trim() || null,
      note: data.note?.trim() || null,
      source: "phone",
      firstOrderAt: new Date(),
    },
  });
  return { ok: true, phone };
}

/** Append a timestamped note to a client's activity log. */
export async function addClientNote(phone: string, body: string, author: string): Promise<ClientNoteRow> {
  const n = await prisma.clientNote.create({
    data: { clientPhone: normPhone(phone), body: body.trim(), author },
  });
  return { id: n.id, body: n.body, author: n.author, createdAt: n.createdAt.toISOString() };
}

/** Replace a client's tag set (deduped, trimmed, capped). */
export async function setClientTags(phone: string, tags: string[]): Promise<string[]> {
  const clean = [...new Set(tags.map((t) => t.trim()).filter(Boolean))].slice(0, 12);
  await prisma.client.update({ where: { phone: normPhone(phone) }, data: { tags: clean } });
  return clean;
}

/** Resolve a client's full detail by id (for the deep-link /admin/clients/[id] page). */
export async function getClientDetailById(id: string): Promise<ClientDetail | null> {
  const c = await prisma.client.findUnique({ where: { id }, select: { phone: true } });
  if (!c) return null;
  return getClientDetail(c.phone);
}

/* ============================================================
   Dashboard overview — real operational + business metrics
   ============================================================ */

/** Month-over-month % change (null when there's no prior value to compare). */
function momPct(cur: number, prev: number): number | null {
  return prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
}

export type DashboardOverview = {
  totalOrders: number;
  byStatus: Record<string, number>;
  newOrdersToday: number;
  pending: number;
  installationsToday: number;
  savDue: number;
  ordersThisMonth: number;
  ordersMoMPct: number | null;
  revenueThisMonth: number;
  revenueMoMPct: number | null;
  revenueTotal: number;
  stockTotal: number;
  lowStockCount: number;
  activeClients: number;
  installedDevices: number;
  technicians: number;
};

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const savHorizon = new Date(now.getTime() + 14 * 86_400_000);

  const [
    newOrdersToday,
    grouped,
    installationsToday,
    ordersThisMonth,
    ordersLastMonth,
    saleThisMonth,
    saleLastMonth,
    saleAll,
    stockAgg,
    lowStockCount,
    activeClients,
    installedDevices,
    technicians,
    savDue,
  ] = await prisma.$transaction([
    prisma.order.count({ where: { createdAt: { gte: startToday } } }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { status: "asc" } }),
    prisma.order.count({ where: { kind: "install", installDate: { gte: startToday, lt: endToday } } }),
    prisma.order.count({ where: { createdAt: { gte: startMonth } } }),
    prisma.order.count({ where: { createdAt: { gte: startLastMonth, lt: startMonth } } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { in: SALE_STATUSES }, createdAt: { gte: startMonth } } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { in: SALE_STATUSES }, createdAt: { gte: startLastMonth, lt: startMonth } } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { in: SALE_STATUSES } } }),
    prisma.product.aggregate({ _sum: { stock: true } }),
    prisma.product.count({ where: { stock: { lte: 5 } } }),
    prisma.client.count({ where: { status: "active" } }),
    prisma.order.count({ where: { status: "installed" } }),
    prisma.adminUser.count({ where: { role: "plombier" } }),
    prisma.order.count({ where: { status: "installed", kind: "install", nextMaintenanceAt: { lte: savHorizon } } }),
  ]);

  const byStatus: Record<string, number> = {};
  let totalOrders = 0;
  for (const g of grouped) {
    // _count is { _all: number } at runtime; $transaction() widens its type, so read it defensively.
    const count = typeof g._count === "object" ? g._count._all ?? 0 : 0;
    byStatus[g.status] = count;
    totalOrders += count;
  }

  const revenueThisMonth = saleThisMonth._sum.total ?? 0;
  const revenueLastMonth = saleLastMonth._sum.total ?? 0;

  return {
    totalOrders,
    byStatus,
    newOrdersToday,
    pending: byStatus["pending"] ?? 0,
    installationsToday,
    savDue,
    ordersThisMonth,
    ordersMoMPct: momPct(ordersThisMonth, ordersLastMonth),
    revenueThisMonth,
    revenueMoMPct: momPct(revenueThisMonth, revenueLastMonth),
    revenueTotal: saleAll._sum.total ?? 0,
    stockTotal: stockAgg._sum.stock ?? 0,
    lowStockCount,
    activeClients,
    installedDevices,
    technicians,
  };
}

/**
 * The whole admin dashboard's data, fetched once and CACHED (Next.js Data Cache).
 *
 * Why: the dashboard reads ~40 aggregates from the DB. Recomputing them on every
 * page view exhausted the connection pool. This caches the full result for 60s, so
 * repeat loads hit zero queries; on a cache miss it loads everything once. The cache
 * is busted instantly by `revalidateTag("dashboard")`, which the write actions call
 * whenever orders / stock / expenses / etc. change — so the data stays accurate.
 *
 * The today's-snapshot write and the "pin today's point to live values" step live
 * inside here on purpose: they then run on a cache miss only (~once a minute), not on
 * every page paint.
 */
export const getDashboardData = unstable_cache(
  async () => {
    const [
      overview,
      conf,
      techPerf,
      confPerf,
      activity,
      salesSeries,
      dailyExpenses,
      orderActivity,
      metricSeries,
      lowStock,
      topSellers,
      allOrders,
      finance,
      upcomingJobs,
      invoiceableOrders,
      recentInvoices,
    ] = await Promise.all([
      getDashboardOverview(),
      getConfirmationToday(),
      getTechnicianPerformance(),
      getConfirmateurPerformance(),
      getRecentActivity(12),
      getSalesSeries(),
      getDailyExpenses(),
      getOrderActivitySeries(),
      getMetricSnapshots(),
      getLowStockProducts(5, 6),
      getTopSellers(5),
      getOrders(),
      getFinanceSummary(),
      getUpcomingJobs(7),
      getInvoiceableOrders(5),
      getRecentInvoices(5),
    ]);

    // Persist today's point-in-time metrics so the snapshot cards build real history.
    try {
      await recordTodaySnapshot({
        stockTotal: overview.stockTotal,
        lowStockCount: overview.lowStockCount,
        pending: overview.pending,
        savDue: overview.savDue,
        activeClients: overview.activeClients,
        installedDevices: overview.installedDevices,
        technicians: overview.technicians,
      });
    } catch {}
    // Today's point is always the live value (correct even before any snapshot existed).
    metricSeries.stockTotal[29] = overview.stockTotal;
    metricSeries.lowStockCount[29] = overview.lowStockCount;
    metricSeries.pending[29] = overview.pending;
    metricSeries.savDue[29] = overview.savDue;

    return {
      overview,
      conf,
      techPerf,
      confPerf,
      activity,
      salesSeries,
      dailyExpenses,
      orderActivity,
      metricSeries,
      lowStock,
      topSellers,
      allOrders,
      finance,
      upcomingJobs,
      invoiceableOrders,
      recentInvoices,
    };
  },
  ["admin-dashboard-v2"],
  { tags: ["dashboard"], revalidate: 60 },
);

export type ConfirmationToday = {
  // Today's received breakdown
  received: number;
  confirmed: number;
  cancelled: number;
  noAnswer: number;
  callback: number;
  untreated: number;
  rate: number;
  // Remaining actionable queue — ALL pending orders (any date): the confirmateur's to-do list
  toCall: number; // never called yet
  toCallback: number; // marked "rappeler"
  noReply: number; // last call got no answer ("pas_reponse")
  totalRemaining: number;
};

/** Today's confirmation-call breakdown + the remaining actionable queue (all pending orders). */
export async function getConfirmationToday(): Promise<ConfirmationToday> {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [orders, pending] = await prisma.$transaction([
    prisma.order.findMany({
      where: { createdAt: { gte: startToday } },
      select: { status: true, lastOutcome: true },
    }),
    prisma.order.findMany({
      where: { status: "pending" },
      select: { lastOutcome: true },
    }),
  ]);

  const received = orders.length;
  const confirmed = orders.filter(
    (o) => o.status === "confirmed" || o.status === "installed" || o.lastOutcome === "confirmed",
  ).length;
  const cancelled = orders.filter((o) => o.status === "cancelled" || o.lastOutcome === "cancelled").length;
  const noAnswer = orders.filter((o) => o.lastOutcome === "pas_reponse").length;
  const callback = orders.filter((o) => o.lastOutcome === "rappeler").length;
  const untreated = orders.filter((o) => o.status === "pending" && !o.lastOutcome).length;

  // Remaining work — every pending order regardless of date, split by what action it needs.
  const toCall = pending.filter((o) => !o.lastOutcome).length;
  const toCallback = pending.filter((o) => o.lastOutcome === "rappeler").length;
  const noReply = pending.filter((o) => o.lastOutcome === "pas_reponse").length;

  return {
    received,
    confirmed,
    cancelled,
    noAnswer,
    callback,
    untreated,
    rate: received ? Math.round((confirmed / received) * 100) : 0,
    toCall,
    toCallback,
    noReply,
    totalRemaining: pending.length,
  };
}

export type TechPerf = {
  email: string;
  name: string;
  installs: number;
  sav: number;
  revenue: number;
  commission: number;
};

/** Per-technician performance from completed jobs (real). */
export async function getTechnicianPerformance(): Promise<TechPerf[]> {
  const [plombiers, completed] = await prisma.$transaction([
    prisma.adminUser.findMany({
      where: { role: "plombier" },
      select: { email: true, name: true, commissionPerInstall: true },
    }),
    prisma.order.findMany({
      where: { assignedTo: { not: null }, completedAt: { not: null } },
      select: { assignedTo: true, total: true, kind: true },
    }),
  ]);
  const stats = new Map<string, { installs: number; sav: number; revenue: number }>();
  for (const o of completed) {
    const k = o.assignedTo!;
    const s = stats.get(k) ?? { installs: 0, sav: 0, revenue: 0 };
    if (o.kind === "maintenance") s.sav += 1;
    else {
      s.installs += 1;
      s.revenue += o.total;
    }
    stats.set(k, s);
  }
  return plombiers
    .map((p) => {
      const s = stats.get(p.email) ?? { installs: 0, sav: 0, revenue: 0 };
      return {
        email: p.email,
        name: p.name ?? p.email,
        ...s,
        commission: s.installs * p.commissionPerInstall,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

/* ============================================================
   Expenses (Charges) + Finance (Profit = sales − expenses)
   ============================================================ */

export type ExpenseRow = {
  id: string;
  label: string;
  category: string;
  amount: number;
  note: string | null;
  date: string;
};

export async function getExpenses(limit = 200): Promise<ExpenseRow[]> {
  const rows = await prisma.expense.findMany({ orderBy: { date: "desc" }, take: limit });
  return rows.map((e) => ({
    id: e.id,
    label: e.label,
    category: e.category,
    amount: e.amount,
    note: e.note,
    date: e.date.toISOString(),
  }));
}

export async function createExpense(data: {
  label: string;
  category: string;
  amount: number;
  note?: string;
  date?: string;
}): Promise<void> {
  const label = (data.label ?? "").trim();
  const amount = Math.round(Number(data.amount));
  if (label.length < 2 || label.length > 80) throw new Error("INVALID_LABEL");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("INVALID_AMOUNT");
  await prisma.expense.create({
    data: {
      label,
      category: data.category || "other",
      amount,
      note: data.note?.trim() || null,
      date: data.date ? new Date(data.date) : new Date(),
    },
  });
}

export async function deleteExpense(id: string): Promise<void> {
  await prisma.expense.delete({ where: { id } });
}

export type FinanceSummary = {
  revenueMonth: number;
  expensesMonth: number;
  profitMonth: number;
  revenueYear: number;
  expensesYear: number;
  profitYear: number;
  expensesMoMPct: number | null;
  profitMoMPct: number | null;
  byCategory: { category: string; amount: number }[];
};

export async function getFinanceSummary(): Promise<FinanceSummary> {
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startYear = new Date(now.getFullYear(), 0, 1);

  const [revM, revLM, revY, expMRows, expLM, expY] = await prisma.$transaction([
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { in: SALE_STATUSES }, createdAt: { gte: startMonth } } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { in: SALE_STATUSES }, createdAt: { gte: startLastMonth, lt: startMonth } } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { in: SALE_STATUSES }, createdAt: { gte: startYear } } }),
    prisma.expense.findMany({ where: { date: { gte: startMonth } }, select: { amount: true, category: true } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: startLastMonth, lt: startMonth } } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: startYear } } }),
  ]);

  const revenueMonth = revM._sum.total ?? 0;
  const revenueLastMonth = revLM._sum.total ?? 0;
  const revenueYear = revY._sum.total ?? 0;
  const expensesMonth = expMRows.reduce((s, e) => s + e.amount, 0);
  const expensesLastMonth = expLM._sum.amount ?? 0;
  const expensesYear = expY._sum.amount ?? 0;
  const profitMonth = revenueMonth - expensesMonth;
  const profitLastMonth = revenueLastMonth - expensesLastMonth;


  const catMap = new Map<string, number>();
  for (const e of expMRows) catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount);
  const byCategory = [...catMap.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    revenueMonth,
    expensesMonth,
    profitMonth,
    revenueYear,
    expensesYear,
    profitYear: revenueYear - expensesYear,
    expensesMoMPct: momPct(expensesMonth, expensesLastMonth),
    profitMoMPct: momPct(profitMonth, profitLastMonth),
    byCategory,
  };
}

/* ---------- Profit & Loss (true net profit) ----------
   Revenue counts ONLY realized (installed) sales, bucketed by install date.
   Gross profit = revenue − technician commission (per install).
   Net profit  = gross − confirmateur (fixed monthly) − operating expenses. */

export type PnLLine = {
  revenue: number;
  cogs: number; // product purchase cost of realized sales
  techCommission: number;
  grossProfit: number;
  confirmateur: number;
  opex: number;
  netProfit: number;
};

export type CommissionLine = { name: string; installs: number; rate: number; total: number };

export type FinancePnL = {
  month: PnLLine;
  lastMonth: PnLLine;
  year: PnLLine;
  pipeline: number; // confirmed, not yet installed (not counted as profit)
  confirmateurMonthly: number;
  byCategoryMonth: { category: string; amount: number }[];
  commissionsMonth: CommissionLine[];
};

export async function getFinancePnL(): Promise<FinancePnL> {
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startYear = new Date(now.getFullYear(), 0, 1);
  const monthsElapsed = now.getMonth() + 1;

  const settings = await getSettings();
  const confMonthly = settings.confirmateurMonthly;

  const plombiers = await withDbRetry(() =>
    prisma.adminUser.findMany({ where: { role: "plombier" }, select: { email: true, name: true, commissionPerInstall: true } }),
  );

  const products = await withDbRetry(() => prisma.product.findMany({ select: { id: true, cost: true } }));
  const costById = new Map(products.map((p) => [p.id, p.cost]));

  // COGS = product purchase cost of realized (installed) sales in the period.
  async function cogs(start: Date, end?: Date): Promise<number> {
    const orders = await withDbRetry(() =>
      prisma.order.findMany({
        where: { status: "installed", kind: "install", completedAt: { gte: start, ...(end ? { lt: end } : {}) } },
        select: { items: true },
      }),
    );
    let sum = 0;
    for (const o of orders) {
      const items = (o.items as unknown as { productId?: string; qty?: number }[]) ?? [];
      for (const it of items) {
        const c = it.productId ? costById.get(it.productId) ?? 0 : 0;
        sum += c * (it.qty ?? 0);
      }
    }
    return sum;
  }

  async function revenue(start: Date, end?: Date): Promise<number> {
    const r = await withDbRetry(() =>
      prisma.order.aggregate({ _sum: { total: true }, where: { status: "installed", kind: "install", completedAt: { gte: start, ...(end ? { lt: end } : {}) } } }),
    );
    return r._sum.total ?? 0;
  }

  async function commissions(start: Date, end?: Date): Promise<{ lines: CommissionLine[]; total: number }> {
    const rows = await withDbRetry(() =>
      prisma.order.findMany({
        where: { status: "installed", assignedTo: { not: null }, kind: "install", completedAt: { gte: start, ...(end ? { lt: end } : {}) } },
        select: { assignedTo: true },
      }),
    );
    const byTech = new Map<string, number>();
    for (const o of rows) if (o.assignedTo) byTech.set(o.assignedTo, (byTech.get(o.assignedTo) ?? 0) + 1);
    const lines = plombiers
      .map((p) => {
        const installs = byTech.get(p.email) ?? 0;
        return { name: p.name ?? p.email, installs, rate: p.commissionPerInstall, total: installs * p.commissionPerInstall };
      })
      .filter((l) => l.installs > 0)
      .sort((a, b) => b.total - a.total);
    return { lines, total: lines.reduce((s, l) => s + l.total, 0) };
  }

  async function opex(start: Date, end?: Date): Promise<number> {
    const r = await withDbRetry(() =>
      prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: start, ...(end ? { lt: end } : {}) } } }),
    );
    return r._sum.amount ?? 0;
  }

  function pnl(rev: number, cogsV: number, comm: number, conf: number, op: number): PnLLine {
    const grossProfit = rev - cogsV - comm;
    return { revenue: rev, cogs: cogsV, techCommission: comm, grossProfit, confirmateur: conf, opex: op, netProfit: grossProfit - conf - op };
  }

  const [revM, revLM, revY] = await Promise.all([revenue(startMonth), revenue(startLastMonth, startMonth), revenue(startYear)]);
  const [cogsM, cogsLM, cogsY] = await Promise.all([cogs(startMonth), cogs(startLastMonth, startMonth), cogs(startYear)]);
  const [commM, commLM, commY] = await Promise.all([commissions(startMonth), commissions(startLastMonth, startMonth), commissions(startYear)]);
  const [opM, opLM, opY] = await Promise.all([opex(startMonth), opex(startLastMonth, startMonth), opex(startYear)]);

  const pipeAgg = await withDbRetry(() => prisma.order.aggregate({ _sum: { total: true }, where: { status: "confirmed" } }));
  const pipeline = pipeAgg._sum.total ?? 0;

  const expRows = await withDbRetry(() =>
    prisma.expense.findMany({ where: { date: { gte: startMonth } }, select: { amount: true, category: true } }),
  );
  const catMap = new Map<string, number>();
  for (const e of expRows) catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount);
  const byCategoryMonth = [...catMap.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);

  return {
    month: pnl(revM, cogsM, commM.total, confMonthly, opM),
    lastMonth: pnl(revLM, cogsLM, commLM.total, confMonthly, opLM),
    year: pnl(revY, cogsY, commY.total, confMonthly * monthsElapsed, opY),
    pipeline,
    confirmateurMonthly: confMonthly,
    byCategoryMonth,
    commissionsMonth: commM.lines,
  };
}

export async function setConfirmateurMonthly(amount: number): Promise<void> {
  if (!Number.isFinite(amount)) throw new Error("Invalid amount");
  const v = Math.max(0, Math.round(amount));
  await withDbRetry(() => updateSettings({ confirmateurMonthly: v }));
}

/* ============================================================
   Stock (inventory) — you hold the stock
   ============================================================ */

export type StockRow = {
  id: string;
  name: string;
  categorySlug: string;
  stock: number;
  reorderPoint: number;
  price: number;
  value: number;
  allowBackorder: boolean;
  image?: string;
  hue: number;
};

export async function getStockList(): Promise<StockRow[]> {
  const rows = await withDbRetry(() =>
    prisma.product.findMany({
      orderBy: { stock: "asc" },
      select: { id: true, name: true, categorySlug: true, stock: true, reorderPoint: true, price: true, allowBackorder: true, images: true, hue: true },
    }),
  );
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    categorySlug: p.categorySlug,
    stock: p.stock,
    reorderPoint: p.reorderPoint,
    price: p.price,
    value: p.stock * p.price,
    allowBackorder: p.allowBackorder,
    image: p.images[0],
    hue: p.hue,
  }));
}

export type StockSummary = {
  totalUnits: number;
  totalValue: number;
  reorderCount: number; // at or below reorder point (excludes backorder-friendly)
  outCount: number; // at 0 (excludes backorder-friendly)
  skuCount: number;
};

export async function getStockSummary(): Promise<StockSummary> {
  const rows = await withDbRetry(() =>
    prisma.product.findMany({ select: { stock: true, price: true, reorderPoint: true, allowBackorder: true } }),
  );
  return {
    totalUnits: rows.reduce((s, p) => s + p.stock, 0),
    totalValue: rows.reduce((s, p) => s + p.stock * p.price, 0),
    reorderCount: rows.filter((p) => p.stock <= p.reorderPoint && !p.allowBackorder).length,
    outCount: rows.filter((p) => p.stock <= 0 && !p.allowBackorder).length,
    skuCount: rows.length,
  };
}

/* --- Stock mutations: every change writes a StockMovement (audit log) --- */

export const STOCK_REASONS = ["received", "return", "damaged", "correction"] as const;
export type StockReason = (typeof STOCK_REASONS)[number];

export type StockMovementRow = {
  id: string;
  delta: number;
  before: number;
  after: number;
  reason: string;
  note: string | null;
  actor: string | null;
  createdAt: string;
};

/** Core: atomically change a product's stock and log the movement. */
async function applyStockChange(
  id: string,
  reason: string,
  nextStock: (before: number) => number,
  note: string | undefined,
  actor: string | undefined,
): Promise<{ before: number; after: number }> {
  return withDbRetry(() =>
    prisma.$transaction(async (tx) => {
      const p = await tx.product.findUnique({ where: { id }, select: { stock: true } });
      if (!p) throw new Error("Product not found");
      const before = p.stock;
      const raw = nextStock(before);
      if (!Number.isFinite(raw)) throw new Error("Invalid stock value");
      const after = Math.max(0, Math.round(raw));
      const delta = after - before;
      await tx.product.update({ where: { id }, data: { stock: after, inStock: after > 0 } });
      await tx.stockMovement.create({
        data: { productId: id, delta, before, after, reason, note: note?.trim() || null, actor: actor || null },
      });
      return { before, after };
    }),
  );
}

/** Admin adjustment: received/return add, damaged removes, correction sets the exact total. */
export async function applyStockAdjustment(
  id: string,
  reason: StockReason,
  qty: number,
  note: string | undefined,
  actor: string,
): Promise<{ before: number; after: number }> {
  if (!Number.isFinite(qty)) throw new Error("Invalid quantity");
  const q = Math.abs(Math.round(qty));
  const nextStock =
    reason === "correction"
      ? () => q
      : reason === "damaged"
        ? (b: number) => b - q
        : (b: number) => b + q; // received | return
  return applyStockChange(id, reason, nextStock, note, actor);
}

export async function setReorderPoint(id: string, value: number): Promise<void> {
  if (!Number.isFinite(value)) throw new Error("Invalid reorder point");
  const v = Math.max(0, Math.round(value));
  await withDbRetry(() => prisma.product.update({ where: { id }, data: { reorderPoint: v } }));
}

export async function getStockMovements(productId: string, limit = 30): Promise<StockMovementRow[]> {
  const rows = await withDbRetry(() =>
    prisma.stockMovement.findMany({ where: { productId }, orderBy: { createdAt: "desc" }, take: limit }),
  );
  return rows.map((m) => ({
    id: m.id,
    delta: m.delta,
    before: m.before,
    after: m.after,
    reason: m.reason,
    note: m.note,
    actor: m.actor,
    createdAt: m.createdAt.toISOString(),
  }));
}

export type ConfirmateurPerf = {
  email: string;
  name: string;
  handled: number;
  confirmed: number;
  cancelled: number;
  calls: number;
  whatsapp: number;
  rate: number;
  revenue: number;
};

/** Per-confirmateur performance: orders confirmed/cancelled + calls & WhatsApp logged. */
export async function getConfirmateurPerformance(): Promise<ConfirmateurPerf[]> {
  const [staff, orders, callLog, waLog] = await Promise.all([
    prisma.adminUser.findMany({
      where: { role: { in: ["confirmateur", "admin"] } },
      select: { email: true, name: true },
    }),
    prisma.order.findMany({
      where: { confirmedBy: { not: null } },
      select: { confirmedBy: true, status: true, total: true },
    }),
    prisma.activityLog.groupBy({
      by: ["actor"],
      where: { action: { in: ["order.confirmed", "order.cancelled", "order.call"] } },
      _count: { _all: true },
    }),
    prisma.activityLog.groupBy({
      by: ["actor"],
      where: { action: "whatsapp.sent" },
      _count: { _all: true },
    }),
  ]);
  const stats = new Map<string, { confirmed: number; cancelled: number; revenue: number }>();
  for (const o of orders) {
    const k = o.confirmedBy!;
    const s = stats.get(k) ?? { confirmed: 0, cancelled: 0, revenue: 0 };
    if (o.status === "cancelled") {
      s.cancelled += 1;
    } else {
      s.confirmed += 1;
      if (SALE_STATUSES.includes(o.status)) s.revenue += o.total;
    }
    stats.set(k, s);
  }
  const calls = new Map(callLog.map((r) => [r.actor, r._count._all]));
  const wa = new Map(waLog.map((r) => [r.actor, r._count._all]));
  const nameByEmail = new Map(staff.map((u) => [u.email, u.name ?? u.email]));
  const emails = new Set<string>([...stats.keys(), ...calls.keys(), ...wa.keys()]);
  return [...emails]
    .map((email) => {
      const s = stats.get(email) ?? { confirmed: 0, cancelled: 0, revenue: 0 };
      const handled = s.confirmed + s.cancelled;
      return {
        email,
        name: nameByEmail.get(email) ?? email,
        handled,
        confirmed: s.confirmed,
        cancelled: s.cancelled,
        calls: calls.get(email) ?? 0,
        whatsapp: wa.get(email) ?? 0,
        rate: handled ? Math.round((s.confirmed / handled) * 100) : 0,
        revenue: s.revenue,
      };
    })
    .sort((a, b) => b.confirmed - a.confirmed);
}

/** Technicians with their commission rate (for the Techniciens page). */
export async function getTechnicians(): Promise<
  { id: string; email: string; name: string | null; city: string | null; commissionPerInstall: number }[]
> {
  return prisma.adminUser.findMany({
    where: { role: "plombier" },
    select: { id: true, email: true, name: true, city: true, commissionPerInstall: true },
    orderBy: { name: "asc" },
  });
}

export async function setTechnicianCommission(id: string, commissionPerInstall: number): Promise<void> {
  await prisma.adminUser.update({
    where: { id },
    data: { commissionPerInstall: Math.max(0, Math.round(commissionPerInstall)) },
  });
}

/* ============================================================
   Factures (customer receipts) — no TVA, snapshot-at-issue
   ============================================================ */

export type InvoiceItem = { name: string; qty: number; price: number; total: number };

export type Invoice = {
  id: string;
  number: number;
  ref: string;
  orderId: string | null;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: "issued" | "cancelled";
  note: string | null;
  issuedBy: string | null;
  createdAt: string;
};

type IRow = {
  id: string;
  number: number;
  ref: string;
  orderId: string | null;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string;
  items: unknown;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  note: string | null;
  issuedBy: string | null;
  createdAt: Date;
};

function toInvoice(row: IRow): Invoice {
  return {
    id: row.id,
    number: row.number,
    ref: row.ref,
    orderId: row.orderId,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerCity: row.customerCity,
    customerAddress: row.customerAddress,
    items: (row.items as InvoiceItem[]) ?? [],
    subtotal: row.subtotal,
    deliveryFee: row.deliveryFee,
    total: row.total,
    status: (row.status as "issued" | "cancelled") ?? "issued",
    note: row.note ?? null,
    issuedBy: row.issuedBy ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Generate (or return the existing) facture for an order. Idempotent: one facture per
 * order (DB-enforced via Invoice.orderId @unique). Data is snapshot at issue time, so
 * later order edits never alter an issued facture. The invoice number comes from an
 * atomic counter for gap-free sequential numbering.
 */
export async function createInvoiceFromOrder(orderId: string, issuedBy?: string | null): Promise<Invoice> {
  const existing = await prisma.invoice.findUnique({ where: { orderId } });
  if (existing) return toInvoice(existing);

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("ORDER_NOT_FOUND");

  const orderItems = (order.items as unknown as OrderItem[]) ?? [];
  const items: InvoiceItem[] = orderItems.map((it) => ({
    name: it.variantLabel ? `${it.name} (${it.variantLabel})` : it.name,
    qty: it.qty,
    price: it.price,
    total: it.qty * it.price,
  }));
  const subtotal = items.reduce((s, it) => s + it.total, 0);
  const total = order.total;
  const deliveryFee = Math.max(0, total - subtotal);

  // Don't mint a meaningless / inconsistent receipt (and don't burn a sequential
  // number doing it): an order must have line items and a total that covers them.
  if (items.length === 0) throw new Error("NO_ITEMS");
  if (total < subtotal) throw new Error("INVALID_TOTAL");

  try {
    return await prisma.$transaction(async (tx) => {
      const counter = await tx.invoiceCounter.upsert({
        where: { id: "default" },
        create: { id: "default", next: 1 },
        update: { next: { increment: 1 } },
      });
      const number = counter.next;
      const ref = `FAC-${String(number).padStart(5, "0")}`;
      const created = await tx.invoice.create({
        data: {
          number,
          ref,
          orderId: order.id,
          customerName: order.customerName,
          customerPhone: order.phone,
          customerCity: order.city,
          customerAddress: order.address,
          items: items as unknown as object,
          subtotal,
          deliveryFee,
          total,
          issuedBy: issuedBy ?? null,
        },
      });
      return toInvoice(created);
    });
  } catch (e) {
    // Lost a race on the unique orderId — return the facture the other call created.
    const raced = await prisma.invoice.findUnique({ where: { orderId } });
    if (raced) return toInvoice(raced);
    throw e;
  }
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const row = await prisma.invoice.findUnique({ where: { id } });
  return row ? toInvoice(row) : null;
}

export async function getInvoiceByOrderId(orderId: string): Promise<Invoice | null> {
  const row = await prisma.invoice.findUnique({ where: { orderId } });
  return row ? toInvoice(row) : null;
}

export async function getRecentInvoices(limit = 5): Promise<Invoice[]> {
  const rows = await prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  return rows.map(toInvoice);
}

export async function getInvoices(): Promise<Invoice[]> {
  const rows = await prisma.invoice.findMany({ orderBy: { number: "desc" } });
  return rows.map(toInvoice);
}

/**
 * Recent install orders (confirmed/installed) that don't have a facture yet — ready to
 * invoice. Maintenance visits (kind "maintenance", total 0) are excluded: they're not a
 * sale. The already-invoiced exclusion is pushed into the query so there's no blind
 * window — older un-invoiced orders still surface.
 */
export async function getInvoiceableOrders(limit = 6): Promise<Order[]> {
  const invoiced = await prisma.invoice.findMany({
    where: { orderId: { not: null } },
    select: { orderId: true },
  });
  const invoicedIds = invoiced
    .map((i) => i.orderId)
    .filter((x): x is string => x !== null);

  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["confirmed", "installed"] },
      kind: "install",
      ...(invoicedIds.length ? { id: { notIn: invoicedIds } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return orders.map(toOrder);
}
