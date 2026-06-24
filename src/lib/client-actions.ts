"use server";

import { revalidatePath } from "next/cache";
import {
  setClientStatus,
  updateClient,
  getClientDetail,
  createClient,
  addClientNote,
  setClientTags,
  logActivity,
  type ClientDetail,
  type ClientNoteRow,
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

/** Admin: manually create a client / lead. */
export async function createClientAction(data: {
  phone: string;
  name: string;
  city?: string;
  email?: string | null;
  address?: string | null;
  note?: string | null;
}): Promise<{ ok: true; phone: string } | { ok: false; error: string }> {
  const me = await requireRole(["admin"]);
  const name = (data.name ?? "").trim();
  if (name.length < 2 || name.length > 60) return { ok: false, error: "INVALID_NAME" };
  const res = await createClient({ ...data, name });
  if (res.ok) {
    await logActivity({ actor: me.email, action: "client.created", entity: res.phone, summary: `Client ${res.phone} created` });
    revalidatePath("/admin/clients");
  }
  return res;
}

/** Admin: append a timestamped note to a client's activity log. */
export async function addClientNoteAction(
  phone: string,
  body: string,
): Promise<{ ok: true; note: ClientNoteRow } | { ok: false; error: string }> {
  const me = await requireRole(["admin"]);
  const b = (body ?? "").trim();
  if (b.length < 1 || b.length > 1000) return { ok: false, error: "INVALID_NOTE" };
  try {
    const note = await addClientNote(phone, b, me.email);
    await logActivity({ actor: me.email, action: "client.note", entity: phone, summary: `Note added to ${phone}` });
    revalidatePath("/admin/clients");
    return { ok: true, note };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ERROR" };
  }
}

/** Admin: replace a client's tag set. */
export async function setClientTagsAction(
  phone: string,
  tags: string[],
): Promise<{ ok: true; tags: string[] } | { ok: false; error: string }> {
  const me = await requireRole(["admin"]);
  try {
    const clean = await setClientTags(phone, tags);
    await logActivity({ actor: me.email, action: "client.tags", entity: phone, summary: `Tags set on ${phone}` });
    revalidatePath("/admin/clients");
    return { ok: true, tags: clean };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ERROR" };
  }
}
