import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsappButton } from "@/components/whatsapp-button";
import { VisitTracker } from "@/components/visit-tracker";
import { I18nProvider } from "@/i18n/i18n-context";
import { SettingsProvider } from "@/context/settings-context";
import { getLocale } from "@/i18n/server";
import { dirFor } from "@/i18n/config";
import { getSettings } from "@/lib/data";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const settings = await getSettings();
  return (
    <I18nProvider locale={locale}>
      <SettingsProvider settings={settings}>
        <div
          dir={dirFor(locale)}
          lang={locale}
          className="flex min-h-screen flex-col"
        >
          <SiteHeader settings={settings} />
          <main className="flex-1">{children}</main>
          <SiteFooter settings={settings} />
          <WhatsappButton settings={settings} />
          <VisitTracker />
        </div>
      </SettingsProvider>
    </I18nProvider>
  );
}
