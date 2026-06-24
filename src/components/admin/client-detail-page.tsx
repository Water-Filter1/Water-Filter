"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ClientDetailPanel } from "@/components/admin/clients-manager";
import type { ClientDetail } from "@/lib/data";

/** Deep-linkable full-page client view (reuses the Sheet's detail panel). */
export function ClientDetailPageClient({ initial }: { initial: ClientDetail }) {
  const { t } = useI18n();
  const [detail, setDetail] = useState<ClientDetail>(initial);

  return (
    <div className="mx-auto max-w-2xl font-semibold">
      <Link href="/admin/clients" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mb-4 gap-1.5")}>
        <ArrowLeft className="h-4 w-4" /> {t("admin.nav.clients")}
      </Link>
      <Card className="gap-0 overflow-hidden p-0">
        <ClientDetailPanel detail={detail} loading={false} onChanged={setDetail} />
      </Card>
    </div>
  );
}
