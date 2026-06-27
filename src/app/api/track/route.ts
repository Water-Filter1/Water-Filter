import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { rateLimit, ipFrom } from "@/lib/rate-limit";

/**
 * First-party storefront analytics beacon. The public storefront posts one ping per page
 * view; we derive traffic source / device / country server-side (no PII, no IP stored) and
 * record an anonymous PageView. Best-effort: any failure is swallowed so it can never break
 * a customer's page. NOT covered by the auth middleware (storefront is public).
 */

const VID = "fm_vid"; // anonymous visitor id (unique-visitor counting)
const SRC = "fm_src"; // session traffic source (for stable attribution across internal nav)
const YEAR = 60 * 60 * 24 * 365;

// Paths that are not part of the public storefront — never recorded.
const IGNORED = ["/admin", "/api", "/technicien", "/confirmation", "/facture", "/_next"];

function isBot(ua: string): boolean {
  return /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|preview|lighthouse|headless|chrome-lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios/i.test(ua);
}

function detectDevice(ua: string): "mobile" | "tablet" | "desktop" {
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk|kindle|(android(?!.*mobile))/.test(s)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile|windows phone/.test(s)) return "mobile";
  return "desktop";
}

/** Map a UTM value / referrer host to a canonical channel name. */
function sourceFromUtm(v: string): string | null {
  const u = v.toLowerCase();
  if (u.includes("facebook") || u === "fb" || u === "meta") return "facebook";
  if (u.includes("insta") || u === "ig") return "instagram";
  if (u.includes("tiktok") || u === "tt") return "tiktok";
  if (u.includes("google") || u === "adwords") return "google";
  if (u.includes("snap")) return "snapchat";
  if (u.includes("youtube")) return "youtube";
  return null;
}

function detectSource(search: string, referrer: string, selfHost: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const utm = params.get("utm_source");
  if (utm) return sourceFromUtm(utm) ?? "referral";
  if (params.has("fbclid")) return "facebook";
  if (params.has("ttclid")) return "tiktok";
  if (params.has("gclid") || params.has("gad_source")) return "google";
  if (params.has("ScCid") || params.has("sccid")) return "snapchat";

  if (!referrer) return null; // no signal this hit — caller falls back to session/direct
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    if (selfHost && host === selfHost.replace(/^www\./, "")) return null; // internal navigation
    if (/facebook\.|fb\.|fb\.me|l\.facebook/.test(host)) return "facebook";
    if (host.includes("instagram")) return "instagram";
    if (host.includes("tiktok")) return "tiktok";
    if (host.includes("google")) return "google";
    if (host.includes("snapchat") || host.includes("snap")) return "snapchat";
    if (host.includes("youtube") || host === "youtu.be") return "youtube";
    if (host.includes("bing")) return "bing";
    return "referral";
  } catch {
    return null;
  }
}

function refHost(referrer: string): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, "").slice(0, 120);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const res = new NextResponse(null, { status: 204 });

  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (!ua || isBot(ua)) return res; // treat empty UA as non-human

    // The legitimate beacon is a few hundred bytes — reject oversized bodies before parsing.
    if (Number(req.headers.get("content-length") ?? 0) > 2048) return res;

    const body = (await req.json().catch(() => ({}))) as { path?: string; referrer?: string; search?: string };
    const rawPath = (body.path ?? "/").split("?")[0].split("#")[0] || "/";
    const path = rawPath.slice(0, 300);
    if (IGNORED.some((p) => path.startsWith(p))) return res;

    // Product detection: /product/<slug>
    let type = "page";
    let productSlug: string | null = null;
    const m = path.match(/^\/product\/([^/]+)\/?$/);
    if (m) {
      type = "product";
      productSlug = decodeURIComponent(m[1]).slice(0, 200);
    }

    const referrer = (body.referrer ?? "").slice(0, 500);
    const search = (body.search ?? "").slice(0, 500);
    const selfHost = (req.headers.get("host") ?? "").split(":")[0];

    // Stable per-session source: prefer a fresh signal, else reuse the session's first source.
    const detected = detectSource(search, referrer, selfHost);
    const existingSrc = req.cookies.get(SRC)?.value;
    const source = detected ?? existingSrc ?? "direct";

    const device = detectDevice(ua);
    const country =
      req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry") ?? null;

    // Abuse guard: cap writes per IP (this is a public unauthenticated endpoint). Placed after
    // the bot/ignored-path early returns so junk traffic doesn't consume quota or DB writes.
    const ip = ipFrom(req.headers);
    if (!(await rateLimit(`track:${ip}`, 100, 60_000)).ok) return res;

    // Anonymous visitor id (no PII).
    let vid = req.cookies.get(VID)?.value;
    const isNewVisitor = !vid;
    if (!vid) vid = crypto.randomUUID();

    await withDbRetry(() =>
      prisma.pageView.create({
        data: { visitorId: vid!, path, type, productSlug, source, device, country, referrer: refHost(referrer) },
      }),
    );

    const cookieOpts = { httpOnly: true, sameSite: "lax" as const, path: "/", secure: process.env.NODE_ENV === "production" };
    if (isNewVisitor) res.cookies.set(VID, vid, { ...cookieOpts, maxAge: YEAR });
    // Persist a detected (non-direct) source for the rest of the visit so internal navigation
    // doesn't get mislabeled "direct".
    if (detected && detected !== "referral") res.cookies.set(SRC, detected, { ...cookieOpts, maxAge: 60 * 60 * 24 });
  } catch {
    /* analytics must never break the page */
  }

  return res;
}
