import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  UserCog,
  Plus,
  Pencil,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Search,
  Check,
  Minus,
  Users as UsersIcon,
  Mail,
  Phone,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { db, logActivity, nowISO, uid } from "@/lib/db";
import { hashPassword, randomSalt, passwordStrength } from "@/lib/auth";
import { useApp } from "@/state/AppProvider";
import { PageHeader, PageBody } from "@/components/layout/AppShell";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
  Badge,
  Avatar,
  Switch,
  EmptyState,
  IconButton,
} from "@/components/ui/primitives";
import { useToast, ConfirmDialog, Modal } from "@/components/ui/overlays";
import { DataTable, type Column } from "@/components/ui/data-table";
import { SectionCard } from "@/components/common/Badges";
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  ROLE_COLORS,
  ROLE_LABELS,
  rolePermissions,
} from "@/lib/permissions";
import { formatDateTime } from "@/lib/format";
import type { Permission, Role, User } from "@/lib/types";

/* =============================================================
   المستخدمون والصلاحيات — إدارة الفريق ومصفوفة الصلاحيات
   ============================================================= */

const ROLES: Role[] = [
  "admin",
  "partner",
  "senior",
  "associate",
  "paralegal",
  "consultant",
  "client",
];

const AVATAR_COLORS = [
  "#B08419",
  "#2563C9",
  "#0F8A5F",
  "#7C3AED",
  "#0E7490",
  "#B45309",
  "#C02B3A",
  "#334155",
];

interface UserFormState {
  id?: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: Role;
  title: string;
  bio: string;
  avatarColor: string;
  isActive: boolean;
}

const EMPTY_FORM: UserFormState = {
  name: "",
  username: "",
  email: "",
  phone: "",
  role: "associate",
  title: "",
  bio: "",
  avatarColor: AVATAR_COLORS[0],
  isActive: true,
};

