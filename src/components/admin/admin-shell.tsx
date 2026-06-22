"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
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
  Droplet,
  Boxes,
  Wallet,
  HardHat,
  Receipt,
} from "lucide-react";
import { cn, formatMAD } from "@/lib/utils";
import { logoutAction } from "@/lib/auth-actions";
import { fetchNotificationsAction } from "@/lib/notifications-actions";
import { useI18n } from "@/i18n/i18n-context";
import { dirFor } from "@/i18n/config";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import type { AdminNotifications } from "@/lib/data";

const NAV = [
  { labelKey: "admin.nav.dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { labelKey: "admin.nav.products", href: "/admin/products", icon: Package },
  { labelKey: "admin.nav.orders", href: "/admin/orders", icon: ShoppingBag },
  { labelKey: "admin.nav.factures", href: "/admin/factures", icon: Receipt },
  { labelKey: "admin.nav.messages", href: "/admin/messages", icon: MessageSquare },
  { labelKey: "admin.nav.reviews", href: "/admin/reviews", icon: Star },
  { labelKey: "admin.nav.clients", href: "/admin/clients", icon: Users },
  { labelKey: "admin.nav.maintenance", href: "/admin/maintenance", icon: Wrench },
  { labelKey: "admin.nav.stock", href: "/admin/stock", icon: Boxes },
  { labelKey: "admin.nav.techniciens", href: "/admin/techniciens", icon: HardHat },
  { labelKey: "admin.nav.charges", href: "/admin/charges", icon: Wallet },
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
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState<AdminNotifications>(notifications ?? EMPTY);

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

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  // Login page renders without the admin shell
  if (pathname === "/admin/login") return <>{children}</>;

  const badge =
    notifs.pendingCount +
    notifs.lowStockCount +
    notifs.unreadMessagesCount +
    notifs.maintenanceDueCount +
    notifs.pendingReviewsCount;

  const drawerSide = dirFor(locale) === "rtl" ? "right" : "left";

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-aqua-500 text-white shadow-[0_8px_24px_-8px_rgba(34,211,238,0.6)]">
          <Droplet className="h-5 w-5" fill="currentColor" />
        </span>
        <div className="leading-tight">
          <p className="font-display text-lg font-extrabold tracking-tight text-white">
            Filtre<span className="text-brand-300">Maroc</span>
          </p>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            {t("admin.space")}
          </p>
        </div>
      </Link>

      <nav className="mt-3 flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-[0_10px_22px_-10px_rgba(31,143,214,0.85)]"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  active ? "text-white" : "text-slate-400 group-hover:text-white",
                )}
              />
              {t(item.labelKey)}
              {item.href === "/admin/orders" && notifs.pendingCount > 0 && (
                <Badge className="ms-auto h-5 min-w-5 justify-center bg-amber-400 px-1 text-xs font-bold text-amber-950">
                  {notifs.pendingCount}
                </Badge>
              )}
              {item.href === "/admin/messages" && notifs.unreadMessagesCount > 0 && (
                <Badge className="ms-auto h-5 min-w-5 justify-center bg-brand-300 px-1 text-xs font-bold text-brand-950">
                  {notifs.unreadMessagesCount}
                </Badge>
              )}
              {item.href === "/admin/maintenance" && notifs.maintenanceDueCount > 0 && (
                <Badge className="ms-auto h-5 min-w-5 justify-center bg-orange-400 px-1 text-xs font-bold text-orange-950">
                  {notifs.maintenanceDueCount}
                </Badge>
              )}
              {item.href === "/admin/reviews" && notifs.pendingReviewsCount > 0 && (
                <Badge className="ms-auto h-5 min-w-5 justify-center bg-amber-400 px-1 text-xs font-bold text-amber-950">
                  {notifs.pendingReviewsCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5">
          <Avatar className="size-9">
            <AvatarFallback className="bg-gradient-to-br from-brand-400 to-aqua-500 text-sm font-bold text-white">
              A
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-white">{t("admin.roleLabel")}</p>
            <p className="truncate text-xs text-slate-400">Filtre Maroc</p>
          </div>
        </div>
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ExternalLink className="h-5 w-5" />
          {t("dash.viewSite")}
        </Link>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="h-auto w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut className="h-5 w-5" />
            {t("dash.logout")}
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 print:bg-white">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 hidden w-64 border-e border-white/10 bg-gradient-to-b from-[#0c1c2f] via-[#0a1727] to-[#081320] lg:block print:!hidden">
        {SidebarContent}
      </aside>

      {/* Content */}
      <div className="lg:ps-64 print:ps-0">
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-white/80 px-4 backdrop-blur lg:px-8 print:hidden">
          {/* Mobile drawer */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label={t("dash.menu")}
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-neutral-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent
              side={drawerSide}
              showCloseButton={false}
              className="w-64 border-white/10 bg-gradient-to-b from-[#0c1c2f] via-[#0a1727] to-[#081320] p-0 data-[side=left]:w-64 data-[side=left]:sm:max-w-none data-[side=right]:w-64 data-[side=right]:sm:max-w-none"
            >
              <SheetTitle className="sr-only">{t("admin.space")}</SheetTitle>
              {SidebarContent}
            </SheetContent>
          </Sheet>

          <div className="ms-auto flex items-center gap-3">
            <LanguageSwitcher />

            {/* Notification bell */}
            <Popover open={bellOpen} onOpenChange={setBellOpen}>
              <PopoverTrigger
                aria-label={t("dash.notifications")}
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-neutral-100"
              >
                <Bell className="h-5 w-5" />
                {badge > 0 && (
                  <Badge className="absolute -end-0.5 -top-0.5 h-4 min-w-4 justify-center bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {badge > 9 ? "9+" : badge}
                  </Badge>
                )}
              </PopoverTrigger>

              <PopoverContent
                align="end"
                className="w-80 gap-0 overflow-hidden rounded-2xl border border-line p-0 text-ink shadow-[var(--shadow-soft)]"
              >
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
                          href="/admin/maintenance"
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
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-2.5">
              <Avatar className="size-9">
                <AvatarFallback className="bg-brand-600 text-sm font-bold text-white">A</AvatarFallback>
              </Avatar>
              <div className="hidden text-sm leading-tight sm:block">
                <p className="font-semibold text-ink">{t("admin.roleLabel")}</p>
                <p className="text-xs text-ink-soft">Filtre Maroc</p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
