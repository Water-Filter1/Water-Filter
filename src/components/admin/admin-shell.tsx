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
  Bell,
  LogOut,
  MessageSquare,
  UserCog,
  Wrench,
  Inbox,
  Droplet,
  Boxes,
  Wallet,
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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Sidebar,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  useSidebar,
} from "@/components/ui/sidebar";
import type { AdminNotifications } from "@/lib/data";

const NAV = [
  { labelKey: "admin.nav.dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { labelKey: "admin.nav.products", href: "/admin/products", icon: Package },
  { labelKey: "admin.nav.orders", href: "/admin/orders", icon: ShoppingBag },
  { labelKey: "admin.nav.factures", href: "/admin/factures", icon: Receipt },
  { labelKey: "admin.nav.inbox", href: "/admin/inbox", icon: Inbox },
  { labelKey: "admin.nav.clients", href: "/admin/clients", icon: Users },
  { labelKey: "admin.nav.service", href: "/admin/service", icon: Wrench },
  { labelKey: "admin.nav.stock", href: "/admin/stock", icon: Boxes },
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

/** Per-nav-item count badge (color + value) driven by live notifications. */
function navBadge(href: string, n: AdminNotifications): { count: number; cls: string } | null {
  if (href === "/admin/orders" && n.pendingCount > 0) return { count: n.pendingCount, cls: "bg-amber-400 text-amber-950" };
  if (href === "/admin/inbox") {
    const c = n.unreadMessagesCount + n.pendingReviewsCount;
    if (c > 0) return { count: c, cls: "bg-brand-300 text-brand-950" };
  }
  if (href === "/admin/service" && n.maintenanceDueCount > 0) return { count: n.maintenanceDueCount, cls: "bg-orange-400 text-orange-950" };
  return null;
}

/** The shadcn Sidebar (desktop rail + built-in mobile drawer). Rendered inside SidebarProvider. */
function AppSidebar({ notifs, user }: { notifs: AdminNotifications; user: { email: string; role: string } | null }) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const side = dirFor(locale) === "rtl" ? "right" : "left";
  const roleLabel =
    user?.role === "plombier"
      ? t("admin.usersManager.role.technicien")
      : user?.role === "confirmateur"
        ? t("admin.usersManager.role.confirmateur")
        : t("admin.usersManager.role.admin");
  const initial = (user?.email?.[0] ?? "A").toUpperCase();

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));
  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar side={side} dir={dirFor(locale)} collapsible="offcanvas" className="print:hidden">
      <SidebarHeader className="p-0">
        <Link href="/admin" onClick={closeMobile} className="flex items-center gap-3 px-5 py-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-aqua-500 text-white shadow-[0_8px_24px_-8px_rgba(34,211,238,0.6)]">
            <Droplet className="h-5 w-5" fill="currentColor" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-lg font-extrabold tracking-tight text-white">
              Filtre<span className="text-brand-300">Maroc</span>
            </p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{t("admin.space")}</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup className="p-0">
          <SidebarMenu className="gap-1">
            {NAV.map((item) => {
              const active = isActive(item.href, item.exact);
              const b = navBadge(item.href, notifs);
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={active}
                    className="h-10 gap-3 rounded-xl px-3 font-medium text-slate-300 hover:bg-white/5 hover:text-white data-active:bg-gradient-to-r data-active:from-brand-500 data-active:to-brand-600 data-active:font-medium data-active:text-white data-active:shadow-[0_10px_22px_-10px_rgba(31,143,214,0.85)]"
                    render={<Link href={item.href} onClick={closeMobile} />}
                  >
                    <item.icon />
                    <span>{t(item.labelKey)}</span>
                  </SidebarMenuButton>
                  {b && <SidebarMenuBadge className={cn("right-auto end-1 font-bold", b.cls)}>{b.count}</SidebarMenuBadge>}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-1 border-t border-white/10">
        <Link
          href="/"
          onClick={closeMobile}
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
        {/* account — visible, under Log out */}
        <div className="mt-1 flex items-center gap-3 border-t border-white/10 px-3 pt-3">
          <Avatar className="size-9 shrink-0">
            <AvatarFallback className="bg-brand-600 text-sm font-bold text-white">{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-white">{roleLabel}</p>
            <p className="truncate text-xs text-slate-400" dir="ltr">{user?.email}</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AdminShell({
  children,
  notifications,
  user,
}: {
  children: React.ReactNode;
  notifications?: AdminNotifications;
  user?: { email: string; role: string } | null;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
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

  // Login page renders without the admin shell
  if (pathname === "/admin/login") return <>{children}</>;

  const badge =
    notifs.pendingCount +
    notifs.lowStockCount +
    notifs.unreadMessagesCount +
    notifs.maintenanceDueCount +
    notifs.pendingReviewsCount;

  return (
    <SidebarProvider>
      <AppSidebar notifs={notifs} user={user ?? null} />
      <SidebarInset className="bg-neutral-50 print:bg-white">
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-white/80 px-4 backdrop-blur lg:px-8 print:hidden">
          <SidebarTrigger className="text-ink hover:bg-neutral-100" />

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
                          href="/admin/inbox"
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
                          href="/admin/service"
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

          </div>
        </header>

        <div className="p-4 lg:p-8 print:p-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
