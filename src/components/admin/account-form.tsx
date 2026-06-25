"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Check, ShieldCheck } from "lucide-react";
import { updateAdminAccountAction, type AccountState } from "@/lib/account-actions";
import { useI18n } from "@/i18n/i18n-context";
import { PasswordInput } from "@/components/ui/password-input";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initial: AccountState = { error: null };

const label = "mb-1.5 block text-sm font-semibold text-ink";
const input =
  "h-11 w-full rounded-xl border border-line bg-card px-4 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

export function AdminAccountForm({ currentEmail }: { currentEmail: string }) {
  const [state, action, pending] = useActionState(updateAdminAccountAction, initial);
  const { t } = useI18n();

  useEffect(() => {
    if (state.ok) toast.success(t("admin.toast.saved"));
  }, [state.ok, t]);

  useEffect(() => {
    if (state.error) toast.error(t("admin.toast.error"));
  }, [state.error, t]);

  return (
    <Card className="gap-0 py-0 rounded-2xl ring-0 border border-line bg-card p-6 shadow-sm">
      <h2 className="flex items-center gap-2 font-display font-bold text-ink">
        <ShieldCheck className="h-5 w-5 text-brand-600" /> {t("admin.account.title")}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        {t("admin.account.currentEmail")} <b className="text-ink">{currentEmail}</b>
      </p>

      <form action={action} className="mt-4 space-y-4">
        {state.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        {state.ok && (
          <Alert className="border-emerald-200 bg-emerald-50">
            <Check className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="font-semibold text-emerald-700">{t("admin.account.updated")}</AlertDescription>
          </Alert>
        )}

        <div>
          <Label className={label}>{t("admin.account.newEmailLabel")}</Label>
          <Input name="newEmail" type="email" placeholder={currentEmail} className={input} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className={label}>{t("admin.account.newPasswordLabel")}</Label>
            <PasswordInput name="newPassword" />
          </div>
          <div>
            <Label className={label}>{t("admin.account.confirmPasswordLabel")}</Label>
            <PasswordInput name="confirmPassword" />
          </div>
        </div>

        <div className="border-t border-line pt-4">
          <Label className={label}>
            {t("admin.account.currentPasswordLabel")} <span className="font-semibold text-ink-soft">{t("admin.account.currentPasswordHint")}</span>
          </Label>
          <PasswordInput name="currentPassword" required className="max-w-xs" />
        </div>

        <Button type="submit" variant="primary" disabled={pending} className="font-semibold">
          {pending ? t("admin.account.saving") : t("admin.account.submit")}
        </Button>
      </form>
    </Card>
  );
}
