import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminNotifications } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { I18nProvider } from "@/i18n/i18n-context";
import { getLocale } from "@/i18n/server";
import { dirFor } from "@/i18n/config";
import { dashboardFont, dashboardFontStyle } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Admin — Filtre Maroc",
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, locale] = await Promise.all([getSession(), getLocale()]);
  // Only hit the DB for notifications when an admin is actually logged in —
  // the login page (no session) must not run these queries.
  // Best-effort: a transient DB/pooler hiccup (Supabase P1001) must NOT crash the
  // whole admin — render the shell without notifications instead of throwing.
  let notifications: Awaited<ReturnType<typeof getAdminNotifications>> | undefined;
  try {
    notifications = session ? await getAdminNotifications() : undefined;
  } catch {
    notifications = undefined;
  }
  return (
    <I18nProvider locale={locale}>
      <div
        dir={dirFor(locale)}
        lang={locale}
        className={dashboardFont.variable}
        style={dashboardFontStyle}
      >
        <AdminShell
          notifications={notifications}
          user={session ? { email: session.email, role: session.role ?? "admin" } : null}
        >
          {children}
        </AdminShell>
      </div>
    </I18nProvider>
  );
}
