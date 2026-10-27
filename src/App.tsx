import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  Link,
} from "react-router-dom";
import { ShieldAlert, Scale3D, Loader2, Home } from "lucide-react";
import { AppProvider, useApp } from "@/state/AppProvider";
import { AppShell } from "@/components/layout/AppShell";
import { Button, EmptyState } from "@/components/ui/primitives";
import { ToastProvider } from "@/components/ui/overlays";
import type { Permission } from "@/lib/types";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Matters from "@/pages/Matters";
import MatterDetail from "@/pages/MatterDetail";
import Clients from "@/pages/Clients";
import Tasks from "@/pages/Tasks";
import Calendar from "@/pages/Calendar";
import Documents from "@/pages/Documents";
import Archive from "@/pages/Archive";
import Library from "@/pages/Library";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";
import Settings from "@/pages/Settings";
import Portfolio from "@/pages/Portfolio";
import PortfolioAdmin from "@/pages/PortfolioAdmin";
import PrintCenter from "@/pages/PrintCenter";

/* =============================================================
   توجيه التطبيق + حرّاس الصلاحيات
   ============================================================= */

function SplashScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-2 to-accent text-accent-ink shadow-xl">
          <Scale3D className="size-8" />
        </div>
        <div className="flex items-center gap-2 text-[13px] text-muted">
          <Loader2 className="size-4 animate-spin" />
          جارٍ تجهيز النظام…
        </div>
      </div>
    </div>
  );
}

/** يمنع الوصول لغير المسجّلين */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, ready } = useApp();
  const location = useLocation();

  if (!ready) return <SplashScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

/** يمنع الوصول لمن لا يملك صلاحية محددة */
function RequirePermission({
  perm,
  children,
}: {
  perm: Permission;
  children: React.ReactNode;
}) {
  const { can } = useApp();
  if (!can(perm)) return <NoAccess perm={perm} />;
  return <>{children}</>;
}

/** صفحة منع الوصول */
function NoAccess({ perm }: { perm?: Permission }) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <EmptyState
        icon={ShieldAlert}
        title="لا تملك صلاحية الوصول إلى هذه الصفحة"
        description={
          perm
            ? `هذه الصفحة تتطلب صلاحية «${perm}». راجع مدير النظام لمنحك الصلاحية المناسبة.`
            : "تواصل مع مدير النظام لمنحك الصلاحية المناسبة."
        }
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="primary" icon={Home} onClick={() => navigate("/")}>
              العودة إلى لوحة التحكم
            </Button>
            <Link
              to="/portfolio"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
            >
              البورتفوليو العام
            </Link>
          </div>
        }
      />
    </div>
  );
}

/** إعادة التوجيه من صفحة الدخول إن كانت هناك جلسة */
function LoginRoute() {
  const { user, ready } = useApp();
  if (!ready) return <SplashScreen />;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <EmptyState
        icon={Scale3D}
        title="الصفحة غير موجودة"
        description="الرابط الذي طلبته غير متاح. استخدم قائمة التنقل للوصول إلى ما تحتاجه."
        action={
          <Link
            to="/"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-brand-ink"
          >
            العودة إلى لوحة التحكم
          </Link>
        }
      />
    </div>
  );
}

/** يعيد المستخدم إلى الأعلى عند تغيير المسار */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

/* ------------------------------ المسارات ------------------------------ */

function AppRoutes() {
  return (
    <Routes>
      {/* عامة */}
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/portfolio" element={<Portfolio />} />

      {/* محمية */}
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<RequirePermission perm="dashboard.view"><Dashboard /></RequirePermission>} />
        <Route path="matters" element={<RequirePermission perm="matters.view"><Matters /></RequirePermission>} />
        <Route path="matters/:id" element={<RequirePermission perm="matters.view"><MatterDetail /></RequirePermission>} />
        <Route path="clients" element={<RequirePermission perm="clients.view"><Clients /></RequirePermission>} />
        <Route path="tasks" element={<RequirePermission perm="tasks.view"><Tasks /></RequirePermission>} />
        <Route path="calendar" element={<RequirePermission perm="events.view"><Calendar /></RequirePermission>} />
        <Route path="documents" element={<RequirePermission perm="documents.view"><Documents /></RequirePermission>} />
        <Route path="library" element={<RequirePermission perm="library.view"><Library /></RequirePermission>} />
        <Route path="archive" element={<RequirePermission perm="archive.view"><Archive /></RequirePermission>} />
        <Route path="reports" element={<RequirePermission perm="reports.view"><Reports /></RequirePermission>} />
        <Route path="print" element={<RequirePermission perm="documents.print"><PrintCenter /></RequirePermission>} />
        <Route path="users" element={<RequirePermission perm="users.view"><Users /></RequirePermission>} />
        <Route path="settings" element={<RequirePermission perm="settings.edit"><Settings /></RequirePermission>} />
        <Route
          path="portfolio/manage"
          element={<RequirePermission perm="portfolio.edit"><PortfolioAdmin /></RequirePermission>}
        />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppProvider>
          <ScrollToTop />
          <AppRoutes />
        </AppProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
