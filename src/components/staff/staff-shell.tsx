"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wrench, PhoneCall, Droplet, LogOut } from "lucide-react";
import { logoutAction } from "@/lib/auth-actions";
import { useI18n } from "@/i18n/i18n-context";
import { dirFor } from "@/i18n/config";
import { LanguageSwitcher } from "@/components/language-switcher";
import { StaffBell } from "@/components/staff/staff-bell";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  useSidebar,
} from "@/components/ui/sidebar";

type StaffUser = { email: string; role: string } | null;
type Variant = "technician" | "confirmation";
type BellInitial = React.ComponentProps<typeof StaffBell>["initial"];

// One serializable `variant` string drives everything (server→client can't pass component props).
const VARIANTS = {
  technician: { home: "/technicien", Icon: Wrench, navLabelKey: "tech.title", spaceKey: "tech.space", bellArea: "plombier" as const },
  confirmation: { home: "/confirmation", Icon: PhoneCall, navLabelKey: "conf.title", spaceKey: "conf.space", bellArea: "confirmation" as const },
};

/** The same shadcn Sidebar the admin uses — dark rail + built-in mobile drawer. */
function StaffSidebar({ user, variant }: { user: StaffUser; variant: Variant }) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const v = VARIANTS[variant];
  const NavIcon = v.Icon;
  const side = dirFor(locale) === "rtl" ? "right" : "left";
  const roleLabel =
    user?.role === "plombier"
      ? t("admin.usersManager.role.technicien")
      : user?.role === "confirmateur"
        ? t("admin.usersManager.role.confirmateur")
        : t("admin.usersManager.role.admin");
  const initial = (user?.email?.[0] ?? "U").toUpperCase();
  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };
  const active = pathname.startsWith(v.home);

  return (
    <Sidebar side={side} dir={dirFor(locale)} collapsible="offcanvas">
      <SidebarHeader className="p-0">
        <Link href={v.home} onClick={closeMobile} className="flex items-center gap-3 px-5 py-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-aqua-500 text-white shadow-[0_8px_24px_-8px_rgba(34,211,238,0.6)]">
            <Droplet className="h-5 w-5" fill="currentColor" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-lg font-extrabold tracking-tight text-white">
              Filtre<span className="text-brand-300">Maroc</span>
            </p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{t(v.spaceKey)}</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup className="p-0">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={active}
                className="h-10 gap-3 rounded-xl px-3 font-medium text-slate-300 hover:bg-white/5 hover:text-white data-active:bg-gradient-to-r data-active:from-brand-500 data-active:to-brand-600 data-active:font-medium data-active:text-white data-active:shadow-[0_10px_22px_-10px_rgba(31,143,214,0.85)]"
                render={<Link href={v.home} onClick={closeMobile} />}
              >
                <NavIcon />
                <span>{t(v.navLabelKey)}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-1 border-t border-white/10">
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

export function StaffShell({
  children,
  user,
  notif,
  variant,
}: {
  children: React.ReactNode;
  user: StaffUser;
  notif: BellInitial;
  variant: Variant;
}) {
  const { t } = useI18n();
  const v = VARIANTS[variant];
  return (
    <SidebarProvider>
      <StaffSidebar user={user} variant={variant} />
      <SidebarInset className="bg-neutral-50">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-white/80 px-4 backdrop-blur lg:px-8">
          <SidebarTrigger className="text-ink hover:bg-neutral-100" />
          <h1 className="font-display text-lg font-bold text-ink">{t(v.navLabelKey)}</h1>
          <div className="ms-auto flex items-center gap-3">
            <LanguageSwitcher />
            <StaffBell area={v.bellArea} initial={notif} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl p-4 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
