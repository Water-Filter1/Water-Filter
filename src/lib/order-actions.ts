"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  createOrder,
  updateOrderStatus,
  confirmOrder,
  getPlombierEmail,
  getOrderById,
  completeInstallation,
  setJobStage,
  createMaintenanceVisit,
  setMaintenanceInterval,
  markMaintenanceDone,
  createInvoiceFromOrder,
  logActivity,
} from "@/lib/data";
import { uploadProductImage } from "@/lib/storage";
import {
  notifyNewOrder,
  notifyPlombierAssignment,
  notifyOrderConfirmed,
  notifyOrderInstalled,
} from "@/lib/notify";
import { rateLimit, ipFrom } from "@/lib/rate-limit";
import type { OrderItem } from "@/lib/types";

/** Resolves the caller's session + effective role and checks it's allowed. */
async function requireStaff(roles: string[]) {
  const session = await getSession();
  if (!session) throw new Error("Non autorisé");
  // Fall back to the DB role for sessions issued before roles existed.
  let role = session.role;
  if (!role) {
    const u = await prisma.adminUser.findUnique({
      where: { id: session.sub },
      select: { role: true },
    });
    role = u?.role;
  }
  if (!role || !roles.includes(role)) throw new Error("Non autorisé");
  return { session, role };
}

/** Public: place an order at checkout (cash on delivery). */
export async function createOrderAction(payload: {
  customerName: string;
  phone: string;
  city: string;
  address: string;
  note?: string;
  items: { productId: string; qty: number; variantLabel?: string }[];
  hp?: string; // honeypot — must stay empty (bots fill it)
}): Promise<
  | { ok: true; id: string; total: number; delivery: number; items: OrderItem[] }
  | { ok: false; error: string }
