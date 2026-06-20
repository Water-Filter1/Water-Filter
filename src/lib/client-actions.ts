"use server";

import { revalidatePath } from "next/cache";
import {
  setClientStatus,
  updateClient,
  getClientDetail,
  logActivity,
  type ClientDetail,
} from "@/lib/data";
import { requireRole } from "@/lib/auth";

export type ClientActionResult = { ok: true } | { ok: false; error: string };

/** Admin: read a single client's full detail (for the side panel). */
export async function getClientDetailAction(phone: string): Promise<ClientDetail | null> {
  await requireRole(["admin"]);
  return getClientDetail(phone);
}

/** Admin: activate / deactivate a client. */
export async function setClientStatusAction(
  phone: string,
  status: "active" | "inactive",
): Promise<ClientActionResult> {
  const me = await requireRole(["admin"]);
  try {
    await setClientStatus(phone, status);
    await logActivity({
      actor: me.email,
      action: "client.status",
      entity: phone,
      summary: `Client ${phone} set ${status}`,
      meta: { status },
    });
    revalidatePath("/admin/clients");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ERROR" };
  }
}

/** Admin: edit a client's contact details / note. */
export async function updateClientAction(
  phone: string,
  data: {
    name?: string;
    city?: string;
    email?: string | null;
    address?: string | null;
    note?: string | null;
  },
): Promise<ClientActionResult> {
  const me = await requireRole(["admin"]);

  const clean: typeof data = {};
  if (data.name !== undefined) {
    const n = data.name.trim();
    if (n.length < 2 || n.length > 60) return { ok: false, error: "INVALID_NAME" };
    clean.name = n;
  }
  if (data.city !== undefined) clean.city = data.city.trim();
  if (data.email !== undefined) clean.email = data.email ? data.email.trim() : null;
  if (data.address !== undefined) clean.address = data.address ? data.address.trim() : null;
  if (data.note !== undefined) clean.note = data.note ? data.note.trim() : null;

  try {
    await updateClient(phone, clean);
    await logActivity({
      actor: me.email,
      action: "client.updated",
      entity: phone,
      summary: `Client ${phone} updated`,
    });
    revalidatePath("/admin/clients");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ERROR" };
  }
}
