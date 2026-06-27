"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  createExpense,
  deleteExpense,
  applyStockAdjustment,
  setReorderPoint,
  getStockMovements,
  setTechnicianCommission,
  logActivity,
  type StockReason,
  type StockMovementRow,
} from "@/lib/data";

export type OpResult = { ok: true } | { ok: false; error: string };

export async function createExpenseAction(data: {
  label: string;
  category: string;
  amount: number;
  note?: string;
  date?: string;
}): Promise<OpResult> {
  const me = await requireRole(["admin"]);
  try {
    await createExpense(data);
    await logActivity({
      actor: me.email,
      action: "expense.created",
      summary: `Expense: ${data.label} (${data.amount})`,
      meta: { label: data.label, amount: data.amount, category: data.category },
    });
    revalidatePath("/admin/charges");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ERROR" };
  }
}

export async function deleteExpenseAction(id: string): Promise<OpResult> {
  await requireRole(["admin"]);
  try {
    await deleteExpense(id);
    revalidatePath("/admin/charges");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ERROR" };
  }
}

export async function adjustStockAction(
  id: string,
  reason: StockReason,
  qty: number,
  note?: string,
): Promise<OpResult> {
  const me = await requireRole(["admin"]);
  try {
    const { before, after } = await applyStockAdjustment(id, reason, qty, note, me.email);
    await logActivity({
      actor: me.email,
      action: "stock.adjusted",
      entity: id,
      summary: `Stock ${before} → ${after} (${reason})`,
      meta: { reason, qty: Math.abs(after - before), requestedQty: Math.abs(Math.round(qty)), before, after },
    });
    revalidatePath("/admin/stock");
    revalidatePath("/admin/products");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ERROR" };
  }
}

export async function setReorderPointAction(id: string, value: number): Promise<OpResult> {
  await requireRole(["admin"]);
  try {
    await setReorderPoint(id, value);
    revalidatePath("/admin/stock");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ERROR" };
  }
}

export async function getStockMovementsAction(
  id: string,
): Promise<{ ok: true; rows: StockMovementRow[] } | { ok: false; error: string }> {
  await requireRole(["admin"]);
  try {
    const rows = await getStockMovements(id);
    return { ok: true, rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ERROR" };
  }
}

export async function setTechnicianCommissionAction(
  id: string,
  commissionPerInstall: number,
): Promise<OpResult> {
  const me = await requireRole(["admin"]);
  try {
    await setTechnicianCommission(id, commissionPerInstall);
    await logActivity({
      actor: me.email,
      action: "technician.commission",
      entity: id,
      summary: `Commission set to ${commissionPerInstall}/install`,
      meta: { commissionPerInstall },
    });
    revalidatePath("/admin/service");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ERROR" };
  }
}
