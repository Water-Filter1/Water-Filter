"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createInvoiceFromOrder, getOrderById, logActivity } from "@/lib/data";

export type InvoiceResult = { ok: true; id: string; ref: string } | { ok: false; error: string };

/** Generate (or fetch the existing) facture for an order, then return its id for navigation. */
export async function generateInvoiceAction(orderId: string): Promise<InvoiceResult> {
  const me = await requireRole(["admin"]);
  try {
    const inv = await createInvoiceFromOrder(orderId, me.email);
    await logActivity({
      actor: me.email,
      action: "facture.created",
      entity: inv.ref,
      summary: `Facture ${inv.ref} — order ${orderId}`,
      meta: { orderId, invoiceId: inv.id, ref: inv.ref },
    });
    revalidatePath("/admin/factures");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin");
    return { ok: true, id: inv.id, ref: inv.ref };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ERROR" };
  }
}

/**
 * A technician (or admin) generates/fetches the facture for one of their completed
 * installs, so they can re-send it from their history. Idempotent (one facture per order).
 * A technician may only invoice an order assigned to them.
 */
export async function ensureInvoiceAction(orderId: string): Promise<InvoiceResult> {
  const me = await requireRole(["admin", "plombier"]);
  try {
    if (me.role === "plombier") {
      const order = await getOrderById(orderId);
      // A technician may only invoice their OWN, actually-completed install — mirror the
      // precondition the Completed-card UI relies on, since this action is the trust boundary.
      if (!order || order.assignedTo !== me.email || order.status !== "installed")
        return { ok: false, error: "FORBIDDEN" };
    }
    const inv = await createInvoiceFromOrder(orderId, me.email);
    await logActivity({
      actor: me.email,
      action: "facture.created",
      entity: inv.ref,
      summary: `Facture ${inv.ref} — order ${orderId}`,
      meta: { orderId, invoiceId: inv.id, ref: inv.ref },
    });
    revalidatePath("/technicien");
    revalidatePath("/admin/factures");
    return { ok: true, id: inv.id, ref: inv.ref };
  } catch {
    // Don't leak internal/Prisma error strings to a lower-privilege technician caller.
    return { ok: false, error: "GEN_FAILED" };
  }
}
