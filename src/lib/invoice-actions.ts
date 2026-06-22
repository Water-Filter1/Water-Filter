"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createInvoiceFromOrder, logActivity } from "@/lib/data";

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
