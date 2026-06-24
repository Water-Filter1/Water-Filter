"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, ShieldCheck, PhoneCall, Wrench, Pencil } from "lucide-react";
import {
  createStaffUserAction,
  deleteStaffUserAction,
  updateStaffUserAction,
} from "@/lib/users-actions";
import type { StaffUser } from "@/lib/data";
import { useI18n } from "@/i18n/i18n-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { dashboardFont, dashboardFontStyle } from "@/lib/fonts";
import { cn } from "@/lib/utils";

const ROLE_META: Record<string, { labelKey: string; className: string; icon: typeof ShieldCheck }> = {
  admin: { labelKey: "admin.usersManager.role.admin", className: "bg-brand-100 text-brand-700", icon: ShieldCheck },
  confirmateur: { labelKey: "admin.usersManager.role.confirmateur", className: "bg-amber-100 text-amber-700", icon: PhoneCall },
  plombier: { labelKey: "admin.usersManager.role.technicien", className: "bg-emerald-100 text-emerald-700", icon: Wrench },
};

export function UsersManager({ users, currentUserId }: { users: StaffUser[]; currentUserId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "confirmateur", city: "" });
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      const res = await createStaffUserAction(form);
      if (res.ok) {
        setOkMsg(t("admin.usersManager.accountCreated"));
        setForm({ email: "", name: "", password: "", role: "confirmateur", city: "" });
        router.refresh();
      } else {
        setError(res.error ?? t("admin.usersManager.error"));
      }
    });
  }

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    startTransition(async () => {
      const res = await deleteStaffUserAction(id);
      if (!res.ok) setError(res.error ?? t("admin.usersManager.error"));
      else router.refresh();
      setDeleteTarget(null);
    });
  }

  // --- edit ---
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [eForm, setEForm] = useState({ email: "", name: "", role: "confirmateur", password: "", city: "" });
  const [eError, setEError] = useState<string | null>(null);

  function openEdit(u: StaffUser) {
    setEditing(u);
    setEForm({ email: u.email, name: u.name ?? "", role: u.role, password: "", city: u.city ?? "" });
    setEError(null);
  }

  function saveEdit() {
    if (!editing) return;
    setEError(null);
    startTransition(async () => {
      const res = await updateStaffUserAction(editing.id, eForm);
      if (res.ok) {
        setEditing(null);
        router.refresh();
      } else {
        setEError(res.error ?? t("admin.usersManager.error"));
      }
    });
  }

  const roleLabel = (role: string) => {
    switch (role) {
      case "confirmateur":
        return t("admin.usersManager.role.confirmateur");
      case "plombier":
        return t("admin.usersManager.role.technicien");
      case "admin":
        return t("admin.usersManager.role.admin");
      default:
        return "";
    }
  };

  const columns: Column<StaffUser>[] = [
    {
      key: "name",
      header: t("admin.usersManager.nameLabel"),
      sort: (u) => u.name || u.email,
      cell: (u) => {
        const meta = ROLE_META[u.role] ?? ROLE_META.admin;
        return (
          <div className="flex items-center gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.className}`}>
              <meta.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-ink">
                {u.name || u.email}
                {u.id === currentUserId && (
                  <span className="ms-2 text-xs font-semibold text-ink-soft">{t("admin.usersManager.you")}</span>
                )}
              </p>
              <p className="truncate text-xs text-ink-soft">
                {u.email}
                {u.city ? ` · ${u.city}` : ""}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "email",
      header: t("admin.usersManager.emailLabel"),
      sort: (u) => u.email,
      cell: (u) => <span className="text-ink-soft">{u.email}</span>,
    },
    {
      key: "role",
      header: t("admin.usersManager.roleLabel"),
      sort: (u) => u.role,
      cell: (u) => {
        const meta = ROLE_META[u.role] ?? ROLE_META.admin;
        return (
          <Badge className={`shrink-0 rounded-full font-semibold ${meta.className}`}>
            {t(meta.labelKey)}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: t("admin.productsPage.colActions"),
      headClassName: "text-end",
      className: "text-end",
      cell: (u) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => openEdit(u)}
            disabled={pending}
            className="shrink-0 rounded-lg text-ink-soft hover:bg-brand-50 hover:text-brand-600"
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">{t("admin.usersManager.edit")}</span>
          </Button>
          {u.id !== currentUserId && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setDeleteTarget({ id: u.id, label: u.name || u.email })}
              disabled={pending}
              className="shrink-0 rounded-lg text-ink-soft hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">{t("admin.usersManager.delete")}</span>
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="grid gap-6 font-semibold lg:grid-cols-[22rem_1fr]">
      {/* Add form */}
      <Card className="h-fit gap-0 px-5 py-5">
        <form onSubmit={add}>
          <h2 className="flex items-center gap-2 font-display font-bold text-ink">
            <UserPlus className="h-5 w-5 text-brand-500" /> {t("admin.usersManager.newMember")}
          </h2>

          {error && (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {okMsg && (
            <Alert className="mt-3 border-emerald-200 bg-emerald-50">
              <AlertDescription className="text-emerald-700">{okMsg}</AlertDescription>
            </Alert>
          )}

          <Label className="mt-4 block text-sm font-semibold text-ink">{t("admin.usersManager.roleLabel")}</Label>
          <Select
            value={form.role}
            onValueChange={(v) => setForm({ ...form, role: String(v) })}
          >
            <SelectTrigger className="mt-1 h-11 w-full rounded-xl">
              <SelectValue>
                {(value) => {
                  switch (String(value)) {
                    case "confirmateur":
                      return t("admin.usersManager.roleOption.confirmateur");
                    case "plombier":
                      return t("admin.usersManager.roleOption.technicien");
                    case "admin":
                      return t("admin.usersManager.roleOption.admin");
                    default:
                      return "";
                  }
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confirmateur">{t("admin.usersManager.roleOption.confirmateur")}</SelectItem>
              <SelectItem value="plombier">{t("admin.usersManager.roleOption.technicien")}</SelectItem>
              <SelectItem value="admin">{t("admin.usersManager.roleOption.admin")}</SelectItem>
            </SelectContent>
          </Select>

          <Label className="mt-3 block text-sm font-semibold text-ink">{t("admin.usersManager.nameLabel")}</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 h-11 rounded-xl"
            placeholder={t("admin.usersManager.namePlaceholder")}
          />

          {form.role === "plombier" && (
            <>
              <Label className="mt-3 block text-sm font-semibold text-ink">{t("admin.usersManager.cityLabel")}</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="mt-1 h-11 rounded-xl"
                placeholder={t("admin.usersManager.cityPlaceholder")}
              />
              <p className="mt-1 text-xs text-ink-soft">
                {t("admin.usersManager.cityHelp")}
              </p>
            </>
          )}

          <Label className="mt-3 block text-sm font-semibold text-ink">{t("admin.usersManager.emailLabel")}</Label>
          <Input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 h-11 rounded-xl"
            placeholder="nom@exemple.com"
          />

          <Label className="mt-3 block text-sm font-semibold text-ink">{t("admin.usersManager.passwordLabel")}</Label>
          <Input
            type="text"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="mt-1 h-11 rounded-xl"
            placeholder={t("admin.usersManager.passwordPlaceholder")}
          />
          <p className="mt-1 text-xs text-ink-soft">
            {t("admin.usersManager.passwordHelp")}
          </p>

          <Button
            type="submit"
            disabled={pending}
            className="mt-4 w-full font-semibold"
          >
            {pending ? t("admin.usersManager.creating") : t("admin.usersManager.createAccount")}
          </Button>
        </form>
      </Card>

      {/* List */}
      <div className="space-y-3">
        <h2 className="font-display font-bold text-ink">
          {t("admin.usersManager.team", { count: users.length })}
        </h2>
        <DataTable
          rows={users}
          columns={columns}
          getRowId={(u) => u.id}
          search={(u) => `${u.name ?? ""} ${u.email} ${u.city ?? ""} ${roleLabel(u.role)}`}
          onRowClick={(u) => openEdit(u)}
          defaultSortKey="name"
          defaultSortDir="asc"
          minWidth="min-w-[640px]"
        />
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className={cn(dashboardFont.variable, "gap-0 overflow-hidden p-0 font-semibold sm:max-w-lg")} style={dashboardFontStyle}>
          {editing && (() => {
            const RoleIcon = (ROLE_META[eForm.role] ?? ROLE_META.admin).icon;
            return (
              <>
                <DialogHeader className="border-b border-slate-100 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ring-black/5", (ROLE_META[eForm.role] ?? ROLE_META.admin).className)}>
                      <RoleIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <DialogTitle className="font-display text-base font-bold text-ink">{t("admin.usersManager.editMember")}</DialogTitle>
                      <p className="truncate text-sm font-semibold text-ink-soft" dir="ltr">{editing.email}</p>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4 px-6 py-5">
                  {eError && (
                    <Alert variant="destructive">
                      <AlertDescription>{eError}</AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <Label className="mb-1.5 block text-sm font-semibold text-ink">{t("admin.usersManager.roleLabel")}</Label>
                    <Select
                      value={eForm.role}
                      onValueChange={(v) => setEForm({ ...eForm, role: String(v) })}
                      disabled={editing.id === currentUserId}
                    >
                      <SelectTrigger className="h-11 w-full rounded-xl disabled:opacity-60">
                        <SelectValue>{(value) => roleLabel(String(value))}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className={cn(dashboardFont.variable, "font-semibold")} style={dashboardFontStyle}>
                        <SelectItem value="confirmateur">{t("admin.usersManager.role.confirmateur")}</SelectItem>
                        <SelectItem value="plombier">{t("admin.usersManager.role.technicien")}</SelectItem>
                        <SelectItem value="admin">{t("admin.usersManager.role.admin")}</SelectItem>
                      </SelectContent>
                    </Select>
                    {editing.id === currentUserId && (
                      <p className="mt-1 text-xs text-ink-soft">{t("admin.usersManager.cannotChangeOwnRole")}</p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="mb-1.5 block text-sm font-semibold text-ink">{t("admin.usersManager.nameLabel")}</Label>
                      <Input value={eForm.name} onChange={(e) => setEForm({ ...eForm, name: e.target.value })} className="h-11 rounded-xl" />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-sm font-semibold text-ink">{t("admin.usersManager.emailLabel")}</Label>
                      <Input type="email" value={eForm.email} onChange={(e) => setEForm({ ...eForm, email: e.target.value })} className="h-11 rounded-xl" />
                    </div>
                  </div>

                  {eForm.role === "plombier" && (
                    <div>
                      <Label className="mb-1.5 block text-sm font-semibold text-ink">{t("admin.usersManager.cityLabel")}</Label>
                      <Input value={eForm.city} onChange={(e) => setEForm({ ...eForm, city: e.target.value })} className="h-11 rounded-xl" placeholder={t("admin.usersManager.cityPlaceholder")} />
                    </div>
                  )}

                  <div>
                    <Label className="mb-1.5 block text-sm font-semibold text-ink">{t("admin.usersManager.newPasswordLabel")}</Label>
                    <Input type="text" value={eForm.password} onChange={(e) => setEForm({ ...eForm, password: e.target.value })} placeholder={t("admin.usersManager.newPasswordPlaceholder")} className="h-11 rounded-xl" />
                  </div>
                </div>

                <DialogFooter className="m-0 border-t border-slate-100 bg-white px-6 py-4">
                  <Button variant="outline" onClick={() => setEditing(null)} className="font-semibold text-ink-soft">{t("admin.usersManager.cancel")}</Button>
                  <Button onClick={saveEdit} disabled={pending} className="font-semibold">
                    {pending ? t("admin.usersManager.saving") : t("admin.usersManager.save")}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className={cn(dashboardFont.variable, "gap-0 overflow-hidden p-0 font-semibold sm:max-w-sm")} style={dashboardFontStyle}>
          <DialogHeader className="px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-100">
                <Trash2 className="h-5 w-5" />
              </span>
              <DialogTitle className="font-display text-base font-bold text-ink">{t("admin.usersManager.deleteTitle")}</DialogTitle>
            </div>
          </DialogHeader>
          <p className="px-6 pb-5 text-sm text-ink-soft" dir="auto">
            {deleteTarget ? t("admin.usersManager.deleteConfirm", { label: deleteTarget.label }) : ""}
          </p>
          <DialogFooter className="m-0 border-t border-slate-100 bg-white px-6 py-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="font-semibold text-ink-soft">{t("admin.usersManager.cancel")}</Button>
            <Button onClick={confirmDelete} disabled={pending} className="bg-rose-600 font-semibold text-white hover:bg-rose-700">
              {pending ? t("admin.usersManager.saving") : t("admin.usersManager.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
