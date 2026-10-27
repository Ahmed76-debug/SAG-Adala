import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CalendarDays,
  Plus,
  Download,
  Printer,
  FileDown,
  ChevronRight,
  ChevronLeft,
  Scale,
  MapPin,
  Clock,
  Gavel,
  AlarmClock,
  Users,
  Wallet,
  Phone,
  Briefcase,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trash2,
  Pencil,
  Filter,
  X,
  LayoutList,
  CalendarRange,
} from "lucide-react";
import { db, logActivity } from "@/lib/db";
import { useApp } from "@/state/AppProvider";
import { PageHeader, PageBody } from "@/components/layout/AppShell";
import {
  Button,
  Badge,
  Select,
  IconButton,
  EmptyState,
  StatCard,
  Segmented,
} from "@/components/ui/primitives";
import { Drawer, ConfirmDialog, useToast } from "@/components/ui/overlays";
import { SectionCard } from "@/components/common/Badges";
import { EventForm } from "@/components/forms/Forms";
import { EVENT_TYPES, EVENT_STATUS, formatDateShort, formatTime, formatHijri } from "@/lib/format";
import { downloadCsv, exportPrintArea, fileDateStamp } from "@/lib/pdf";
import { printElement } from "@/lib/print";
import { cn } from "@/lib/cn";
import type { EventType, LegalEvent } from "@/lib/types";

const WEEK_DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
const WEEK_SHORT = ["سبت", "أحد", "اثن", "ثلا", "أرب", "خمي", "جمع"];

const TYPE_ICONS: Record<EventType, typeof Gavel> = {
  hearing: Gavel,
  deadline: AlarmClock,
  meeting: Users,
  payment: Wallet,
  followup: Phone,
  internal: Briefcase,
};

const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function startOfMonth(y: number, m: number) {
  return new Date(y, m, 1);
}

/** يحوّل تاريخًا إلى رقم اليوم ضمن الأسبوع بدءًا من السبت */
function saturdayIndex(d: Date) {
  return (d.getDay() + 1) % 7;
}

