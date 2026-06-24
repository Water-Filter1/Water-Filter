import { getSettings } from "@/lib/data";
import { updateSettingsAction } from "@/lib/settings-actions";
import { getSession } from "@/lib/auth";
import { AdminAccountForm } from "@/components/admin/account-form";
import { getT } from "@/i18n/server";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const label = "mb-1.5 block text-sm font-semibold text-ink";
const input =
  "h-11 w-full rounded-xl border border-line bg-white px-4 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100";
const card = "p-6";

export default async function AdminSettingsPage() {
  const { t } = await getT();
  const s = await getSettings();
  const session = await getSession();

  return (
    <div className="mx-auto max-w-6xl font-semibold">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">{t("admin.settings.title")}</h1>
        <p className="text-sm text-ink-soft">
          {t("admin.settings.subtitle")}
        </p>
      </div>

      <form action={updateSettingsAction} className="grid items-start gap-6 lg:grid-cols-2">
        {/* Identity — full width */}
        <Card className={`${card} lg:col-span-2`}>
          <h2 className="font-display font-bold text-ink">{t("admin.settings.identity")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label className={label}>{t("admin.settings.siteName")}</Label>
              <Input name="siteName" defaultValue={s.siteName} className={input} />
            </div>
            <div>
              <Label className={label}>{t("admin.settings.logo")}</Label>
              <div className="flex items-center gap-3">
                {s.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logoUrl} alt={t("admin.settings.logoAlt")} className="h-11 w-11 rounded-lg border border-line object-contain" />
                )}
                <Input type="file" name="logo" accept="image/*" className="h-11 w-full rounded-xl border border-line bg-white px-4 text-sm" />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Label className={label}>{t("admin.settings.announcement")}</Label>
            <Input name="announcement" defaultValue={s.announcement ?? ""} className={input} placeholder={t("admin.settings.announcementPlaceholder")} />
          </div>
        </Card>

        {/* Contact */}
        <Card className={card}>
          <h2 className="font-display font-bold text-ink">{t("admin.settings.contact")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label className={label}>{t("admin.settings.phone1")}</Label>
              <Input name="phone1" defaultValue={s.phone1} className={input} />
            </div>
            <div>
              <Label className={label}>{t("admin.settings.phone2")}</Label>
              <Input name="phone2" defaultValue={s.phone2 ?? ""} className={input} />
            </div>
            <div>
              <Label className={label}>{t("admin.settings.whatsapp")}</Label>
              <Input name="whatsapp" defaultValue={s.whatsapp ?? ""} className={input} placeholder="212660781919" />
            </div>
            <div>
              <Label className={label}>{t("admin.settings.email")}</Label>
              <Input name="email" type="email" defaultValue={s.email ?? ""} className={input} />
            </div>
          </div>
        </Card>

        {/* Location */}
        <Card className={card}>
          <h2 className="font-display font-bold text-ink">{t("admin.settings.location")}</h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label className={label}>{t("admin.settings.addressText")}</Label>
              <Input name="addressText" defaultValue={s.addressText ?? ""} className={input} placeholder="Agadir, Maroc" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className={label}>{t("admin.settings.mapLat")}</Label>
                <Input name="mapLat" defaultValue={s.mapLat ?? ""} className={input} placeholder="30.4144656" />
              </div>
              <div>
                <Label className={label}>{t("admin.settings.mapLng")}</Label>
                <Input name="mapLng" defaultValue={s.mapLng ?? ""} className={input} placeholder="-9.5671467" />
              </div>
            </div>
          </div>
        </Card>

        {/* Socials */}
        <Card className={card}>
          <h2 className="font-display font-bold text-ink">{t("admin.settings.socials")}</h2>
          <p className="mt-1 text-xs text-ink-soft">{t("admin.settings.socialsHint")}</p>
          <div className="mt-4 space-y-4">
            <div>
              <Label className={label}>{t("admin.settings.facebook")}</Label>
              <Input name="facebook" defaultValue={s.facebook ?? ""} className={input} placeholder="https://facebook.com/..." />
            </div>
            <div>
              <Label className={label}>{t("admin.settings.instagram")}</Label>
              <Input name="instagram" defaultValue={s.instagram ?? ""} className={input} placeholder="https://instagram.com/..." />
            </div>
            <div>
              <Label className={label}>{t("admin.settings.tiktok")}</Label>
              <Input name="tiktok" defaultValue={s.tiktok ?? ""} className={input} placeholder="https://tiktok.com/@..." />
            </div>
          </div>
        </Card>

        {/* Delivery */}
        <Card className={card}>
          <h2 className="font-display font-bold text-ink">{t("admin.settings.delivery")}</h2>
          <div className="mt-4 grid items-end gap-4 sm:grid-cols-2">
            <div>
              <Label className={label}>{t("admin.settings.deliveryFee")}</Label>
              <Input name="deliveryFee" type="number" min={0} defaultValue={s.deliveryFee} className={input} />
            </div>
            <div>
              <Label className={label}>{t("admin.settings.freeDeliveryThreshold")}</Label>
              <Input name="freeDeliveryThreshold" type="number" min={0} defaultValue={s.freeDeliveryThreshold} className={input} />
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            {t("admin.settings.freeDeliveryHint")}
          </p>
        </Card>

        <div className="lg:col-span-2">
          <Button type="submit" variant="primary" size="md" className="font-semibold">
            {t("admin.settings.save")}
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <AdminAccountForm currentEmail={session?.email ?? ""} />
      </div>
    </div>
  );
}
