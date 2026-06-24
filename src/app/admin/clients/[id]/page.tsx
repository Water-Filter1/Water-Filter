import { notFound } from "next/navigation";
import { getClientDetailById } from "@/lib/data";
import { ClientDetailPageClient } from "@/components/admin/client-detail-page";

export const dynamic = "force-dynamic";

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getClientDetailById(id);
  if (!detail) notFound();
  return <ClientDetailPageClient initial={detail} />;
}