export default function Users() {
  const { user: me, can } = useApp();
  const toast = useToast();
  const users = useLiveQuery(() => db.users.orderBy("createdAt").toArray(), [], []);
  const activity = useLiveQuery(() => db.activity.orderBy("at").reverse().limit(60).toArray(), [], []);

  const [editing, setEditing] = useState<UserFormState | null>(null);
  const [permUser, setPermUser] = useState<User | null>(null);
  const [pwUser, setPwUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ------------------------------ نموذج المستخدم ------------------------------ */

  const saveUser = async () => {
    if (!editing) return;
    if (!editing.name.trim()) return toast.error("اسم المستخدم مطلوب");
    if (!editing.username.trim()) return toast.error("اسم الدخول مطلوب");

    const dup = (users ?? []).find(
      (u) =>
        u.username.toLowerCase() === editing.username.trim().toLowerCase() &&
        u.id !== editing.id,
    );
    if (dup) return toast.error("اسم الدخول مستخدم بالفعل");

    setSaving(true);
    const isNew = !editing.id;
    const id = editing.id ?? uid("usr_");

    if (isNew) {
      const salt = randomSalt();
      const payload: User = {
        id,
        name: editing.name.trim(),
        username: editing.username.trim(),
        email: editing.email,
        phone: editing.phone,
        role: editing.role,
        title: editing.title,
        bio: editing.bio,
        avatarColor: editing.avatarColor,
        salt,
        passwordHash: await hashPassword("Admin@2025", salt),
        isActive: editing.isActive,
        createdAt: nowISO(),
        notificationsEnabled: true,
      };
      await db.users.add(payload);
      await logActivity({
        userId: me?.id,
        userName: me?.name ?? "—",
        action: "إضافة",
        entity: "مستخدم",
        entityId: id,
        meta: payload.name,
      });
      toast.success("تمت إضافة المستخدم — كلمة المرور الابتدائية: Admin@2025");
    } else {
      await db.users.update(id, {
        name: editing.name.trim(),
        username: editing.username.trim(),
        email: editing.email,
        phone: editing.phone,
        role: editing.role,
        title: editing.title,
        bio: editing.bio,
        avatarColor: editing.avatarColor,
        isActive: editing.isActive,
      });
      await logActivity({
        userId: me?.id,
        userName: me?.name ?? "—",
        action: "تعديل",
        entity: "مستخدم",
        entityId: id,
        meta: editing.name,
      });
      toast.success("تم تحديث بيانات المستخدم");
    }
    setSaving(false);
    setEditing(null);
  };

  const removeUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await db.users.delete(deleteTarget.id);
    await logActivity({
      userId: me?.id,
      userName: me?.name ?? "—",
      action: "حذف",
      entity: "مستخدم",
      entityId: deleteTarget.id,
      meta: deleteTarget.name,
    });
    setDeleting(false);
    setDeleteTarget(null);
    toast.success("تم حذف المستخدم");
  };

  const toggleActive = async (u: User) => {
    if (u.id === me?.id) return toast.error("لا يمكنك تعطيل حسابك الحالي");
    await db.users.update(u.id, { isActive: !u.isActive });
    toast.success(u.isActive ? "تم تعطيل الحساب" : "تم تفعيل الحساب");
  };

  /* ------------------------------ مصفوفة الصلاحيات ------------------------------ */

  const savePermOverrides = async (u: User, overrides: Partial<Record<Permission, boolean>>) => {
    await db.users.update(u.id, { permOverrides: overrides });
    await logActivity({
      userId: me?.id,
      userName: me?.name ?? "—",
      action: "تعديل",
      entity: "صلاحيات",
      entityId: u.id,
      meta: u.name,
    });
    toast.success("تم حفظ الصلاحيات المخصّصة");
  };

  /* ------------------------------ كلمة المرور ------------------------------ */

  const [pwNext, setPwNext] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  useEffect(() => {
    setPwNext("");
  }, [pwUser]);

  const changePw = async () => {
    if (!pwUser) return;
    if (pwNext.length < 8) return toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
    setPwBusy(true);
    const salt = randomSalt();
    await db.users.update(pwUser.id, { salt, passwordHash: await hashPassword(pwNext, salt) });
    await logActivity({
      userId: me?.id,
      userName: me?.name ?? "—",
      action: "تعديل",
      entity: "كلمة مرور",
      entityId: pwUser.id,
      meta: pwUser.name,
    });
    setPwBusy(false);
    setPwUser(null);
    toast.success("تم تحديث كلمة المرور");
  };

  const strength = passwordStrength(pwNext);

  /* ------------------------------ الجدول ------------------------------ */

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "المستخدم",
      mobile: "primary",
      sortValue: (u) => u.name,
      render: (u) => (
        <div className="flex min-w-[200px] items-center gap-3">
          <Avatar name={u.name} color={u.avatarColor} size={36} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-semibold text-ink">{u.name}</span>
              {u.id === me?.id && (
                <Badge tone="accent" className="px-1.5 py-0 text-[9px]">
                  أنت
                </Badge>
              )}
            </div>
            <div className="truncate text-[11.5px] text-muted">{u.title || u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "الدور",
      mobile: "secondary",
      sortValue: (u) => ROLE_LABELS[u.role],
      render: (u) => (
        <Badge
          style={{
            color: ROLE_COLORS[u.role],
            borderColor: `${ROLE_COLORS[u.role]}44`,
            backgroundColor: `${ROLE_COLORS[u.role]}18`,
          }}
        >
          {ROLE_LABELS[u.role]}
        </Badge>
      ),
    },
    {
      key: "username",
      header: "اسم الدخول",
      mobile: "row",
      sortValue: (u) => u.username,
      render: (u) => <span className="num text-[12.5px] text-muted">{u.username}</span>,
    },
    {
      key: "contact",
      header: "التواصل",
      mobile: "hidden",
      render: (u) => (
        <div className="space-y-0.5 text-[12px] text-muted">
          {u.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="size-3" /> {u.email}
            </div>
          )}
          {u.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="size-3" /> <span className="num">{u.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "perms",
      header: "الصلاحيات",
      mobile: "row",
      sortValue: (u) => rolePermissions(u.role).length,
      render: (u) => {
        const base = rolePermissions(u.role).length;
        const custom = Object.keys(u.permOverrides ?? {}).length;
        return (
          <span className="flex items-center gap-1.5 text-[12px] text-muted">
            <ShieldCheck className="size-3.5" />
            <span className="num">{base}</span>
            {custom > 0 && (
              <Badge tone="accent" className="px-1.5 py-0 text-[9px]">
                <span className="num">+{custom}</span> مخصّصة
              </Badge>
            )}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "الحالة",
      mobile: "secondary",
      sortValue: (u) => (u.isActive ? 1 : 0),
      render: (u) =>
        u.isActive ? (
          <Badge tone="ok" dot>
            نشط
          </Badge>
        ) : (
          <Badge tone="muted" dot>
            معطّل
          </Badge>
        ),
    },
    {
      key: "last",
      header: "آخر دخول",
      mobile: "hidden",
      sortValue: (u) => u.lastLoginAt ?? "",
      render: (u) => <span className="text-[12px] text-muted">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"}</span>,
    },
  ];

  const stats = useMemo(() => {
    const list = users ?? [];
    return {
      total: list.length,
      active: list.filter((u) => u.isActive).length,
      admins: list.filter((u) => u.role === "admin").length,
      customPerms: list.filter((u) => Object.keys(u.permOverrides ?? {}).length > 0).length,
    };
  }, [users]);

  return (
    <>
      <PageHeader
        title="المستخدمون والصلاحيات"
        subtitle="إدارة فريق المكتب وتحديد نطاق صلاحية كل مستخدم بدقة"
        icon={
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-2 to-accent text-accent-ink">
            <UserCog className="size-6" />
          </span>
        }
        actions={
          can("users.create") && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setEditing({ ...EMPTY_FORM })}
            >
              مستخدم جديد
            </Button>
          )
        }
      />

      <PageBody className="space-y-5">
        <div className="grid gap-3.5 sm:grid-cols-4">
          {[
            { label: "إجمالي المستخدمين", value: stats.total, icon: UsersIcon, tone: "accent" as const },
            { label: "حسابات نشطة", value: stats.active, icon: ShieldCheck, tone: "ok" as const },
            { label: "مديرو النظام", value: stats.admins, icon: ShieldAlert, tone: "warn" as const },
            { label: "صلاحيات مخصّصة", value: stats.customPerms, icon: KeyRound, tone: "info" as const },
          ].map((s) => (
            <div key={s.label} className="card flex items-center gap-3 p-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-surface-3 text-ink-soft">
                <s.icon className="size-5" />
              </span>
              <div>
                <div className="text-[12px] text-muted">{s.label}</div>
                <div className="num text-[20px] font-bold leading-tight text-ink">{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card overflow-hidden">
          <DataTable
            rows={users ?? []}
            columns={columns}
            rowKey={(u) => u.id}
            searchPlaceholder="ابحث بالاسم أو اسم الدخول أو البريد…"
            searchFn={(u, q) =>
              u.name.toLowerCase().includes(q) ||
              u.username.toLowerCase().includes(q) ||
              (u.email ?? "").toLowerCase().includes(q) ||
              ROLE_LABELS[u.role].includes(q)
            }
            emptyIcon={UsersIcon}
            emptyTitle="لا يوجد مستخدمون"
            rowActions={(u) => (
              <div className="flex items-center gap-1">
                <IconButton
                  icon={KeyRound}
                  label="الصلاحيات"
                  size="xs"
                  variant="subtle"
                  onClick={() => setPermUser(u)}
                />
                {can("users.edit") && (
                  <>
                    <IconButton
                      icon={Pencil}
                      label="تعديل"
                      size="xs"
                      variant="subtle"
                      onClick={() =>
                        setEditing({
                          id: u.id,
                          name: u.name,
                          username: u.username,
                          email: u.email ?? "",
                          phone: u.phone ?? "",
                          role: u.role,
                          title: u.title ?? "",
                          bio: u.bio ?? "",
                          avatarColor: u.avatarColor,
                          isActive: u.isActive,
                        })
                      }
                    />
                    <IconButton
                      icon={u.isActive ? ToggleRight : ToggleLeft}
                      label={u.isActive ? "تعطيل" : "تفعيل"}
                      size="xs"
                      variant="subtle"
                      onClick={() => void toggleActive(u)}
                    />
                    <IconButton
                      icon={KeyRound}
                      label="كلمة المرور"
                      size="xs"
                      variant="subtle"
                      onClick={() => setPwUser(u)}
                    />
                  </>
                )}
                {can("users.delete") && u.id !== me?.id && (
                  <IconButton
                    icon={Trash2}
                    label="حذف"
                    size="xs"
                    variant="ghost"
                    className="text-danger"
                    onClick={() => setDeleteTarget(u)}
                  />
                )}
              </div>
            )}
          />
        </div>

        {can("activity.view") && (
          <SectionCard title="سجل النشاط" subtitle="آخر العمليات على النظام" bodyClassName="p-0">
            {(activity ?? []).length === 0 ? (
              <EmptyState icon={Search} title="السجل فارغ" description="ستظهر هنا آخر التعديلات." />
            ) : (
              <div className="divide-y divide-line-soft">
                {(activity ?? []).slice(0, 12).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px]">
                    <Badge tone="muted">{a.action}</Badge>
                    <span className="text-ink-soft">{a.entity}</span>
                    <span className="min-w-0 flex-1 truncate text-muted">{a.meta}</span>
                    <span className="shrink-0 text-[11px] text-faint">{formatDateTime(a.at)}</span>
                    <span className="hidden shrink-0 text-[11.5px] text-ink-soft sm:block">{a.userName}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}
      </PageBody>

      {/* ------------------------------ نافذة المستخدم ------------------------------ */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        size="md"
        title={editing?.id ? "تعديل بيانات المستخدم" : "إضافة مستخدم جديد"}
        description="تُطبَّق صلاحيات الدور افتراضيًا، ويمكن تخصيصها بدقة من زر «الصلاحيات»."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              إلغاء
            </Button>
            <Button variant="primary" loading={saving} onClick={saveUser}>
              حفظ
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={editing.name || "؟"} color={editing.avatarColor} size={54} />
              <div className="flex-1">
                <p className="mb-2 text-[12.5px] text-muted">لون الصورة الرمزية</p>
                <div className="flex flex-wrap gap-1.5">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditing({ ...editing, avatarColor: c })}
                      className="size-7 rounded-full ring-offset-2 ring-offset-[var(--surface)] transition-transform hover:scale-110"
                      style={{
                        background: c,
                        boxShadow: editing.avatarColor === c ? `0 0 0 2px var(--accent)` : undefined,
                      }}
                      aria-label={`اللون ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <Field label="الاسم الكامل" required>
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="اسم الدخول" required>
                <Input
                  value={editing.username}
                  onChange={(e) => setEditing({ ...editing, username: e.target.value })}
                  dir="ltr"
                />
              </Field>
              <Field label="الدور" required>
                <Select
                  value={editing.role}
                  onChange={(e) => setEditing({ ...editing, role: e.target.value as Role })}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="البريد الإلكتروني">
                <Input
                  type="email"
                  value={editing.email}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  dir="ltr"
                />
              </Field>
              <Field label="رقم الجوال">
                <Input
                  value={editing.phone}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  dir="ltr"
                />
              </Field>
            </div>

            <Field label="المسمى الوظيفي">
              <Input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="مثال: محامٍ أول — تخصص قضائي"
              />
            </Field>

            <Field label="نبذة تعريفية">
              <Textarea
                value={editing.bio}
                onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
                rows={3}
              />
            </Field>

            <Switch
              checked={editing.isActive}
              onChange={(v) => setEditing({ ...editing, isActive: v })}
              label="الحساب نشط"
              description="الحسابات المعطّلة لا تستطيع تسجيل الدخول."
            />

            {!editing.id && (
              <div className="rounded-xl border border-line bg-surface-2 p-3 text-[12px] text-muted">
                كلمة المرور الابتدائية: <span className="num font-semibold text-ink">Admin@2025</span> — يُنصح
                بتغييرها فورًا من زر «كلمة المرور».
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ------------------------------ نافذة كلمة المرور ------------------------------ */}
      <Modal
        open={!!pwUser}
        onClose={() => setPwUser(null)}
        size="sm"
        title="تعيين كلمة مرور جديدة"
        description={pwUser ? `للمستخدم: ${pwUser.name}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPwUser(null)}>
              إلغاء
            </Button>
            <Button variant="primary" loading={pwBusy} onClick={changePw}>
              تعيين
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="كلمة المرور الجديدة" required>
            <Input
              type="password"
              value={pwNext}
              onChange={(e) => setPwNext(e.target.value)}
              dir="ltr"
            />
          </Field>
          {pwNext && (
            <div className="space-y-1.5">
              <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="h-full flex-1 transition-colors"
                    style={{
                      background: i < strength.score ? strength.color : "transparent",
                    }}
                  />
                ))}
              </div>
              <div className="text-[12px]" style={{ color: strength.color }}>
                قوة كلمة المرور: {strength.label}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ------------------------------ نافذة الصلاحيات ------------------------------ */}
      {permUser && <PermissionsModal user={permUser} onClose={() => setPermUser(null)} onSave={savePermOverrides} />}

      {/* ------------------------------ تأكيد الحذف ------------------------------ */}
      <DeleteUserDialog
        target={deleteTarget}
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={removeUser}
      />
    </>
  );
}

/* =============================================================
   نافذة مصفوفة الصلاحيات
   ============================================================= */

function PermissionsModal({
  user,
  onClose,
  onSave,
}: {
  user: User;
  onClose: () => void;
  onSave: (u: User, overrides: Partial<Record<Permission, boolean>>) => Promise<void>;
}) {
  const base = rolePermissions(user.role);
  const [overrides, setOverrides] = useState<Partial<Record<Permission, boolean>>>(
    () => ({ ...(user.permOverrides ?? {}) }),
  );
  const [busy, setBusy] = useState(false);

  const effective = (p: Permission): boolean =>
    typeof overrides[p] === "boolean" ? (overrides[p] as boolean) : base.includes(p);

  const toggle = (p: Permission) =>
    setOverrides((o) => ({ ...o, [p]: !effective(p) }));

  const setGroup = (items: { key: Permission }[], value: boolean) => {
    const next = { ...overrides };
    for (const it of items) next[it.key] = value;
    setOverrides(next);
  };

  const reset = () => setOverrides({});

  const grantAll = () => {
    const next: Partial<Record<Permission, boolean>> = {};
    for (const p of ALL_PERMISSIONS) next[p] = true;
    setOverrides(next);
  };

  const count = ALL_PERMISSIONS.filter((p) => effective(p)).length;

  const save = async () => {
    setBusy(true);
    await onSave(user, overrides);
    setBusy(false);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={`صلاحيات: ${user.name}`}
      description={`الدور الأساسي: ${ROLE_LABELS[user.role]} — عدّل ما تحتاجه فقط؛ ما لا تلمسه يبقى كما يحدده الدور.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="primary" loading={busy} onClick={save}>
            حفظ الصلاحيات
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-2 p-3">
          <Badge tone="accent">
            الصلاحيات المفعّلة: <span className="num">{count}</span> / {ALL_PERMISSIONS.length}
          </Badge>
          <Button size="xs" variant="subtle" icon={Check} onClick={grantAll}>
            منح الكل
          </Button>
          <Button size="xs" variant="subtle" icon={Minus} onClick={reset}>
            إعادة للدور
          </Button>
          <span className="ms-auto text-[11.5px] text-muted">
            التخصيصات المحفوظة: <span className="num">{Object.keys(overrides).length}</span>
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {PERMISSION_GROUPS.map((g) => {
            const allOn = g.items.every((i) => effective(i.key));
            const noneOn = g.items.every((i) => !effective(i.key));
            return (
              <div key={g.label} className="rounded-2xl border border-line bg-surface p-3.5">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <h4 className="text-[13px] font-bold text-ink">{g.label}</h4>
                  <div className="flex items-center gap-1">
                    <IconButton
                      icon={Check}
                      label="تفعيل المجموعة"
                      size="xs"
                      variant="subtle"
                      onClick={() => setGroup(g.items, true)}
                    />
                    <IconButton
                      icon={Minus}
                      label="تعطيل المجموعة"
                      size="xs"
                      variant="subtle"
                      onClick={() => setGroup(g.items, false)}
                    />
                    <Badge tone={allOn ? "ok" : noneOn ? "muted" : "accent"}>
                      {allOn ? "الكل" : noneOn ? "لا شيء" : "جزئي"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {g.items.map((it) => {
                    const on = effective(it.key);
                    const inherited = base.includes(it.key);
                    const custom = typeof overrides[it.key] === "boolean";
                    return (
                      <button
                        key={it.key}
                        onClick={() => toggle(it.key)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start transition-colors hover:bg-surface-2"
                      >
                        <span
                          className={`flex size-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-all ${
                            on ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface-2"
                          }`}
                        >
                          {on && (
                            <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3.5">
                              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className="flex-1 text-[12.5px] text-ink-soft">{it.label}</span>
                        {custom && <Badge tone="accent" className="px-1.5 py-0 text-[9px]">مخصّص</Badge>}
                        {!custom && inherited && (
                          <Badge tone="muted" className="px-1.5 py-0 text-[9px]">
                            من الدور
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

/* =============================================================
   تأكيد الحذف
   ============================================================= */

export function DeleteUserDialog({
  target,
  loading,
  onClose,
  onConfirm,
}: {
  target: User | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const pending = loading ?? busy;
  return (
    <ConfirmDialog
      open={!!target}
      onClose={onClose}
      title="حذف المستخدم"
      message={`سيتم حذف حساب «${target?.name ?? ""}» نهائيًا. لا يمكن التراجع عن هذه الخطوة.`}
      confirmLabel="حذف نهائي"
      loading={pending}
      onConfirm={async () => {
        setBusy(true);
        try {
          await onConfirm();
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
