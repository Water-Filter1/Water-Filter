import { getMessages, getReviewsForAdmin } from "@/lib/data";
import { getT } from "@/i18n/server";
import { InboxTabs } from "@/components/admin/inbox-tabs";

export const dynamic = "force-dynamic";

export default async function AdminInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { t } = await getT();
  const { tab } = await searchParams;
  const [messages, reviews] = await Promise.all([getMessages(), getReviewsForAdmin()]);
  const defaultTab = tab === "reviews" ? "reviews" : "messages";

  return (
    <div className="font-semibold">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">{t("admin.nav.inbox")}</h1>
        <p className="text-sm text-ink-soft">{t("admin.inbox.subtitle")}</p>
      </div>
      <InboxTabs messages={messages} reviews={reviews} defaultTab={defaultTab} />
    </div>
  );
}
