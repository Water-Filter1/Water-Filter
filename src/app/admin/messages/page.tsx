import { Phone, MessageCircle, MessageSquare, Check, Mail } from "lucide-react";
import { getMessages } from "@/lib/data";
import { markMessageReadAction } from "@/lib/contact-actions";
import { formatDate, waNumber, cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const { t } = await getT();
  const messages = await getMessages();
  const unread = messages.filter((m) => !m.read).length;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header + compact stats */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{t("admin.messages.title")}</h1>
          <p className="text-sm text-ink-soft">{t("admin.messages.subtitle")}</p>
        </div>
        <div className="flex gap-3">
          <div className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <MessageSquare className="h-4 w-4" />
            </span>
            <span className="leading-tight">
              <span className="font-display text-lg font-extrabold text-ink">{messages.length}</span>
              <span className="ms-1 text-xs text-ink-soft">{t("admin.messages.kpiTotal")}</span>
            </span>
          </div>
          <div className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Mail className="h-4 w-4" />
            </span>
            <span className="leading-tight">
              <span className="font-display text-lg font-extrabold text-ink">{unread}</span>
              <span className="ms-1 text-xs text-ink-soft">{t("admin.messages.kpiUnread")}</span>
            </span>
          </div>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
            <MessageSquare className="h-7 w-7" />
          </div>
          <p className="mt-4 font-display text-lg font-semibold text-ink">{t("admin.messages.empty.title")}</p>
          <p className="mt-1 text-sm text-ink-soft">{t("admin.messages.empty.body")}</p>
        </div>
      ) : (
        <Card className="gap-0 overflow-hidden p-0">
          <div className="divide-y divide-slate-100">
            {messages.map((m) => {
              const tel = m.phone.replace(/\s/g, "");
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex items-start gap-4 px-4 py-4 transition-colors hover:bg-slate-50 sm:px-5",
                    !m.read && "bg-brand-50/40",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      m.read ? "bg-slate-100 text-slate-500" : "bg-brand-100 text-brand-700",
                    )}
                    aria-hidden
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {!m.read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-hidden />}
                      <p className="font-display font-semibold text-ink" dir="auto">{m.name}</p>
                      <a href={`tel:${tel}`} className="text-xs text-ink-soft hover:text-brand-600" dir="ltr">
                        {m.phone}
                      </a>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft" dir="auto">{m.message}</p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="whitespace-nowrap text-xs text-ink-soft">{formatDate(m.createdAt)}</span>
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
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-ink-soft transition hover:bg-slate-50"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                      {!m.read && (
                        <form action={markMessageReadAction.bind(null, m.id)}>
                          <button
                            type="submit"
                            title={t("admin.messages.markRead")}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-200 text-brand-700 transition hover:bg-brand-50"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
