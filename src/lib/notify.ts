import type { Order } from "@/lib/types";
import { formatMAD } from "@/lib/utils";
import { getSettings, getConfirmateurEmails } from "@/lib/data";

const BRAND = "#1273b6";
const BRAND_DARK = "#0e3c5f";
const INK = "#0a0f16";
const MUTED = "#7a8794";
const LINE = "#eef1f4";

function brandHeader(logoUrl: string | null, siteName: string): string {
  const useImg = logoUrl && /^https?:\/\//.test(logoUrl);
  const mark = useImg
    ? `<img src="${logoUrl}" alt="${siteName}" width="56" height="56" style="border-radius:50%;display:block;margin:0 auto 8px;border:2px solid rgba(255,255,255,.5);" />`
    : `<div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-.02em;">💧 ${siteName}</div>`;
  return `
    <tr><td align="center" style="background:${BRAND};background:linear-gradient(135deg,${BRAND},${BRAND_DARK});padding:26px 28px;">
      ${mark}
      <div style="color:#dceefb;font-size:14px;margin-top:6px;">Nouvelle commande reçue 🛒</div>
    </td></tr>`;
}

/** Builds the branded order-alert email. Pure (no DB). */
function buildOrderEmail(
  order: Order,
  opts: { logoUrl: string | null; siteName: string; appUrl: string },
): { subject: string; html: string } {
  const subject = `🛒 Nouvelle commande ${order.id} — ${formatMAD(order.total)}`;

  const itemsRows = order.items
    .map(
      (i) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;color:${INK};">
            ${esc(i.name)}${i.variantLabel ? ` <span style="color:${MUTED};">(${esc(i.variantLabel)})</span>` : ""}
            <span style="color:${MUTED};">× ${i.qty}</span>
          </td>
          <td align="right" style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;font-weight:bold;color:${INK};white-space:nowrap;">
            ${formatMAD(i.price * i.qty)}
          </td>
        </tr>`,
    )
    .join("");

  const html = `
  <div style="background:#f3f5f7;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8ebee;">
        ${brandHeader(opts.logoUrl, opts.siteName)}

        <tr><td style="padding:24px 28px 6px;">
          <table role="presentation" width="100%"><tr>
            <td style="font-size:20px;font-weight:bold;color:${INK};">Commande ${order.id}</td>
            <td align="right"><span style="background:#fef3c7;color:#92400e;font-size:11px;font-weight:bold;padding:5px 11px;border-radius:999px;">À CONFIRMER</span></td>
          </tr></table>
        </td></tr>

        <tr><td style="padding:8px 28px;">
          <table role="presentation" width="100%" style="background:#f7fafc;border-radius:12px;">
            <tr><td style="padding:16px;font-size:14px;color:${INK};line-height:1.9;">
              👤 <b>${esc(order.customerName)}</b><br>
              📞 <a href="tel:${esc(order.phone)}" style="color:${BRAND};text-decoration:none;">${esc(order.phone)}</a><br>
              📍 ${esc(order.address)}, ${esc(order.city)}${order.note ? `<br>📝 ${esc(order.note)}` : ""}
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:10px 28px 0;">
          <table role="presentation" width="100%" style="border-collapse:collapse;">
            ${itemsRows}
            <tr>
              <td style="padding:16px 0 4px;font-size:16px;font-weight:bold;color:${INK};">Total à encaisser</td>
              <td align="right" style="padding:16px 0 4px;font-size:22px;font-weight:bold;color:${BRAND_DARK};white-space:nowrap;">${formatMAD(order.total)}</td>
            </tr>
          </table>
          <div style="font-size:12px;color:${MUTED};padding-bottom:4px;">💵 Paiement à la livraison (COD)</div>
        </td></tr>

        <tr><td align="center" style="padding:22px 28px 28px;">
          <a href="${opts.appUrl}/admin/orders/${order.id}" style="background:${BRAND};color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 30px;border-radius:999px;display:inline-block;">Voir la commande →</a>
        </td></tr>

        <tr><td style="background:#f7fafc;padding:16px 28px;text-align:center;font-size:12px;color:#9aa6b2;">
          ${opts.siteName} · alerte automatique de commande
        </td></tr>
      </table>
    </td></tr></table>
  </div>`;

  return { subject, html };
}

/**
 * Emails the shop owner when a new order arrives (Resend HTTP API; no dep).
 * No-ops silently if not configured, and never throws.
 * Activate by setting RESEND_API_KEY and ORDER_NOTIFY_EMAIL.
 */
export async function notifyNewOrder(order: Order): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ORDER_NOTIFY_EMAIL;
  if (!apiKey || !to) return;

  const from = process.env.ORDER_FROM_EMAIL || "Filtre Maroc <onboarding@resend.dev>";
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  let logoUrl: string | null = null;
  let siteName = "Filtre Maroc";
  try {
    const s = await getSettings();
    logoUrl = s.logoUrl;
    siteName = s.siteName;
  } catch {
    /* use defaults */
  }

  const { subject, html } = buildOrderEmail(order, { logoUrl, siteName, appUrl });

  // Alert the owner + any confirmateur accounts so they call the client.
  let recipients = [to];
  try {
    recipients = [...new Set([to, ...(await getConfirmateurEmails())])];
  } catch {
    /* fall back to the owner only */
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: recipients, subject, html }),
    });
  } catch {
    /* never block an order on a failed email */
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Emails the plombier when a new installation is assigned to him. No-op if unconfigured. */
export async function notifyPlombierAssignment(
  to: string,
  job: {
    orderId: string;
    customerName: string;
    phone: string;
    address: string;
    city: string;
    installDate?: string | null;
  },
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return;
  const from = process.env.ORDER_FROM_EMAIL || "Filtre Maroc <onboarding@resend.dev>";
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  const when = job.installDate
    ? new Date(job.installDate).toLocaleString("fr-MA", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Africa/Casablanca",
      })
    : "à planifier";

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;">
      <div style="background:#1273b6;color:#fff;padding:18px 22px;border-radius:14px 14px 0 0;font-size:18px;font-weight:bold;">🔧 Nouvelle installation à faire</div>
      <div style="border:1px solid #e8ebee;border-top:0;border-radius:0 0 14px 14px;padding:20px 22px;color:#0a0f16;line-height:1.8;">
        <p style="margin:0 0 10px;"><b>Commande :</b> ${esc(job.orderId)}</p>
        <p style="margin:0 0 4px;">👤 <b>${esc(job.customerName)}</b></p>
        <p style="margin:0 0 4px;">📞 <a href="tel:${esc(job.phone)}" style="color:#1273b6;">${esc(job.phone)}</a></p>
        <p style="margin:0 0 4px;">📍 ${esc(job.address)}, ${esc(job.city)}</p>
        <p style="margin:10px 0 0;">🗓️ <b>Rendez-vous :</b> ${esc(when)}</p>
        <p style="margin-top:18px;"><a href="${appUrl}/technicien" style="background:#1273b6;color:#fff;text-decoration:none;font-weight:bold;padding:10px 22px;border-radius:999px;display:inline-block;">Voir mes installations →</a></p>
      </div>
    </div>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: `🔧 Installation à faire — ${job.customerName} (${job.orderId})`,
        html,
      }),
    });
  } catch {
    /* never block confirmation on a failed email */
  }
}

/** Emails the owner when a customer sends the contact form. No-op if unconfigured. */
export async function notifyNewMessage(msg: {
  name: string;
  phone: string;
  message: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ORDER_NOTIFY_EMAIL;
  if (!apiKey || !to) return;
  const from = process.env.ORDER_FROM_EMAIL || "Filtre Maroc <onboarding@resend.dev>";
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;">
      <div style="background:#1273b6;color:#fff;padding:18px 22px;border-radius:14px 14px 0 0;font-size:18px;font-weight:bold;">✉️ Nouveau message de contact</div>
      <div style="border:1px solid #e8ebee;border-top:0;border-radius:0 0 14px 14px;padding:20px 22px;">
        <p style="margin:0 0 6px;"><b>Nom :</b> ${esc(msg.name)}</p>
        <p style="margin:0 0 12px;"><b>Téléphone :</b> <a href="tel:${esc(msg.phone)}" style="color:#1273b6;">${esc(msg.phone)}</a></p>
        <div style="white-space:pre-wrap;background:#f7fafc;border-radius:10px;padding:14px;color:#0a0f16;">${esc(msg.message)}</div>
        <p style="margin-top:18px;"><a href="${appUrl}/admin/messages" style="background:#1273b6;color:#fff;text-decoration:none;font-weight:bold;padding:10px 22px;border-radius:999px;display:inline-block;">Voir dans l'admin →</a></p>
      </div>
    </div>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: `✉️ Nouveau message de ${msg.name}`, html }),
    });
  } catch {
    /* never block on a failed email */
  }
}

/** Small helper: send a simple branded email to the shop owner. No-op if unconfigured. */
async function notifyOwner(subject: string, innerHtml: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ORDER_NOTIFY_EMAIL;
  if (!apiKey || !to) return;
  const from = process.env.ORDER_FROM_EMAIL || "Filtre Maroc <onboarding@resend.dev>";
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;">
      ${innerHtml}
    </div>`;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
  } catch {
    /* never block on a failed email */
  }
}

function fmtDateTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-MA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Casablanca",
  });
}

/** Owner alert: an order was confirmed by the confirmateur and scheduled. */
export async function notifyOrderConfirmed(
  order: Order,
  plombier: string | null,
): Promise<void> {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  await notifyOwner(
    `✅ Commande ${order.id} confirmée — installation planifiée`,
    `<div style="background:#1273b6;color:#fff;padding:18px 22px;border-radius:14px 14px 0 0;font-size:18px;font-weight:bold;">✅ Commande confirmée</div>
     <div style="border:1px solid #e8ebee;border-top:0;border-radius:0 0 14px 14px;padding:20px 22px;color:#0a0f16;line-height:1.8;">
       <p style="margin:0 0 8px;"><b>${esc(order.id)}</b> — ${esc(order.customerName)}</p>
       <p style="margin:0;">📍 ${esc(order.address)}, ${esc(order.city)}</p>
       <p style="margin:8px 0 0;">🗓️ Installation : <b>${esc(fmtDateTime(order.installDate))}</b></p>
       <p style="margin:4px 0 0;">🔧 Plombier : ${esc(plombier ?? "non assigné")}</p>
       <p style="margin-top:16px;"><a href="${appUrl}/admin/orders/${order.id}" style="background:#1273b6;color:#fff;text-decoration:none;font-weight:bold;padding:10px 22px;border-radius:999px;display:inline-block;">Voir la commande →</a></p>
     </div>`,
  );
}

