import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Scale,
  Users,
  ListTodo,
  CalendarDays,
  FolderOpen,
  Archive,
  BookOpen,
  BarChart3,
  Award,
  UserCog,
  Settings as SettingsIcon,
  Printer,
  Search,
  Bell,
  Moon,
  Sun,
  Monitor,
  Menu,
  Plus,
  LogOut,
  PanelRightClose,
  PanelRightOpen,
  X,
  Sparkles,
  Command,
  Scale3D,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/state/AppProvider";
import { Button, IconButton, Avatar, Badge } from "@/components/ui/primitives";
import { CommandPalette } from "./CommandPalette";
import { NotificationCenter } from "./NotificationCenter";
import type { Permission } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/permissions";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Scale;
  perm?: Permission;
  end?: boolean;
}

const NAV_MAIN: NavItem[] = [
  { to: "/", label: "لوحة التحكم", icon: LayoutDashboard, perm: "dashboard.view", end: true },
  { to: "/matters", label: "القضايا والملفات", icon: Scale, perm: "matters.view" },
  { to: "/clients", label: "الموكلون", icon: Users, perm: "clients.view" },
  { to: "/tasks", label: "المهام", icon: ListTodo, perm: "tasks.view" },
  { to: "/calendar", label: "المواعيد والجلسات", icon: CalendarDays, perm: "events.view" },
  { to: "/documents", label: "الوثائق والأوراق", icon: FolderOpen, perm: "documents.view" },
];

const NAV_KNOWLEDGE: NavItem[] = [
  { to: "/library", label: "المكتبة القانونية", icon: BookOpen, perm: "library.view" },
  { to: "/archive", label: "الأرشيف", icon: Archive, perm: "archive.view" },
  { to: "/reports", label: "التقارير والتحليلات", icon: BarChart3, perm: "reports.view" },
  { to: "/print", label: "مركز الطباعة", icon: Printer, perm: "documents.print" },
];

const NAV_SYSTEM: NavItem[] = [
  { to: "/users", label: "المستخدمون والصلاحيات", icon: UserCog, perm: "users.view" },
  { to: "/settings", label: "الإعدادات", icon: SettingsIcon, perm: "settings.edit" },
];

const NAV_PORTFOLIO: NavItem[] = [
  { to: "/portfolio", label: "عرض البورتفوليو العام", icon: Award },
  { to: "/portfolio/manage", label: "تحرير البورتفوليو", icon: Pencil, perm: "portfolio.edit" },
];

const MOBILE_NAV: NavItem[] = [
  { to: "/", label: "الرئيسية", icon: LayoutDashboard, end: true },
  { to: "/matters", label: "القضايا", icon: Scale },
  { to: "/tasks", label: "المهام", icon: ListTodo },
  { to: "/calendar", label: "المواعيد", icon: CalendarDays },
  { to: "/portfolio", label: "البورتفوليو", icon: Award },
];

