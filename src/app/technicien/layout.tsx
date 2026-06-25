import { StaffShell } from "@/components/staff/staff-shell";
import { getSession } from "@/lib/auth";
import { getPlombierNotifications } from "@/lib/data";
import { I18nProvider } from "@/i18n/i18n-context";
import { getLocale } from "@/i18n/server";
import { dirFor } from "@/i18n/config";
import { dashboardFont, dashboardFontStyle } from "@/lib/fonts";

export const dynamic = "force-dynamic";

export default async function TechnicienLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const [notif, locale] = await Promise.all([
    getPlombierNotifications(session?.email ?? null, session?.role !== "plombier"),
    getLocale(),
  ]);
  return (
    <I18nProvider locale={locale}>
      <div
        dir={dirFor(locale)}
        lang={locale}
        className={dashboardFont.variable}
        style={dashboardFontStyle}
      >
        <StaffShell
          variant="technician"
          user={session ? { email: session.email, role: session.role ?? "plombier" } : null}
          notif={notif}
        >
          {children}
        </StaffShell>
      </div>
    </I18nProvider>
  );
}
