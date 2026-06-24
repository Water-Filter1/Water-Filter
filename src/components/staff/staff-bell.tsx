"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchStaffNotificationsAction } from "@/lib/notifications-actions";
import type { StaffNotif } from "@/lib/data";
import { useI18n } from "@/i18n/i18n-context";

export function StaffBell({
  area,
  initial,
}: {
  area: "confirmation" | "plombier";
  initial: StaffNotif;
}) {
  const { t } = useI18n();
  const [notif, setNotif] = useState<StaffNotif>(initial);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(async () => {
      const n = await fetchStaffNotificationsAction(area);
      if (n) setNotif(n);
    }, 30000);
    return () => clearInterval(id);
  }, [area]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const label = area === "confirmation" ? t("staff.bell.ordersToConfirm") : t("staff.bell.installationsToDo");

  return (
    <div ref={ref} className="relative font-semibold">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className="relative"
      >
        <span className="sr-only">{t("staff.bell.notificationsAria")}</span>
        <Bell className="h-5 w-5" />
        {notif.count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {notif.count > 9 ? "9+" : notif.count}
          </span>
        )}
      </Button>

      {open && (
        <Card className="absolute right-0 top-full z-50 mt-2 w-80 gap-0 rounded-2xl border border-line bg-white py-0 shadow-[var(--shadow-soft)] ring-0">
          <div className="border-b border-line px-4 py-3 font-display font-semibold text-ink">{label}</div>
          <div className="max-h-96 overflow-y-auto">
            {notif.items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm font-semibold text-ink-soft">{t("staff.bell.empty")}</div>
            ) : (
              notif.items.map((it) => (
                <Link
                  key={it.id}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Bell className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span dir="auto" className="block font-semibold text-ink">{it.title}</span>
                    <span dir="auto" className="block text-xs text-ink-soft">{it.subtitle}</span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