export function AppShell() {
  const { user, can, logout, theme, setTheme, settings, updateSettings, unreadCount } = useApp();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(settings.sidebarCollapsed);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setMobileNav(false);
    setUserMenu(false);
  }, [location.pathname]);

  const visible = (items: NavItem[]) => items.filter((i) => !i.perm || can(i.perm));

  const NavSection = ({
    items,
    label,
  }: {
    items: NavItem[];
    label?: string;
  }) => (
    <div className="space-y-1">
      {label && !collapsed && (
        <div className="px-3 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-wider text-faint">
          {label}
        </div>
      )}
      {visible(items).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200",
              isActive
                ? "bg-accent-soft text-accent shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_25%,transparent)]"
                : "text-ink-soft hover:bg-surface-2 hover:text-ink",
              collapsed && "justify-center px-0",
            )
          }
          title={collapsed ? item.label : undefined}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-accent" />
              )}
              <item.icon className="size-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-bg">
      {/* ------------------------------ الشريط الجانبي ------------------------------ */}
      <aside
        className={cn(
          "no-print sticky top-0 hidden h-screen shrink-0 flex-col border-e border-line bg-surface/80 backdrop-blur-xl transition-all duration-300 lg:flex",
          collapsed ? "w-[74px]" : "w-[258px]",
        )}
      >
        <div className={cn("flex items-center gap-3 px-4 py-4", collapsed && "justify-center px-2")}>
          <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-2 to-accent text-accent-ink shadow-lg">
            <Scale3D className="size-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate font-display text-[15px] font-bold text-ink">عدالة</div>
              <div className="truncate text-[10.5px] text-muted">إدارة أعمال المحاماة</div>
            </div>
          )}
          <IconButton
            icon={collapsed ? PanelRightOpen : PanelRightClose}
            label={collapsed ? "توسيع" : "طي"}
            size="xs"
            className="ms-auto"
            onClick={() => {
              setCollapsed((c) => !c);
              void updateSettings({ sidebarCollapsed: !collapsed });
            }}
          />
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto px-3 pb-4">
          <NavSection items={NAV_MAIN} />
          <NavSection items={NAV_KNOWLEDGE} label="المعرفة" />
          <NavSection items={NAV_PORTFOLIO} label="البورتفوليو" />
          <NavSection items={NAV_SYSTEM} label="النظام" />
        </div>

        {!collapsed && user && (
          <div className="border-t border-line p-3">
            <div className="flex items-center gap-2.5 rounded-xl bg-surface-2 p-2.5">
              <Avatar name={user.name} color={user.avatarColor} size={34} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold text-ink">{user.name}</div>
                <div className="truncate text-[11px] text-muted">{ROLE_LABELS[user.role]}</div>
              </div>
              <IconButton icon={LogOut} label="خروج" size="xs" onClick={logout} />
            </div>
          </div>
        )}
      </aside>

      {/* ------------------------------ المحتوى ------------------------------ */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-xl">
          <div className="flex items-center gap-2 px-3 py-2.5 sm:px-5">
            <IconButton
              icon={Menu}
              label="القائمة"
              className="lg:hidden"
              onClick={() => setMobileNav(true)}
            />

            <button
              onClick={() => setPaletteOpen(true)}
              className="group flex h-10 flex-1 items-center gap-2.5 rounded-xl border border-line bg-surface px-3 text-start transition-colors hover:border-accent/40 sm:max-w-md"
            >
              <Search className="size-4 shrink-0 text-muted" />
              <span className="flex-1 truncate text-[13px] text-faint">بحث سريع… (Ctrl + K)</span>
              <kbd className="hidden items-center gap-1 rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted sm:flex">
                <Command className="size-2.5" />K
              </kbd>
            </button>

            <div className="ms-auto flex items-center gap-1.5">
              <span className="hidden sm:inline-flex">
                <Button
                  size="sm"
                  variant="primary"
                  icon={Plus}
                  onClick={() => navigate("/matters?new=1")}
                >
                  قضية جديدة
                </Button>
              </span>

              <div className="relative">
                <IconButton
                  icon={Bell}
                  label="الإشعارات"
                  variant="subtle"
                  onClick={() => setNotifOpen((v) => !v)}
                />
                {unreadCount > 0 && (
                  <span className="absolute -end-0.5 -top-0.5 flex size-4.5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
                {notifOpen && <NotificationCenter onClose={() => setNotifOpen(false)} />}
              </div>

              <div className="hidden items-center rounded-xl border border-line bg-surface p-0.5 sm:flex">
                {(
                  [
                    { v: "light", icon: Sun },
                    { v: "dark", icon: Moon },
                    { v: "system", icon: Monitor },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.v}
                    onClick={() => void setTheme(t.v)}
                    title={t.v === "light" ? "نهاري" : t.v === "dark" ? "ليلي" : "النظام"}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg transition-colors",
                      theme === t.v
                        ? "bg-accent-soft text-accent"
                        : "text-muted hover:bg-surface-2 hover:text-ink",
                    )}
                  >
                    <t.icon className="size-4" />
                  </button>
                ))}
              </div>

              <div className="relative">
                <button
                  onClick={() => setUserMenu((v) => !v)}
                  className="flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-surface-2"
                >
                  <Avatar name={user?.name ?? ""} color={user?.avatarColor} size={32} />
                </button>
                {userMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} />
                    <div className="absolute end-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)] animate-scale-in">
                      <div className="border-b border-line p-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={user?.name ?? ""} color={user?.avatarColor} size={40} />
                          <div className="min-w-0">
                            <div className="truncate text-[13.5px] font-bold text-ink">{user?.name}</div>
                            <div className="truncate text-[11.5px] text-muted">{user?.title}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <Badge tone="accent">{user ? ROLE_LABELS[user.role] : ""}</Badge>
                          <Badge tone="muted">{user?.username}</Badge>
                        </div>
                      </div>
                      <div className="p-1.5">
                        <button
                          onClick={() => navigate("/portfolio")}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-ink-soft transition-colors hover:bg-surface-2"
                        >
                          <Award className="size-4" /> البورتفوليو العام
                        </button>
                        {can("portfolio.edit") && (
                          <button
                            onClick={() => navigate("/portfolio/manage")}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-ink-soft transition-colors hover:bg-surface-2"
                          >
                            <Pencil className="size-4" /> تحرير البورتفوليو
                          </button>
                        )}
                        {can("settings.edit") && (
                          <button
                            onClick={() => navigate("/settings")}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-ink-soft transition-colors hover:bg-surface-2"
                          >
                            <SettingsIcon className="size-4" /> الإعدادات
                          </button>
                        )}
                        <button
                          onClick={logout}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-danger transition-colors hover:bg-danger-soft"
                        >
                          <LogOut className="size-4" /> تسجيل الخروج
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 pb-24 lg:pb-8">
          <Outlet />
        </main>

        {/* شريط الجوال */}
        <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-xl lg:hidden">
          <div className="grid grid-cols-5">
            {MOBILE_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors",
                    isActive ? "text-accent" : "text-muted",
                  )
                }
              >
                <item.icon className="size-5" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

      {/* درج الجوال */}
      {mobileNav && (
        <div className="no-print fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setMobileNav(false)} />
          <div className="absolute inset-y-0 end-0 flex w-[82%] max-w-xs flex-col bg-surface shadow-[var(--shadow-pop)] animate-[slide-in-end_.28s_cubic-bezier(.22,1,.36,1)]">
            <div className="flex items-center gap-3 border-b border-line px-4 py-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-2 to-accent text-accent-ink">
                <Scale3D className="size-5" />
              </div>
              <div>
                <div className="font-display text-[15px] font-bold">عدالة</div>
                <div className="text-[10.5px] text-muted">إدارة أعمال المحاماة</div>
              </div>
              <IconButton icon={X} label="إغلاق" size="sm" className="ms-auto" onClick={() => setMobileNav(false)} />
            </div>
            <div className="scroll-thin flex-1 overflow-y-auto px-3 py-3">
              <NavSection items={NAV_MAIN} />
              <NavSection items={NAV_KNOWLEDGE} label="المعرفة" />
              <NavSection items={NAV_PORTFOLIO} label="البورتفوليو" />
              <NavSection items={NAV_SYSTEM} label="النظام" />
            </div>
            <div className="border-t border-line p-3">
              <Button
                block
                variant="primary"
                icon={Sparkles}
                onClick={() => navigate("/matters?new=1")}
              >
                قضية جديدة
              </Button>
            </div>
          </div>
        </div>
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-b border-line bg-surface/40">
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-start gap-4">
          {icon}
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-bold leading-tight text-ink sm:text-[26px]">{title}</h1>
            {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children && <div className="mt-5">{children}</div>}
      </div>
    </div>
  );
}

export function PageBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6", className)}>{children}</div>
  );
}