> {
  // Bot trap: a real (hidden) field humans never fill. If set, silently reject.
  if (payload.hp && payload.hp.trim() !== "") return { ok: false, error: "Une erreur est survenue." };
  const ip = ipFrom(await headers());
  if (!(await rateLimit(`order:${ip}`, 5, 10 * 60 * 1000)).ok) {
    return { ok: false, error: "Trop de commandes envoyées. Réessayez dans quelques minutes." };
  }
  try {
    const order = await createOrder(payload);
    await notifyNewOrder(order); // emails the owner if configured; never throws
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
    return {
      ok: true,
      id: order.id,
      total: order.total,
      delivery: order.total - subtotal,
      items: order.items,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERREUR";
    const map: Record<string, string> = {
      OUT_OF_STOCK: "Un article de votre panier est en rupture de stock. Retirez-le pour continuer.",
      INVALID_NAME: "Nom invalide (3–60 caractères).",
      INVALID_PHONE: "Téléphone invalide (format 0XXXXXXXXX).",
      INVALID_CITY: "Veuillez choisir une ville.",
      INVALID_ADDRESS: "Adresse trop courte.",
      INVALID_ITEMS: "Votre panier est vide.",
      PRODUCT_NOT_FOUND: "Un produit n'existe plus.",
    };
    return { ok: false, error: map[msg] ?? "Une erreur est survenue. Réessayez." };
  }
}

/**
 * Confirmateur/admin: confirm an order after calling the client, schedule the
 * install, auto-assign it to the plombier, and notify him by email.
 */
export async function confirmOrderAction(input: {
  id: string;
  installDate: string; // ISO from a datetime-local input
  note?: string;
  assignedTo?: string; // selected plombier email; falls back to the first plombier
}): Promise<{ ok: boolean; error?: string }> {
  const { session } = await requireStaff(["confirmateur", "admin"]);

  const when = new Date(input.installDate);
  if (isNaN(when.getTime())) return { ok: false, error: "Date d'installation invalide." };

  const plombier = input.assignedTo?.trim() || (await getPlombierEmail());
  let order;
  try {
    order = await confirmOrder(input.id, {
      installDate: when,
      assignedTo: plombier,
      note: input.note?.trim() || undefined,
    });
  } catch {
    return { ok: false, error: "Cette commande n'est plus en attente (déjà traitée)." };
  }

  await prisma.order.update({ where: { id: input.id }, data: { confirmedBy: session.email } });
  await logActivity({
    actor: session.email,
    action: "order.confirmed",
    entity: order.id,
    summary: `Order ${order.id} confirmed`,
    meta: { name: order.customerName, total: order.total },
  });

  if (plombier) {
    await notifyPlombierAssignment(plombier, {
      orderId: order.id,
      customerName: order.customerName,
      phone: order.phone,
      address: order.address,
      city: order.city,
      installDate: order.installDate,
    });
  }
  await notifyOrderConfirmed(order, plombier); // keep the owner in the loop

  revalidatePath("/confirmation");
  revalidatePath("/technicien");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Confirmateur/admin: record the outcome of a confirmation call.
 * - "annuler"  -> order cancelled
 * - "rappeler" / "pas_reponse" -> stays pending, logs the attempt as a note
 */
export async function recordCallOutcomeAction(
  id: string,
  outcome: "rappeler" | "pas_reponse" | "annuler",
): Promise<{ ok: boolean; error?: string }> {
  const { session } = await requireStaff(["confirmateur", "admin"]);
  const stamp = new Date().toLocaleString("fr-MA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Casablanca",
  });
  if (outcome === "annuler") {
    await updateOrderStatus(id, "cancelled", `Annulée par le confirmateur · ${stamp}`);
    await prisma.order.update({
      where: { id },
      data: { lastOutcome: "cancelled", confirmedBy: session.email },
    });
    await logActivity({ actor: session.email, action: "order.cancelled", entity: id, summary: `Order ${id} cancelled` });
  } else {
    const label = outcome === "rappeler" ? "À rappeler" : "Pas de réponse";
    await updateOrderStatus(id, "pending", `${label} · ${stamp}`);
    await prisma.order.update({
      where: { id },
      data: { lastOutcome: outcome, callAttempts: { increment: 1 } },
    });
    await logActivity({ actor: session.email, action: "order.call", entity: id, summary: `${label} · ${id}`, meta: { outcome } });
  }
  revalidatePath("/confirmation");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  return { ok: true };
}

/** Confirmateur/admin: record that they opened WhatsApp for an order (perf counts). */
export async function logWhatsappAction(orderId: string): Promise<void> {
  try {
    const { session } = await requireStaff(["confirmateur", "admin"]);
    await logActivity({ actor: session.email, action: "whatsapp.sent", entity: orderId, summary: `WhatsApp ${orderId}` });
  } catch {
    /* never block the WhatsApp link */
  }
}

/** Plombier/admin: advance progress on an assigned job ("enroute" | "arrived"). */
export async function setJobStageAction(
  id: string,
  stage: "enroute" | "arrived",
): Promise<{ ok: boolean; error?: string }> {
  const { session, role } = await requireStaff(["plombier", "admin"]);
  const order = await getOrderById(id);
  if (!order) return { ok: false, error: "Commande introuvable." };
  if (role !== "admin" && order.assignedTo !== session.email) {
    return { ok: false, error: "Cette installation ne vous est pas assignée." };
  }
  if (order.status !== "confirmed") {
    return { ok: false, error: "Cette installation n'est plus en cours." };
  }
  await setJobStage(id, stage);
  revalidatePath("/technicien");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Plombier/admin: mark an installation as done with a completion photo.
 * A plombier may only complete a job assigned to him.
 */
export async function completeInstallationAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string; invoiceUrl?: string; invoiceRef?: string }> {
  const { session, role } = await requireStaff(["plombier", "admin"]);

  const id = String(formData.get("orderId") ?? "");
  if (!id) return { ok: false, error: "Commande manquante." };

  const order = await getOrderById(id);
  if (!order) return { ok: false, error: "Commande introuvable." };
  if (role !== "admin" && order.assignedTo !== session.email) {
    return { ok: false, error: "Cette installation ne vous est pas assignée." };
  }
  if (order.status !== "confirmed") {
    return { ok: false, error: "Cette commande n'est pas en cours d'installation." };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Ajoutez une photo de l'installation." };
  }

  let photoUrl: string;
  try {
    photoUrl = await uploadProductImage(file);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec de l'envoi de la photo." };
  }

  let updated;
  try {
    updated = await completeInstallation(id, photoUrl);
  } catch {
    return { ok: false, error: "Cette commande a déjà été installée." };
  }
  await notifyOrderInstalled(updated); // keep the owner in the loop

  // The job is now installed = paid. Generate the customer's facture so the technician
  // can send it on the spot. Install orders only (maintenance visits are free, total 0).
  // Best-effort: a facture hiccup must never fail the installation itself.
  let invoiceUrl: string | undefined;
  let invoiceRef: string | undefined;
  if (updated.kind !== "maintenance") {
    try {
      const inv = await createInvoiceFromOrder(id, session.email);
      const base = process.env.APP_URL || "http://localhost:3000";
      invoiceUrl = `${base}/facture/${inv.id}`;
      invoiceRef = inv.ref;
    } catch {
      /* facture not generated — installation still succeeded */
    }
  }

  revalidatePath("/technicien");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  revalidatePath("/admin/factures");
  return { ok: true, invoiceUrl, invoiceRef };
}

/** Admin: schedule a maintenance visit for an installation (creates a plombier job + emails him). */
export async function scheduleMaintenanceAction(input: {
  parentId: string;
  installDate: string;
  assignedTo?: string;
}): Promise<{ ok: boolean; error?: string }> {
  await requireStaff(["admin"]);
  const when = new Date(input.installDate);
  if (isNaN(when.getTime())) return { ok: false, error: "Date invalide." };

  const plombier = input.assignedTo?.trim() || (await getPlombierEmail());
  const visit = await createMaintenanceVisit(input.parentId, { installDate: when, assignedTo: plombier });

  if (plombier) {
    await notifyPlombierAssignment(plombier, {
      orderId: visit.id,
      customerName: visit.customerName,
      phone: visit.phone,
      address: visit.address,
      city: visit.city,
      installDate: visit.installDate,
    });
  }
  revalidatePath("/admin/clients");
  revalidatePath("/technicien");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true };
}

