"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Settings,
  ExternalLink,
  Menu,
  Bell,
  LogOut,
  MessageSquare,
  UserCog,
  Wrench,
  Star,
} from "lucide-react";
import { cn, formatMAD } from "@/lib/utils";
import { logoutAction } from "@/lib/auth-actions";
import { fetchNotificationsAction } from "@/lib/notifications-actions";
import { useI18n } from "@/i18n/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { AdminNotifications } from "@/lib/data";

const NAV = [
  { labelKey: "admin.nav.dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { labelKey: "admin.nav.products", href: "/admin/products", icon: Package },
  { labelKey: "admin.nav.orders", href: "/admin/orders", icon: ShoppingBag },
  { labelKey: "admin.nav.messages", href: "/admin/messages", icon: MessageSquare },
  { labelKey: "admin.nav.reviews", href: "/admin/reviews", icon: Star },
  { labelKey: "admin.nav.clients", href: "/admin/clients", icon: Users },
  { labelKey: "admin.nav.maintenance", href: "/admin/maintenance", icon: Wrench },
  { labelKey: "admin.nav.users", href: "/admin/users", icon: UserCog },
  { labelKey: "admin.nav.settings", href: "/admin/settings", icon: Settings },
];

const EMPTY: AdminNotifications = {
  pendingCount: 0,
  lowStockCount: 0,
  unreadMessagesCount: 0,
  maintenanceDueCount: 0,
  pendingReviewsCount: 0,
  pendingOrders: [],
  lowStock: [],
  messages: [],
  maintenance: [],
};

export function AdminShell({
  children,
  notifications,
}: {
  children: React.ReactNode;
  notifications?: AdminNotifications;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState<AdminNotifications>(notifications ?? EMPTY);
  const bellRef = useRef<HTMLDivElement>(null);

  // keep in sync with server-provided data on navigation
  useEffect(() => {
    if (notifications) setNotifs(notifications);
  }, [notifications]);

  // live refresh every 30s
  useEffect(() => {
    const id = setInterval(async () => {
      const n = await fetchNotificationsAction();
      if (n) setNotifs(n);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // close the dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  // Login page renders without the admin shell
  if (pathname === "/admin/login") return <>{children}</>;

  const badge =
    notifs.pendingCount +
    notifs.lowStockCount +
    notifs.unreadMessagesCount +
    notifs.maintenanceDueCount;

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="flex items-center px-5 py-5">
        <div className="leading-tight">
          <p className="font-display text-lg font-extrabold tracking-tight text-ink">
            Filtre<span className="text-brand-600">Maroc</span>
          </p>
          <p className="text-xs text-ink-soft">{t("admin.space")}</p>
        </div>
      </Link>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-soft hover:bg-neutral-100 hover:text-ink",
              )}
            >
              <item.icon className="h-5 w-5" />
              {t(item.labelKey)}
              {item.href === "/admin/orders" && notifs.pendingCount > 0 && (
                <span className="ms-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1 text-xs font-bold text-amber-700">
                  {notifs.pendingCount}
                </span>
              )}
              {item.href === "/admin/messages" && notifs.unreadMessagesCount > 0 && (
                <span className="ms-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-100 px-1 text-xs font-bold text-brand-700">
                  {notifs.unreadMessagesCount}
                </span>
              )}
              {item.href === "/admin/clients" && notifs.maintenanceDueCount > 0 && (
                <span className="ms-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-100 px-1 text-xs font-bold text-orange-700">
                  {notifs.maintenanceDueCount}
                </span>
              )}
              {item.href === "/admin/reviews" && notifs.pendingReviewsCount > 0 && (
                <span className="ms-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1 text-xs font-bold text-amber-700">
                  {notifs.pendingReviewsCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-neutral-100 hover:text-ink"
        >
          <ExternalLink className="h-5 w-5" />
          {t("dash.viewSite")}
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-5 w-5" />
            {t("dash.logout")}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 hidden w-64 border-e border-line bg-white lg:block">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-64 border-e border-line bg-white">
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Content */}
      <div className="lg:ps-64">
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-white/80 px-4 backdrop-blur lg:px-8">
          <button
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-neutral-100 lg:hidden"
            aria-label={t("dash.menu")}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="ms-auto flex items-center gap-3">
            <LanguageSwitcher />

            {/* Notification bell */}
            <div ref={bellRef} className="relative">
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-neutral-100"
                aria-label={t("dash.notifications")}
              >
                <Bell className="h-5 w-5" />
                {badge > 0 && (
                  <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute end-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-soft)]">
                  <div className="border-b border-line px-4 py-3 font-display font-semibold text-ink">
                    {t("dash.notifications")}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {badge === 0 && (
                      <div className="px-4 py-10 text-center text-sm text-ink-soft">
                        {t("dash.noNotifications")}
                      </div>
                    )}

                    {notifs.pendingOrders.length > 0 && (
                      <div className="py-1">
                        <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                          {t("admin.notif.pending")}
                        </p>
                        {notifs.pendingOrders.map((o) => (
                          <Link
                            key={o.id}
                            href={`/admin/orders/${o.id}`}
                            onClick={() => setBellOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                              <ShoppingBag className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1 text-sm">
                              <span className="font-medium text-ink">{o.id}</span>
                              <span className="text-ink-soft"> · {o.customerName}</span>
                              <span className="block text-xs text-ink-soft">{formatMAD(o.total)}</span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {notifs.lowStock.length > 0 && (
                      <div className="border-t border-line py-1">
                        <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                          {t("admin.notif.lowStock")}
                        </p>
                        {notifs.lowStock.map((p) => (
                          <Link
                            key={p.id}
                            href={`/admin/products/${p.id}/edit`}
                            onClick={() => setBellOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                              <Package className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1 text-sm">
                              <span dir="auto" className="line-clamp-1 font-medium text-ink">{p.name}</span>
                              <span className="block text-xs text-ink-soft">{t("admin.notif.stockLabel")} : {p.stock}</span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {notifs.messages.length > 0 && (
                      <div className="border-t border-line py-1">
                        <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                          {t("admin.notif.newMessages")}
                        </p>
                        {notifs.messages.map((m) => (
                          <Link
                            key={m.id}
                            href="/admin/messages"
                            onClick={() => setBellOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                              <MessageSquare className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1 text-sm">
                              <span dir="auto" className="font-medium text-ink">{m.name}</span>
                              <span dir="auto" className="block text-xs text-ink-soft line-clamp-1">{m.message}</span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {notifs.maintenance.length > 0 && (
                      <div className="border-t border-line py-1">
                        <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                          {t("admin.notif.maintenance")}
                        </p>
                        {notifs.maintenance.map((m) => (
                          <Link
                            key={m.id}
                            href="/admin/clients"
                            onClick={() => setBellOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                              <Wrench className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1 text-sm">
                              <span dir="auto" className="font-medium text-ink">{m.name}</span>
                              <span className="block text-xs text-ink-soft">
                                {t("admin.notif.replaceFilter")}{m.dueAt ? ` · ${new Date(m.dueAt).toLocaleDateString("fr-MA", { timeZone: "Africa/Casablanca" })}` : ""}
                              </span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link
                    href="/admin/orders"
                    onClick={() => setBellOpen(false)}
                    className="block border-t border-line px-4 py-3 text-center text-sm font-semibold text-brand-600 hover:bg-neutral-50"
                  >
                    {t("admin.notif.viewAllOrders")} →
                  </Link>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                A
              </div>
              <div className="hidden text-sm leading-tight sm:block">
                <p className="font-semibold text-ink">{t("admin.roleLabel")}</p>
                <p className="text-xs text-ink-soft">Filtre Maroc</p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
