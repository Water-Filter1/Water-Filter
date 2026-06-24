import { getStaffUsers } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { UsersManager } from "@/components/admin/users-manager";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const { t } = await getT();
  const [users, session] = await Promise.all([getStaffUsers(), getSession()]);

  return (
    <div className="font-semibold">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">{t("admin.usersPage.title")}</h1>
        <p className="text-sm text-ink-soft">
          {t("admin.usersPage.subtitle")}
        </p>
      </div>
      <UsersManager users={users} currentUserId={session?.sub ?? ""} />
    </div>
  );
}