export default function Calendar() {
  const { can, settings, user } = useApp();
  const toast = useToast();

  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<"month" | "agenda">("month");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<LegalEvent | null>(null);
  const [confirm, setConfirm] = useState<LegalEvent | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [matterFilter, setMatterFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const events = useLiveQuery(() => db.events.toArray(), [], []);
  const matters = useLiveQuery(() => db.matters.toArray(), [], []);

  const matterTitle = (id?: string) => (matters ?? []).find((m) => m.id === id)?.title ?? "";

  const filtered = useMemo(
    () =>
      (events ?? []).filter((e) => {
        if (e.archived) return false;
        if (typeFilter && e.type !== typeFilter) return false;
        if (matterFilter && e.matterId !== matterFilter) return false;
        if (statusFilter && e.status !== statusFilter) return false;
        return true;
      }),
    [events, typeFilter, matterFilter, statusFilter],
  );

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const cells = useMemo(() => {
    const first = startOfMonth(year, month);
    const start = new Date(first);
    start.setDate(first.getDate() - saturdayIndex(first));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [year, month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, LegalEvent[]>();
    for (const e of filtered) {
      const key = new Date(e.date).toDateString();
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.date.localeCompare(b.date));
    return map;
  }, [filtered]);

  const today = new Date();
  const todayKey = today.toDateString();

  const stats = useMemo(() => {
    const now = Date.now();
    const upcoming = filtered.filter((e) => new Date(e.date).getTime() >= now && e.status === "scheduled");
    const week = upcoming.filter((e) => new Date(e.date).getTime() - now < 7 * 86_400_000);
    const hearings = upcoming.filter((e) => e.type === "hearing");
    const deadlines = upcoming.filter((e) => e.type === "deadline");
    return { upcoming: upcoming.length, week: week.length, hearings: hearings.length, deadlines: deadlines.length };
  }, [filtered]);

  const agenda = useMemo(
    () =>
      [...filtered]
        .filter((e) => new Date(e.date).getTime() >= Date.now() - 86_400_000)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 80),
    [filtered],
  );

  const changeStatus = async (e: LegalEvent, status: LegalEvent["status"]) => {
    await db.events.update(e.id, { status, updatedAt: new Date().toISOString() });
    await logActivity({
      userId: user?.id,
      userName: user?.name ?? "—",
      action: "تحديث موعد",
      entity: "موعد",
      entityId: e.id,
      meta: `${e.title} → ${EVENT_STATUS[status].label}`,
    });
    toast.success("تم تحديث حالة الموعد");
  };

  const exportCsv = () => {
    downloadCsv(
      `المواعيد-${new Date().toISOString().slice(0, 10)}`,
      ["الموعد", "النوع", "القضية", "التاريخ", "الوقت", "المكان", "الحالة"],
      filtered.map((e) => [
        e.title,
        EVENT_TYPES[e.type].label,
        matterTitle(e.matterId),
        formatDateShort(e.date),
        formatTime(e.date),
        e.location ?? "",
        EVENT_STATUS[e.status].label,
      ]),
    );
    toast.success("تم تصدير قائمة المواعيد");
  };

  const printAgenda = () => {
    const el = document.getElementById("calendar-print-area");
    if (!el) return;
    printElement(el, {
      header: settings.printHeader,
      footer: settings.printFooter,
      title: "جدول المواعيد",
    });
  };

  const exportPdf = async () => {
    const ok = await exportPrintArea(
      "calendar-print-area",
      `جدول-المواعيد-${fileDateStamp()}`,
      {
        header: settings.printHeader,
        footer: settings.printFooter,
        orientation: "landscape",
      },
    );
    if (ok) toast.success("تم تصدير جدول المواعيد بصيغة PDF");
    else toast.error("تعذّر تصدير جدول المواعيد");
  };

  const activeFilters = [typeFilter, matterFilter, statusFilter].filter(Boolean).length;

  return (
    <>
      <PageHeader
        title="المواعيد والجلسات"
        subtitle={`${stats.upcoming} موعد قادم · ${stats.week} خلال الأسبوع`}
        icon={
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-2 to-accent text-accent-ink">
            <CalendarDays className="size-6" />
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" icon={Download} onClick={exportCsv}>
              CSV
            </Button>
            <Button variant="outline" size="sm" icon={FileDown} onClick={() => void exportPdf()}>
              تصدير PDF
            </Button>
            <Button variant="outline" size="sm" icon={Printer} onClick={printAgenda}>
              طباعة
            </Button>
            {can("events.create") && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => {
                  setEditId(undefined);
                  setDefaultDate(undefined);
                  setFormOpen(true);
                }}
              >
                موعد جديد
              </Button>
            )}
          </>
        }
      />

      <PageBody>
        <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="مواعيد قادمة" value={stats.upcoming} suffix="موعد" icon={CalendarRange} tone="info" />
          <StatCard label="خلال 7 أيام" value={stats.week} suffix="موعد" icon={Clock} tone="warn" />
          <StatCard label="جلسات قضائية" value={stats.hearings} suffix="جلسة" icon={Gavel} tone="accent" />
          <StatCard label="ميعادات نظامية" value={stats.deadlines} suffix="ميعاد" icon={AlarmClock} tone="danger" />
        </div>

        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <div className="flex items-center gap-1">
              <IconButton
                icon={ChevronRight}
                label="الشهر السابق"
                size="sm"
                variant="subtle"
                onClick={() => setCursor(new Date(year, month - 1, 1))}
              />
              <span className="min-w-[150px] text-center text-[15px] font-bold text-ink">
                {AR_MONTHS[month]} {year}
              </span>
              <IconButton
                icon={ChevronLeft}
                label="الشهر التالي"
                size="sm"
                variant="subtle"
                onClick={() => setCursor(new Date(year, month + 1, 1))}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCursor(new Date())}
            >
              اليوم
            </Button>

            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: "month", label: "تقويم", icon: CalendarDays },
                { value: "agenda", label: "قائمة", icon: LayoutList },
              ]}
            />

            <Button
              variant={activeFilters ? "gold" : "outline"}
              size="sm"
              icon={Filter}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              تصفية {activeFilters > 0 && `(${activeFilters})`}
            </Button>
            {activeFilters > 0 && (
              <Button
                variant="ghost"
                size="sm"
                icon={X}
                onClick={() => {
                  setTypeFilter("");
                  setMatterFilter("");
                  setStatusFilter("");
                }}
              >
                مسح
              </Button>
            )}
          </div>

          {filtersOpen && (
            <div className="grid gap-3 border-b border-line bg-surface-2/50 p-4 sm:grid-cols-3">
              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">كل الأنواع</option>
                {Object.entries(EVENT_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
              <Select value={matterFilter} onChange={(e) => setMatterFilter(e.target.value)}>
                <option value="">كل القضايا</option>
                {(matters ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.number} — {m.title}
                  </option>
                ))}
              </Select>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">كل الحالات</option>
                {Object.entries(EVENT_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {view === "month" ? (
            <div>
              <div className="grid grid-cols-7 border-b border-line bg-surface-2/60">
                {WEEK_DAYS.map((d, i) => (
                  <div
                    key={d}
                    className="px-1 py-2.5 text-center text-[11.5px] font-semibold text-muted sm:text-[12.5px]"
                  >
                    <span className="hidden sm:inline">{d}</span>
                    <span className="sm:hidden">{WEEK_SHORT[i]}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((d, i) => {
                  const key = d.toDateString();
                  const inMonth = d.getMonth() === month;
                  const isToday = key === todayKey;
                  const list = eventsByDay.get(key) ?? [];
                  return (
                    <div
                      key={i}
                      onDoubleClick={() => {
                        if (!can("events.create")) return;
                        setEditId(undefined);
                        setDefaultDate(d.toISOString());
                        setFormOpen(true);
                      }}
                      className={cn(
                        "group relative min-h-[92px] border-b border-l border-line-soft p-1.5 transition-colors sm:min-h-[112px]",
                        !inMonth && "bg-surface-2/40",
                        isToday && "bg-accent-soft/30",
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span
                          className={cn(
                            "num inline-flex size-6 items-center justify-center rounded-full text-[11.5px] font-semibold",
                            isToday ? "bg-accent text-accent-ink" : inMonth ? "text-ink-soft" : "text-faint",
                          )}
                        >
                          {d.getDate()}
                        </span>
                        {can("events.create") && (
                          <button
                            onClick={() => {
                              setEditId(undefined);
                              setDefaultDate(d.toISOString());
                              setFormOpen(true);
                            }}
                            className="rounded-md p-1 text-faint opacity-0 transition-opacity hover:bg-surface-2 hover:text-accent group-hover:opacity-100"
                            title="إضافة موعد"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {list.slice(0, 3).map((e) => {
                          const Icon = TYPE_ICONS[e.type];
                          const c = EVENT_TYPES[e.type].color;
                          return (
                            <button
                              key={e.id}
                              onClick={() => setSelected(e)}
                              className="flex w-full items-center gap-1 overflow-hidden rounded-md px-1.5 py-1 text-start text-[10.5px] transition-transform hover:scale-[1.02] sm:text-[11px]"
                              style={{ backgroundColor: `${c}1f`, color: c }}
                              title={e.title}
                            >
                              <Icon className="size-3 shrink-0" />
                              <span className="truncate font-medium">{e.title}</span>
                            </button>
                          );
                        })}
                        {list.length > 3 && (
                          <button
                            onClick={() => setSelected(list[3])}
                            className="px-1.5 text-[10px] font-semibold text-muted hover:text-accent"
                          >
                            + {list.length - 3} أخرى
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-line-soft">
              {agenda.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="لا توجد مواعيد قادمة"
                  description="أضف موعدًا أو جلسة جديدة لتظهر في هذا الجدول."
                />
              ) : (
                agenda.map((e) => {
                  const Icon = TYPE_ICONS[e.type];
                  const c = EVENT_TYPES[e.type].color;
                  return (
                    <button
                      key={e.id}
                      onClick={() => setSelected(e)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-surface-2"
                    >
                      <span
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${c}1f`, color: c }}
                      >
                        <Icon className="size-4.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-semibold text-ink">{e.title}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
                          <span className="num">{formatDateShort(e.date)}</span>
                          <span className="num">{formatTime(e.date)}</span>
                          {e.matterId && (
                            <span className="inline-flex items-center gap-1">
                              <Scale className="size-3" />
                              {matterTitle(e.matterId)}
                            </span>
                          )}
                          {e.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3" />
                              {e.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge style={{ color: c, borderColor: `${c}44`, backgroundColor: `${c}18` }}>
                        {EVENT_TYPES[e.type].label}
                      </Badge>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div id="calendar-print-area" className="hidden">
          <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
            جدول المواعيد — {AR_MONTHS[month]} {year}
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["الموعد", "النوع", "القضية", "التاريخ", "الوقت", "المكان", "الحالة"].map((h) => (
                  <th
                    key={h}
                    style={{ border: "1px solid #999", padding: 6, textAlign: "right", background: "#f0f0f0" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agenda.map((e) => (
                <tr key={e.id}>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{e.title}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{EVENT_TYPES[e.type].label}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{matterTitle(e.matterId) || "—"}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{formatDateShort(e.date)}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{formatTime(e.date)}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{e.location ?? "—"}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{EVENT_STATUS[e.status].label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageBody>

      {/* ------------------------- درج تفاصيل الموعد ------------------------- */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        width="md"
        title={selected?.title ?? ""}
        subtitle={selected ? EVENT_TYPES[selected.type].label : ""}
        footer={
          selected && (
            <>
              {can("events.edit") && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={CheckCircle2}
                    onClick={() => {
                      void changeStatus(selected, "done");
                      setSelected(null);
                    }}
                  >
                    تم التنفيذ
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={RotateCcw}
                    onClick={() => {
                      void changeStatus(selected, "postponed");
                      setSelected(null);
                    }}
                  >
                    تأجيل
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={XCircle}
                    onClick={() => {
                      void changeStatus(selected, "cancelled");
                      setSelected(null);
                    }}
                  >
                    إلغاء
                  </Button>
                </>
              )}
              {can("events.edit") && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Pencil}
                  onClick={() => {
                    setEditId(selected.id);
                    setFormOpen(true);
                  }}
                >
                  تعديل
                </Button>
              )}
              {can("events.delete") && (
                <IconButton
                  icon={Trash2}
                  label="حذف"
                  size="sm"
                  variant="danger"
                  onClick={() => setConfirm(selected)}
                />
              )}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-line bg-surface-2 p-4">
              <div className="text-[11px] text-muted">التاريخ</div>
              <div className="num mt-0.5 text-[15px] font-bold text-ink">{formatDateShort(selected.date)}</div>
              <div className="num text-[12.5px] text-muted">{formatTime(selected.date)}</div>
              <div className="mt-1 text-[12px] text-accent">{formatHijri(selected.date)}</div>
            </div>

            <div className="space-y-2.5 text-[13px]">
              {selected.matterId && (
                <Row icon={Scale} label="القضية" value={matterTitle(selected.matterId)} />
              )}
              {selected.location && <Row icon={MapPin} label="المكان" value={selected.location} />}
              {selected.courtRoom && <Row icon={Gavel} label="القاعة" value={selected.courtRoom} />}
              {selected.judge && <Row icon={Scale} label="القاضي" value={selected.judge} />}
              {selected.remindBeforeDays > 0 && (
                <Row icon={AlarmClock} label="التذكير" value={`قبل ${selected.remindBeforeDays} يوم`} />
              )}
            </div>

            {selected.attendees && selected.attendees.length > 0 && (
              <div>
                <div className="mb-1.5 text-[11.5px] font-semibold text-muted">الحضور</div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.attendees.map((a) => (
                    <Badge key={a} tone="muted" icon={Users}>
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selected.notes && (
              <div className="rounded-xl border border-line bg-surface-2 p-3 text-[12.5px] leading-relaxed text-ink-soft">
                <span className="mb-1 block text-[11px] text-muted">ملاحظات</span>
                {selected.notes}
              </div>
            )}

            {selected.outcome && (
              <div className="rounded-xl border border-ok/30 bg-ok-soft p-3 text-[12.5px] leading-relaxed text-ink-soft">
                <span className="mb-1 block text-[11px] text-ok">النتيجة</span>
                {selected.outcome}
              </div>
            )}

            <SectionCard title="سجل الحالة" bodyClassName="p-3">
              <div className="flex items-center gap-2">
                <Badge style={{ color: EVENT_STATUS[selected.status].color }}>
                  {EVENT_STATUS[selected.status].label}
                </Badge>
                <span className="text-[11.5px] text-muted">
                  أُضيف في {formatDateShort(selected.createdAt)}
                </span>
              </div>
            </SectionCard>
          </div>
        )}
      </Drawer>

      <EventForm open={formOpen} onClose={() => setFormOpen(false)} eventId={editId} defaultDate={defaultDate} />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (confirm) {
            await db.events.delete(confirm.id);
            toast.success("تم حذف الموعد");
          }
          setConfirm(null);
        }}
        title="حذف الموعد"
        message={`سيتم حذف «${confirm?.title}» نهائيًا من الجدول.`}
        confirmLabel="حذف نهائي"
      />
    </>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Scale; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted" />
      <div className="min-w-0">
        <div className="text-[11px] text-muted">{label}</div>
        <div className="truncate text-ink-soft">{value}</div>
      </div>
    </div>
  );
}
