"use client";

import { useState } from "react";
import { MessageSquare, Star, List, LayoutGrid } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-context";
import { MessagesList, type AdminMessage } from "@/components/admin/messages-list";
import { ReviewsManager, type AdminReview } from "@/components/admin/reviews-manager";

type View = "list" | "grid";

function ViewToggle({ view, setView }: { view: View; setView: (v: View) => void }) {
  const { t } = useI18n();
  const item = (v: View) =>
    cn(
      "h-7 w-7 rounded-md",
      view === v ? "bg-card text-ink shadow-sm hover:bg-card" : "text-ink-soft hover:bg-transparent hover:text-ink",
    );
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
      <Button variant="ghost" size="icon-sm" onClick={() => setView("list")} className={item("list")}>
        <List className="h-4 w-4" />
        <span className="sr-only">{t("admin.inbox.viewList")}</span>
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={() => setView("grid")} className={item("grid")}>
        <LayoutGrid className="h-4 w-4" />
        <span className="sr-only">{t("admin.inbox.viewGrid")}</span>
      </Button>
    </div>
  );
}

/** Inbox = Messages + Reviews, with a shared list/grid view toggle. */
export function InboxTabs({
  messages,
  reviews,
  defaultTab,
}: {
  messages: AdminMessage[];
  reviews: AdminReview[];
  defaultTab: string;
}) {
  const { t } = useI18n();
  const [view, setView] = useState<View>("list");

  const unread = messages.filter((m) => !m.read).length;
  const pendingReviews = reviews.filter((r) => r.status === "pending").length;

  // Reflect the active tab in the URL (deep-link / refresh / share) without a reload.
  const syncUrl = (v: string) => {
    if (typeof window === "undefined") return;
    const url = v === "messages" ? window.location.pathname : `${window.location.pathname}?tab=${v}`;
    window.history.replaceState(null, "", url);
  };

  return (
    <Tabs defaultValue={defaultTab} onValueChange={(v) => syncUrl(String(v))} className="gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList className="h-10 bg-muted p-1 font-semibold">
          <TabsTrigger value="messages" className="gap-2 text-sm font-semibold">
            <MessageSquare className="h-4 w-4" />
            {t("admin.nav.messages")}
            {unread > 0 ? <Badge className="ms-0.5 bg-brand-100 px-1.5 text-brand-700">{unread}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2 text-sm font-semibold">
            <Star className="h-4 w-4" />
            {t("admin.nav.reviews")}
            {pendingReviews > 0 ? <Badge className="ms-0.5 bg-amber-100 px-1.5 text-amber-700">{pendingReviews}</Badge> : null}
          </TabsTrigger>
        </TabsList>
        <ViewToggle view={view} setView={setView} />
      </div>

      <TabsContent value="messages" keepMounted>
        <MessagesList messages={messages} view={view} />
      </TabsContent>
      <TabsContent value="reviews" keepMounted>
        <ReviewsManager reviews={reviews} view={view} />
      </TabsContent>
    </Tabs>
  );
}