/** Admin: change an installation's maintenance interval (months). */
export async function setMaintenanceIntervalAction(
  id: string,
  months: number,
): Promise<{ ok: boolean; error?: string }> {
  await requireStaff(["admin"]);
  const m = Math.floor(Number(months));
  if (!Number.isFinite(m) || m < 1 || m > 36)
    return { ok: false, error: "Intervalle invalide (1–36 mois)." };
  await setMaintenanceInterval(id, m);
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
  return { ok: true };
}

/** Admin: mark an installation's maintenance as done manually (restarts the clock). */
export async function markMaintenanceDoneAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireStaff(["admin"]);
  await markMaintenanceDone(id);
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
  return { ok: true };
}

/** Confirmateur/admin: manually create an order for a client who phoned in. */
export async function createPhoneOrderAction(payload: {
  customerName: string;
  phone: string;
  city: string;
  address: string;
  note?: string;
  items: { productId: string; qty: number; variantLabel?: string }[];
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  await requireStaff(["confirmateur", "admin"]);
  try {
    const order = await createOrder({ ...payload, source: "phone" });
    revalidatePath("/confirmation");
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return { ok: true, id: order.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERREUR";
    const map: Record<string, string> = {
      INVALID_NAME: "Nom invalide (3–60 caractères).",
      INVALID_PHONE: "Téléphone invalide (format 0XXXXXXXXX).",
      INVALID_CITY: "Ville invalide.",
      INVALID_ADDRESS: "Adresse trop courte.",
      INVALID_ITEMS: "Ajoutez au moins un produit.",
      PRODUCT_NOT_FOUND: "Produit introuvable.",
      OUT_OF_STOCK: "Stock insuffisant pour un produit.",
    };
    return { ok: false, error: map[msg] ?? "Une erreur est survenue." };
  }
}