/** Owner alert: the plombier finished an installation. */
export async function notifyOrderInstalled(order: Order): Promise<void> {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const photo = order.photoUrl
    ? `<p style="margin:10px 0 0;"><a href="${esc(order.photoUrl)}" style="color:#1273b6;">📷 Voir la photo de l'installation</a></p>`
    : "";
  await notifyOwner(
    `✅ Commande ${order.id} installée`,
    `<div style="background:#0e9f6e;color:#fff;padding:18px 22px;border-radius:14px 14px 0 0;font-size:18px;font-weight:bold;">✅ Installation terminée</div>
     <div style="border:1px solid #e8ebee;border-top:0;border-radius:0 0 14px 14px;padding:20px 22px;color:#0a0f16;line-height:1.8;">
       <p style="margin:0 0 8px;"><b>${esc(order.id)}</b> — ${esc(order.customerName)}</p>
       <p style="margin:0;">📍 ${esc(order.address)}, ${esc(order.city)}</p>
       <p style="margin:8px 0 0;">🔧 Par : ${esc(order.assignedTo ?? "—")}</p>
       ${photo}
       <p style="margin-top:16px;"><a href="${appUrl}/admin/orders/${order.id}" style="background:#0e9f6e;color:#fff;text-decoration:none;font-weight:bold;padding:10px 22px;border-radius:999px;display:inline-block;">Voir la commande →</a></p>
     </div>`,
  );
}
