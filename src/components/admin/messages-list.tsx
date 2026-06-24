"use client";

import { Phone, MessageCircle, MessageSquare, Check } from "lucide-react";
import { markMessageReadAction } from "@/lib/contact-actions";
import { formatDate, waNumber, cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n-context";

export type AdminMessage = {
  id: string;
  name: string;
  phone: string;
  message: string;
  read: boolean;
  createdAt: string;
};

function MsgAvatar({ m }: { m: AdminMessage }) {
  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
        m.read ? "bg-muted text-muted-foreground" : "bg-brand-100 text-brand-700",
      )}
      aria-hidden
    >
      {m.name.charAt(0).toUpperCase()}
    </span>
  );
}

function MessageActions({ m }: { m: AdminMessage }) {
  const { t } = useI18n();
  const tel = m.phone.replace(/\s/g, "");
  return (
    <div className="flex items-center gap-1.5">
      <a
        href={`https://wa.me/${waNumber(m.phone)}`}
        target="_blank"
        rel="noopener noreferrer"
        title="WhatsApp"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366] text-white transition hover:brightness-105"
      >
        <MessageCircle className="h-4 w-4" />
      </a>
      <a
        href={`tel:${tel}`}
        title={t("admin.messages.call")}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink-soft transition hover:bg-muted/50"
      >
        <Phone className="h-4 w-4" />
      </a>
      {!m.read && (
        <form action={markMessageReadAction.bind(null, m.id)}>
          <Button
            type="submit"
            variant="outline"
            size="icon-sm"
            className="h-8 w-8 rounded-lg border-brand-200 text-brand-700 hover:bg-brand-50"
          >
            <Check className="h-4 w-4" />
            <span className="sr-only">{t("admin.messages.markRead")}</span>
          </Button>
        </form>
      )}
    </div>
  );
}

/** Customer messages — the "Messages" tab of the Inbox. Supports list and grid views. */
export function MessagesList({
  messages,
  view = "list",
}: {
  messages: AdminMessage[];
  view?: "list" | "grid";
}) {
  const { t } = useI18n();

  if (messages.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center border border-dashed border-border py-24 text-center font-semibold ring-0">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
          <MessageSquare className="h-7 w-7" />
        </div>
        <p className="mt-4 font-display text-lg font-semibold text-ink">{t("admin.messages.empty.title")}</p>
        <p className="mt-1 text-sm text-ink-soft">{t("admin.messages.empty.body")}</p>
      </Card>
    );
  }

  if (view === "grid") {
    return (
      <div className="grid gap-4 font-semibold sm:grid-cols-2 xl:grid-cols-3">
        {messages.map((m) => {
          const tel = m.phone.replace(/\s/g, "");
          return (
            <Card key={m.id} className={cn("gap-0 p-4", !m.read && "ring-1 ring-brand-200")}>
              <div className="flex items-start gap-3">
                <MsgAvatar m={m} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!m.read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-hidden />}
                    <p className="truncate font-display font-semibold text-ink" dir="auto">{m.name}</p>
                  </div>
                  <a href={`tel:${tel}`} className="text-xs text-ink-soft hover:text-brand-600" dir="ltr">{m.phone}</a>
                </div>
              </div>
              <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm text-ink-soft" dir="auto">{m.message}</p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-xs text-ink-soft">{formatDate(m.createdAt)}</span>
                <MessageActions m={m} />
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden p-0 font-semibold">
      <div className="divide-y divide-border">
        {messages.map((m) => {
          const tel = m.phone.replace(/\s/g, "");
          return (
            <div
              key={m.id}
              className={cn(
                "flex items-start gap-4 px-4 py-4 transition-colors hover:bg-muted/50 sm:px-5",
                !m.read && "bg-brand-50/40",
              )}
            >
              <MsgAvatar m={m} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {!m.read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-hidden />}
                  <p className="font-display font-semibold text-ink" dir="auto">{m.name}</p>
                  <a href={`tel:${tel}`} className="text-xs text-ink-soft hover:text-brand-600" dir="ltr">{m.phone}</a>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft" dir="auto">{m.message}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="whitespace-nowrap text-xs text-ink-soft">{formatDate(m.createdAt)}</span>
                <MessageActions m={m} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
