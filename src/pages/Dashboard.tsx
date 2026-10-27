import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Scale,
  CalendarClock,
  ListTodo,
  Wallet,
  Plus,
  TrendingUp,
  Activity,
  BookOpen,
  ArrowUpRight,
  Sparkles,
  Target,
  Users,
  FolderOpen,
  Gavel,
} from "lucide-react";
import { db } from "@/lib/db";
import { useApp } from "@/state/AppProvider";
import { PageHeader, PageBody } from "@/components/layout/AppShell";
import { Button, EmptyState, Progress, Avatar } from "@/components/ui/primitives";
import { SectionCard, StatusBadge, DueBadge, EventTypeBadge, TaskPriorityBadge } from "@/components/common/Badges";
import { AreaChart, DonutChart, HBarList } from "@/components/charts/Charts";
import { MatterForm, TaskForm, EventForm } from "@/components/forms/Forms";
import {
  formatCurrency,
  formatDate,
  formatHijri,
  relativeTime,
  daysUntil,
} from "@/lib/format";
import { cn } from "@/lib/cn";

export default function Dashboard() {
  const { user, settings } = useApp();
  const navigate = useNavigate();
  const [matterOpen, setMatterOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);

  const matters = useLiveQuery(() => db.matters.toArray(), [], []);
  const clients = useLiveQuery(() => db.clients.toArray(), [], []);
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], []);
  const events = useLiveQuery(() => db.events.toArray(), [], []);
  const payments = useLiveQuery(() => db.payments.toArray(), [], []);
  const activity = useLiveQuery(() => db.activity.orderBy("at").reverse().limit(8).toArray(), [], []);
  const types = useLiveQuery(() => db.matterTypes.toArray(), [], []);
  const users = useLiveQuery(() => db.users.toArray(), [], []);
  const library = useLiveQuery(() => db.library.filter((l) => !l.archived).toArray(), [], []);

  const now = Date.now();
  const nowISO = new Date(now).toISOString();
  const activeMatters = (matters ?? []).filter((m) => !m.archived && !["closed", "judged", "settled"].includes(m.status));
  const upcoming = (events ?? [])
    .filter((e) => !e.archived && e.status === "scheduled" && new Date(e.date).getTime() > now - 86_400_000)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const weekAhead = upcoming.filter((e) => daysUntil(e.date) <= 7);
  const myTasks = (tasks ?? []).filter(
    (t) => !t.archived && t.status !== "done" && t.status !== "cancelled" && t.assigneeId === user?.id,
  );
  const overdue = (tasks ?? []).filter(
    (t) => !t.archived && t.status !== "done" && t.status !== "cancelled" && t.dueDate && daysUntil(t.dueDate) < 0,
  );
  const collected = (payments ?? [])
    .filter((p) => !p.archived && p.kind !== "expense" && p.kind !== "court_fee")
    .reduce((s, p) => s + p.amount, 0);
  const outstanding = activeMatters.reduce((s, m) => s + m.agreedFee, 0) - collected;

  const typeDistribution = useMemo(
    () =>
      (types ?? []).map((t) => ({
        label: t.name,
        value: activeMatters.filter((m) => m.typeId === t.id).length,
        color: t.color,
      })).filter((d) => d.value > 0),
    [types, activeMatters],
  );

  const monthly = useMemo(() => {
    const buckets: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i, 1);
      const label = new Intl.DateTimeFormat("ar-SA", { month: "short" }).format(d);
      const amount = (payments ?? [])
        .filter((p) => {
          const pd = new Date(p.date);
          return (
            pd.getMonth() === d.getMonth() &&
            pd.getFullYear() === d.getFullYear() &&
            p.kind !== "expense" &&
            p.kind !== "court_fee"
          );
        })
        .reduce((s, p) => s + p.amount, 0);
      buckets.push({ label, value: amount });
    }
    return buckets;
  }, [payments]);

  const clientRevenue = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of payments ?? []) {
      if (p.kind === "expense" || p.kind === "court_fee") continue;
      const m = (matters ?? []).find((x) => x.id === p.matterId);
      if (!m) continue;
      const c = (clients ?? []).find((x) => x.id === m.clientId);
      if (!c) continue;
      map.set(c.id, (map.get(c.id) ?? 0) + p.amount);
    }
    return [...map.entries()]
      .map(([id, value]) => ({
        label: (clients ?? []).find((c) => c.id === id)?.name ?? "—",
        value,
        color: "var(--accent)",
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [payments, matters, clients]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "صباح الخير" : hour < 17 ? "طاب يومك" : "مساء الخير";
  const firstName = (user?.name ?? "").replace(/^(المحامي|المحامية|د\.|أ\.|المهندس)\s*/g, "").split(" ")[0];

  const criticalMatters = activeMatters
    .filter((m) => m.priority === "critical" || (m.nextActionDate && daysUntil(m.nextActionDate) <= 2))
    .slice(0, 4);

  return (
    <>
      <PageHeader
        title={`${greeting}، ${firstName || "بذرة"}`}
        subtitle={`${formatDate(nowISO)} · ${formatHijri(nowISO)} — إليك ملخص يومك في المكتب.`}
        icon={
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-2 to-accent text-accent-ink shadow-lg">
            <Sparkles className="size-6" />
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" icon={Gavel} onClick={() => setEventOpen(true)}>
              موعد
            </Button>
            <Button variant="outline" size="sm" icon={ListTodo} onClick={() => setTaskOpen(true)}>
              مهمة
            </Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setMatterOpen(true)}>
              قضية جديدة
            </Button>
          </>
        }
      />

      <PageBody className="space-y-5">
        {/* ------------------- مؤشرات الأداء ------------------- */}
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            icon={Scale}
            tone="accent"
            label="القضايا النشطة"
            value={activeMatters.length}
            hint={`${(matters ?? []).filter((m) => m.priority === "critical").length} قضية حرجة`}
            onClick={() => navigate("/matters")}
          />
          <Kpi
            icon={CalendarClock}
            tone="warn"
            label="مواعيد خلال 7 أيام"
            value={weekAhead.length}
            hint={weekAhead[0] ? `أقربها: ${weekAhead[0].title}` : "لا مواعيد قريبة"}
            onClick={() => navigate("/calendar")}
          />
          <Kpi
            icon={ListTodo}
            tone={overdue.length ? "danger" : "info"}
            label="مهام مستحقة"
            value={myTasks.length}
            hint={overdue.length ? `${overdue.length} متأخرة` : "لا يوجد متأخر"}
            onClick={() => navigate("/tasks")}
          />
          <Kpi
            icon={Wallet}
            tone="ok"
            label="الأتعاب المحصّلة"
            value={formatCurrency(collected, settings.currency)}
            hint={`مستحق: ${formatCurrency(Math.max(0, outstanding), settings.currency)}`}
            onClick={() => navigate("/reports")}
          />
        </div>

        {/* ------------------- الرسوم البيانية ------------------- */}
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard
            title="الأداء المالي"
            subtitle="التحصيل خلال آخر ستة أشهر"
            className="lg:col-span-2"
            action={
              <Link to="/reports" className="flex items-center gap-1 text-[12px] text-accent">
                التقارير <ArrowUpRight className="size-3.5" />
              </Link>
            }
          >
            {monthly.every((m) => m.value === 0) ? (
              <EmptyState icon={TrendingUp} title="لا توجد تحصيلات مسجلة" description="سجّل المدفوعات لتظهر هنا منحنى التحصيلات." />
            ) : (
              <AreaChart data={monthly} height={200} />
            )}
          </SectionCard>

          <SectionCard title="توزيع القضايا" subtitle="حسب نوع القضية">
            {typeDistribution.length === 0 ? (
              <EmptyState icon={Target} title="لا توجد بيانات" />
            ) : (
              <DonutChart data={typeDistribution} centerLabel="قضية نشطة" centerValue={activeMatters.length} />
            )}
          </SectionCard>
        </div>

        {/* ------------------- المواعيد والمهام ------------------- */}
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard
            title="المواعيد القادمة"
            subtitle="أقرب 8 مواعيد وجلسات"
            className="lg:col-span-2"
            action={
              <Link to="/calendar" className="text-[12px] text-accent">
                التقويم الكامل
              </Link>
            }
            bodyClassName="p-0"
          >
            {upcoming.length === 0 ? (
              <EmptyState icon={CalendarClock} title="لا توجد مواعيد" description="أضف مواعيدك وجلساتك لتذكيرك بيها." />
            ) : (
              <ul className="divide-y divide-line-soft">
                {upcoming.slice(0, 8).map((e) => {
                  const m = (matters ?? []).find((x) => x.id === e.matterId);
                  const d = new Date(e.date);
                  return (
                    <li key={e.id}>
                      <Link
                        to="/calendar"
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                      >
                        <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-surface-2">
                          <span className="text-[15px] font-bold leading-none text-ink">{d.getDate()}</span>
                          <span className="mt-0.5 text-[9.5px] text-muted">
                            {new Intl.DateTimeFormat("ar-SA", { month: "short" }).format(d)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13.5px] font-semibold text-ink">{e.title}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            <EventTypeBadge type={e.type} />
                            {m && <span className="num text-[11px] text-muted">{m.number}</span>}
                            {e.location && (
                              <span className="truncate text-[11px] text-muted">· {e.location}</span>
                            )}
                          </div>
                        </div>
                        <DueBadge date={e.date} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="مهامي"
            subtitle={`${myTasks.length} مهمة مفتوحة`}
            action={
              <Link to="/tasks" className="text-[12px] text-accent">
                الكل
              </Link>
            }
            bodyClassName="p-0"
          >
            {myTasks.length === 0 ? (
              <EmptyState icon={ListTodo} title="لا مهام معلقة" description="كل شيء تحت السيطرة — عمل ممتاز." />
            ) : (
              <ul className="divide-y divide-line-soft">
                {myTasks.slice(0, 6).map((t) => {
                  const m = (matters ?? []).find((x) => x.id === t.matterId);
                  const done = t.checklist.filter((c) => c.done).length;
                  return (
                    <li key={t.id} className="px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            "mt-1 size-2 shrink-0 rounded-full",
                            t.status === "doing" ? "bg-info" : "bg-muted",
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-ink">{t.title}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <TaskPriorityBadge priority={t.priority} />
                            {m && <span className="num text-[11px] text-muted">{m.number}</span>}
                            {t.checklist.length > 0 && (
                              <span className="num text-[11px] text-muted">
                                {done}/{t.checklist.length}
                              </span>
                            )}
                          </div>
                          {t.checklist.length > 0 && (
                            <Progress
                              value={(done / t.checklist.length) * 100}
                              size="sm"
                              className="mt-1.5"
                            />
                          )}
                        </div>
                        <DueBadge date={t.dueDate} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* ------------------- قضايا تحتاج انتباه + نشاط ------------------- */}
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard
            title="قضايا تحتاج انتباهك"
            subtitle="أولوية حرجة أو خطوة قريبة"
            className="lg:col-span-2"
            action={
              <Link to="/matters" className="text-[12px] text-accent">
                كل القضايا
              </Link>
            }
            bodyClassName="p-0"
          >
            {criticalMatters.length === 0 ? (
              <EmptyState icon={Scale} title="لا توجد قضايا حرجة" description="ملفاتك كلها ضمن السيطرة." />
            ) : (
              <ul className="divide-y divide-line-soft">
                {criticalMatters.map((m) => {
                  const c = (clients ?? []).find((x) => x.id === m.clientId);
                  const t = (types ?? []).find((x) => x.id === m.typeId);
                  return (
                    <li key={m.id}>
                      <Link
                        to={`/matters/${m.id}`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                      >
                        <span
                          className="size-9 shrink-0 rounded-xl"
                          style={{ background: `${t?.color ?? "#888"}1f` }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13.5px] font-semibold text-ink">{m.title}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
                            <span className="num">{m.number}</span>·<span>{c?.name}</span>·<span>{t?.name}</span>
                          </div>
                          {m.nextAction && (
                            <div className="mt-1 truncate text-[11.5px] text-ink-soft">
                              التالي: {m.nextAction}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <StatusBadge status={m.status} />
                          <DueBadge date={m.nextActionDate} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="آخر النشاطات" subtitle="سجل العمليات" bodyClassName="p-0">
            {activity.length === 0 ? (
              <EmptyState icon={Activity} title="لا نشاطات" />
            ) : (
              <ul className="divide-y divide-line-soft">
                {activity.map((a) => (
                  <li key={a.id} className="flex gap-3 px-4 py-2.5">
                    <Avatar name={a.userName} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] leading-snug text-ink-soft">
                        <span className="font-semibold text-ink">{a.userName.split(" ").slice(0, 2).join(" ")}</span>{" "}
                        {a.action} {a.entity}
                      </div>
                      {a.meta && <div className="truncate text-[11.5px] text-muted">{a.meta}</div>}
                      <div className="text-[10.5px] text-faint">{relativeTime(a.at)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* ------------------- الوقت والأرباح والمكتبة ------------------- */}
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard title="توزيع الأتعاب حسب الموكّل" subtitle="إجمالي المتحصلات">
            {clientRevenue.length === 0 ? (
              <EmptyState icon={Users} title="لا توجد تحصيلات" />
            ) : (
              <HBarList data={clientRevenue} valueFormatter={(v) => formatCurrency(v, settings.currency)} />
            )}
          </SectionCard>

          <SectionCard title="حِمل العمل" subtitle="توزيع القضايا على المحامين">
            <div className="space-y-3">
              {(users ?? [])
                .filter((u) => u.role !== "client")
                .map((u) => {
                  const count = activeMatters.filter((m) => (m.lawyerIds ?? []).includes(u.id)).length;
                  const pct = activeMatters.length ? (count / activeMatters.length) * 100 : 0;
                  return (
                    <div key={u.id}>
                      <div className="mb-1 flex items-center gap-2">
                        <Avatar name={u.name} color={u.avatarColor} size={22} />
                        <span className="flex-1 truncate text-[12.5px] text-ink-soft">{u.name}</span>
                        <span className="num text-[12px] font-semibold text-ink">{count}</span>
                      </div>
                      <Progress value={pct} size="sm" tone={pct > 60 ? "warn" : "accent"} />
                    </div>
                  );
                })}
            </div>
          </SectionCard>

          <SectionCard
            title="من المكتبة القانونية"
            subtitle="متابعة تطويرك المهني"
            action={
              <Link to="/library" className="text-[12px] text-accent">
                المكتبة
              </Link>
            }
            bodyClassName="p-0"
          >
            <ul className="divide-y divide-line-soft">
              {(library ?? [])
                .filter((l) => l.status === "reading" || l.status === "to_read")
                .slice(0, 4)
                .map((l) => (
                  <li key={l.id} className="px-4 py-3">
                    <Link to="/library" className="block">
                      <div className="flex items-center gap-2">
                        <BookOpen className="size-3.5 shrink-0 text-accent" />
                        <span className="truncate text-[12.5px] font-semibold text-ink">{l.title}</span>
                      </div>
                      {l.progress > 0 && (
                        <div className="mt-1.5">
                          <Progress value={l.progress} size="sm" />
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              {(library ?? []).filter((l) => l.status === "reading" || l.status === "to_read").length === 0 && (
                <li>
                  <EmptyState icon={BookOpen} title="المكتبة فارغة" description="أضف كتبًا ومقالات ودورات." />
                </li>
              )}
            </ul>
          </SectionCard>
        </div>

        {/* ------------------- إجراءات سريعة ------------------- */}
        <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Plus, label: "فتح قضية جديدة", desc: "ملف متكامل في ثوانٍ", action: () => setMatterOpen(true) },
            { icon: Gavel, label: "تسجيل موعد", desc: "مع التذكير التلقائي", action: () => setEventOpen(true) },
            { icon: FolderOpen, label: "رفع وثيقة", desc: "وحفظها في أرشيف الملف", action: () => navigate("/documents") },
            { icon: Activity, label: "سجل النشاط", desc: "تتبّع كل العمليات", action: () => navigate("/settings") },
          ].map((q) => (
            <button
              key={q.label}
              onClick={q.action}
              className="group flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3.5 text-start transition-all hover:-translate-y-0.5 hover:border-accent/45"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-accent-ink">
                <q.icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-ink">{q.label}</span>
                <span className="block text-[11.5px] text-muted">{q.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </PageBody>

      <MatterForm open={matterOpen} onClose={() => setMatterOpen(false)} />
      <TaskForm open={taskOpen} onClose={() => setTaskOpen(false)} />
      <EventForm open={eventOpen} onClose={() => setEventOpen(false)} />
    </>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  onClick,
}: {
  icon: typeof Scale;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone: "accent" | "ok" | "warn" | "danger" | "info";
  onClick?: () => void;
}) {
  const tones = {
    accent: "bg-accent-soft text-accent",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
  };
  return (
    <button
      onClick={onClick}
      className="card card-hover flex items-center gap-4 p-4 text-start"
    >
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] text-muted">{label}</span>
        <span className="mt-0.5 block truncate text-[20px] font-bold leading-none text-ink">{value}</span>
        {hint && <span className="mt-1 block truncate text-[11px] text-faint">{hint}</span>}
      </span>
    </button>
  );
}
