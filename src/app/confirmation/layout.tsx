import { StaffShell } from "@/components/staff/staff-shell";
import { getSession } from "@/lib/auth";
import { getConfirmationNotifications } from "@/lib/data";
import { I18nProvider } from "@/i18n/i18n-context";
import { getLocale } from "@/i18n/server";
import { dirFor } from "@/i18n/config";
import { dashboardFont, dashboardFontStyle } from "@/lib/fonts";

export const dynamic = "force-dynamic";

export default async function ConfirmationLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const [notif, locale] = await Promise.all([getConfirmationNotifications(), getLocale()]);
  return (
    <I18nProvider locale={locale}>
      <div
        dir={dirFor(locale)}
        lang={locale}
        className={dashboardFont.variable}
        style={dashboardFontStyle}
      >
        <StaffShell
          variant="confirmation"
          user={session ? { email: session.email, role: session.role ?? "confirmateur" } : null}
          notif={notif}
        >
          {children}
        </StaffShell>
      </div>
    </I18nProvider>
  );
}
