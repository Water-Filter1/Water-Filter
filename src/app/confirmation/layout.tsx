import Link from "next/link";
import { PhoneCall, LogOut } from "lucide-react";
import { logoutAction } from "@/lib/auth-actions";
import { getConfirmationNotifications } from "@/lib/data";
import { StaffBell } from "@/components/staff/staff-bell";
import { I18nProvider } from "@/i18n/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getT } from "@/i18n/server";
import { dirFor } from "@/i18n/config";
import { dashboardFont, dashboardFontStyle } from "@/lib/fonts";

export const dynamic = "force-dynamic";

export default async function ConfirmationLayout({ children }: { children: React.ReactNode }) {
  const [notif, { t, locale }] = await Promise.all([
    getConfirmationNotifications(),
    getT(),
  ]);
  return (
    <I18nProvider locale={locale}>
      <div
        dir={dirFor(locale)}
        lang={locale}
        className={`${dashboardFont.variable} min-h-screen bg-neutral-50`}
        style={dashboardFontStyle}
      >
        {/* Sidebar (desktop) */}
        <aside className="fixed inset-y-0 start-0 hidden w-64 flex-col border-e border-line bg-white lg:flex">
          <Link href="/confirmation" className="flex items-center gap-2 px-5 py-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <PhoneCall className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-lg font-extrabold tracking-tight text-ink">
                Filtre<span className="text-brand-600">Maroc</span>
              </span>
              <span className="block text-xs text-ink-soft">{t("conf.space")}</span>
            </span>
          </Link>
          <nav className="mt-2 flex-1 px-3">
            <span className="flex items-center gap-3 rounded-xl bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-700">
              <PhoneCall className="h-5 w-5" /> {t("conf.title")}
            </span>
          </nav>
          <div className="border-t border-line p-3">
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut className="h-5 w-5" /> {t("dash.logout")}
              </button>
            </form>
          </div>
        </aside>

        {/* Content */}
        <div className="lg:ps-64">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur lg:px-8">
            <Link href="/confirmation" className="font-display font-extrabold text-ink lg:hidden">
              Filtre<span className="text-brand-600">Maroc</span>
            </Link>
            <h1 className="hidden font-display text-lg font-bold text-ink lg:block">
              {t("conf.title")}
            </h1>
            <div className="ms-auto flex items-center gap-2">
              <LanguageSwitcher />
              <StaffBell area="confirmation" initial={notif} />
              <form action={logoutAction} className="lg:hidden">
                <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-neutral-100">
                  <LogOut className="h-5 w-5" />
                </button>
              </form>
              <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white lg:flex">
                C
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-5xl p-4 lg:p-8">
            <div className="mb-6 lg:hidden">
              <h1 className="font-display text-2xl font-bold text-ink">{t("conf.title")}</h1>
            </div>
            {children}
          </main>
        </div>
      </div>
    </I18nProvider>
  );
}
