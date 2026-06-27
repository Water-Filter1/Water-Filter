import { getStoreAnalytics } from "@/lib/data";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";

export const dynamic = "force-dynamic";

const ALLOWED = [7, 30, 90];

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const sp = await searchParams;
  const days = ALLOWED.includes(Number(sp.days)) ? Number(sp.days) : 30;
  const data = await getStoreAnalytics(days);

  return <AnalyticsDashboard data={data} />;
}
