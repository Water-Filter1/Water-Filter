"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  createExpense,
  deleteExpense,
  setProductStock,
  setTechnicianCommission,
  logActivity,
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

export async function setProductStockAction(id: string, stock: number): Promise<OpResult> {
  const me = await requireRole(["admin"]);
  try {
    await setProductStock(id, stock);
    await logActivity({
      actor: me.email,
      action: "stock.adjusted",
      entity: id,
      summary: `Stock set to ${stock}`,
      meta: { stock },
    });
    revalidatePath("/admin/stock");
    revalidatePath("/admin/products");
    revalidatePath("/admin");
    return { ok: true };
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
    revalidatePath("/admin/techniciens");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ERROR" };
  }
}
