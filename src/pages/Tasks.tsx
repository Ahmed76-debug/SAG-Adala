import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ListTodo,
  Plus,
  Download,
  Printer,
  FileDown,
  Filter,
  X,
  Pencil,
  Trash2,
  CheckCircle2,
  CircleDot,
  Circle,
  Clock,
  AlertTriangle,
  Columns3,
  Rows3,
  CalendarClock,
  Repeat,
  Link2,
  Archive,
} from "lucide-react";
import { db, logActivity } from "@/lib/db";
import { useApp } from "@/state/AppProvider";
import { PageHeader, PageBody } from "@/components/layout/AppShell";
import {
  Button,
  Badge,
  Select,
  Checkbox,
  IconButton,
  StatCard,
  Segmented,
} from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ConfirmDialog, useToast } from "@/components/ui/overlays";
import { TaskForm } from "@/components/forms/Forms";
import { TaskStatusBadge, TaskPriorityBadge, DueBadge } from "@/components/common/Badges";
import { TASK_STATUS, TASK_PRIORITY, formatDateShort, daysUntil } from "@/lib/format";
import { downloadCsv, exportPrintArea, fileDateStamp } from "@/lib/pdf";
import { printElement } from "@/lib/print";
import { cn } from "@/lib/cn";
import type { Task, TaskStatus } from "@/lib/types";

const COLUMNS: { key: TaskStatus; label: string; icon: typeof Circle; color: string }[] = [
  { key: "todo", label: "قيد الانتظار", icon: Circle, color: "#64748b" },
  { key: "doing", label: "قيد التنفيذ", icon: CircleDot, color: "#2563c9" },
  { key: "done", label: "مكتملة", icon: CheckCircle2, color: "#0f8a5f" },
];

export default function Tasks() {
  const { can, settings, user } = useApp();
  const toast = useToast();

  const [view, setView] = useState<"board" | "table">("board");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [confirm, setConfirm] = useState<{ task: Task; mode: "delete" | "archive" } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [matter, setMatter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const tasks = useLiveQuery(() => db.tasks.toArray(), [], []);
  const matters = useLiveQuery(() => db.matters.toArray(), [], []);
  const users = useLiveQuery(() => db.users.toArray(), [], []);

  const userName = (id?: string) => (users ?? []).find((u) => u.id === id)?.name ?? "—";
  const matterTitle = (id?: string) => (matters ?? []).find((m) => m.id === id)?.title ?? "";

  const filtered = useMemo(
    () =>
      (tasks ?? []).filter((t) => {
        if (showArchived ? !t.archived : t.archived) return false;
        if (status && t.status !== status) return false;
        if (priority && t.priority !== priority) return false;
        if (assignee && t.assigneeId !== assignee) return false;
        if (matter && t.matterId !== matter) return false;
        if (overdueOnly && !(t.dueDate && daysUntil(t.dueDate) < 0 && t.status !== "done")) return false;
        return true;
      }),
    [tasks, status, priority, assignee, matter, overdueOnly, showArchived],
  );

  const stats = useMemo(() => {
    const open = filtered.filter((t) => t.status !== "done" && t.status !== "cancelled");
    const overdue = open.filter((t) => t.dueDate && daysUntil(t.dueDate) < 0);
    const dueToday = open.filter((t) => t.dueDate && daysUntil(t.dueDate) === 0);
    const done = filtered.filter((t) => t.status === "done");
    return { open: open.length, overdue: overdue.length, dueToday: dueToday.length, done: done.length };
  }, [filtered]);

  const setTaskStatus = async (task: Task, next: TaskStatus) => {
    await db.tasks.update(task.id, {
      status: next,
      completedAt: next === "done" ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    });
    await logActivity({
      userId: user?.id,
      userName: user?.name ?? "—",
      action: "تحديث حالة",
      entity: "مهمة",
      entityId: task.id,
      meta: `${task.title} → ${TASK_STATUS[next].label}`,
    });
  };

  const columns: Column<Task>[] = [
    {
      key: "title",
      header: "المهمة",
      mobile: "primary",
      sortValue: (t) => t.title,
      render: (t) => (
        <div className="min-w-[220px]">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                void setTaskStatus(t, t.status === "done" ? "todo" : "done");
              }}
              className="shrink-0 text-muted transition-colors hover:text-ok"
              title={t.status === "done" ? "إعادة فتح" : "تعليم كمنجزة"}
            >
              {t.status === "done" ? (
                <CheckCircle2 className="size-4 text-ok" />
              ) : (
                <Circle className="size-4" />
              )}
            </button>
            <div className="min-w-0">
              <div className={cn("truncate font-semibold", t.status === "done" ? "text-muted line-through" : "text-ink")}>
                {t.title}
              </div>
              {t.matterId && (
                <div className="flex items-center gap-1 truncate text-[11px] text-muted">
                  <Link2 className="size-3" />
                  <span className="truncate">{matterTitle(t.matterId)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      mobile: "secondary",
      sortValue: (t) => t.status,
      render: (t) => <TaskStatusBadge status={t.status} />,
    },
    {
      key: "priority",
      header: "الأولوية",
      mobile: "row",
      sortValue: (t) => ["low", "normal", "high", "urgent"].indexOf(t.priority),
      render: (t) => <TaskPriorityBadge priority={t.priority} />,
    },
    {
      key: "assignee",
      header: "المكلَّف بها",
      mobile: "row",
      sortValue: (t) => userName(t.assigneeId),
      render: (t) => <span className="text-[12.5px]">{userName(t.assigneeId)}</span>,
    },
    {
      key: "due",
      header: "الاستحقاق",
      mobile: "secondary",
      sortValue: (t) => t.dueDate ?? "",
      render: (t) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          {t.dueDate && <span className="num text-[12px] text-muted">{formatDateShort(t.dueDate)}</span>}
          <DueBadge date={t.dueDate} />
        </div>
      ),
    },
    {
      key: "recurring",
      header: "تكرار",
      mobile: "hidden",
      render: (t) =>
        t.recurring && t.recurring !== "none" ? (
          <Badge tone="info" icon={Repeat}>
            {t.recurring === "daily" ? "يومي" : t.recurring === "weekly" ? "أسبوعي" : "شهري"}
          </Badge>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  const exportCsv = () => {
    downloadCsv(
      `المهام-${new Date().toISOString().slice(0, 10)}`,
      ["المهمة", "القضية", "المكلَّف بها", "الأولوية", "الحالة", "الاستحقاق", "الوسوم"],
      filtered.map((t) => [
        t.title,
        matterTitle(t.matterId),
        userName(t.assigneeId),
        TASK_PRIORITY[t.priority].label,
        TASK_STATUS[t.status].label,
        t.dueDate ? formatDateShort(t.dueDate) : "",
        t.tags.join(" / "),
      ]),
    );
    toast.success("تم تصدير قائمة المهام");
  };

  const printList = () => {
    const el = document.getElementById("tasks-print-area");
    if (!el) return;
    printElement(el, {
      header: settings.printHeader,
      footer: settings.printFooter,
      title: "قائمة المهام",
    });
  };

  const exportPdf = async () => {
    const ok = await exportPrintArea(
      "tasks-print-area",
      `قائمة-المهام-${fileDateStamp()}`,
      {
        header: settings.printHeader,
        footer: settings.printFooter,
        orientation: "landscape",
      },
    );
    if (ok) toast.success("تم تصدير قائمة المهام بصيغة PDF");
    else toast.error("تعذّر تصدير قائمة المهام");
  };

  const doConfirm = async () => {
    if (!confirm) return;
    const { task, mode } = confirm;
    if (mode === "delete") {
      await db.tasks.delete(task.id);
      toast.success("تم حذف المهمة");
    } else {
      await db.tasks.update(task.id, {
        archived: !task.archived,
        updatedAt: new Date().toISOString(),
      });
      toast.success(task.archived ? "تمت استعادة المهمة" : "تمت أرشفة المهمة");
    }
    setConfirm(null);
  };

  const activeFilters = [status, priority, assignee, matter].filter(Boolean).length + (overdueOnly ? 1 : 0);

  return (
    <>
      <PageHeader
        title="المهام"
        subtitle={`${stats.open} مفتوحة · ${stats.overdue} متأخرة · ${stats.done} منجزة`}
        icon={
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-2 to-accent text-accent-ink">
            <ListTodo className="size-6" />
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
            <Button variant="outline" size="sm" icon={Printer} onClick={printList}>
              طباعة
            </Button>
            {can("tasks.create") && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => {
                  setEditId(undefined);
                  setFormOpen(true);
                }}
              >
                مهمة جديدة
              </Button>
            )}
          </>
        }
      />

      <PageBody>
        <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="مهام مفتوحة" value={stats.open} suffix="مهمة" icon={Clock} tone="info" />
          <StatCard label="مهام متأخرة" value={stats.overdue} suffix="مهمة" icon={AlertTriangle} tone="danger" />
          <StatCard label="تستحق اليوم" value={stats.dueToday} suffix="مهمة" icon={CalendarClock} tone="warn" />
          <StatCard label="مهام منجزة" value={stats.done} suffix="مهمة" icon={CheckCircle2} tone="ok" />
        </div>

        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: "board", label: "لوحة", icon: Columns3 },
                { value: "table", label: "جدول", icon: Rows3 },
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
                  setStatus("");
                  setPriority("");
                  setAssignee("");
                  setMatter("");
                  setOverdueOnly(false);
                }}
              >
                مسح التصفية
              </Button>
            )}
            <div className="ms-auto">
              <Checkbox
                checked={showArchived}
                onChange={setShowArchived}
                label={<span className="flex items-center gap-1"><Archive className="size-3" /> عرض المؤرشفة</span>}
              />
            </div>
          </div>

          {filtersOpen && (
            <div className="grid gap-3 border-b border-line bg-surface-2/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">كل الحالات</option>
                {Object.entries(TASK_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">كل الأولويات</option>
                {Object.entries(TASK_PRIORITY).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
              <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">كل المكلَّفين</option>
                {(users ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
              <Select value={matter} onChange={(e) => setMatter(e.target.value)}>
                <option value="">كل القضايا</option>
                {(matters ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.number} — {m.title}
                  </option>
                ))}
              </Select>
              <div className="sm:col-span-2 lg:col-span-4">
                <Checkbox
                  checked={overdueOnly}
                  onChange={setOverdueOnly}
                  label="عرض المتأخرة فقط"
                />
              </div>
            </div>
          )}

          {view === "table" ? (
            <DataTable
              rows={filtered}
              columns={columns}
              rowKey={(t) => t.id}
              searchPlaceholder="ابحث في المهام…"
              searchFn={(t, q) =>
                t.title.toLowerCase().includes(q) ||
                (t.description ?? "").toLowerCase().includes(q) ||
                t.tags.some((x) => x.toLowerCase().includes(q))
              }
              emptyIcon={ListTodo}
              emptyTitle="لا توجد مهام"
              emptyDescription="أنشئ مهمة جديدة وحدد المسؤول والموعد."
              rowActions={(t) => (
                <div className="flex items-center gap-1">
                  {can("tasks.edit") && (
                    <IconButton
                      icon={Pencil}
                      label="تعديل"
                      size="xs"
                      onClick={() => {
                        setEditId(t.id);
                        setFormOpen(true);
                      }}
                    />
                  )}
                  {can("tasks.edit") && t.status !== "done" && (
                    <IconButton
                      icon={CheckCircle2}
                      label="إتمام"
                      size="xs"
                      onClick={() => void setTaskStatus(t, "done")}
                    />
                  )}
                  {can("tasks.delete") && (
                    <IconButton
                      icon={Trash2}
                      label="حذف"
                      size="xs"
                      onClick={() => setConfirm({ task: t, mode: "delete" })}
                    />
                  )}
                </div>
              )}
            />
          ) : (
            <div className="grid gap-4 p-4 lg:grid-cols-3">
              {COLUMNS.map((col) => {
                const items = filtered.filter((t) => t.status === col.key);
                const Icon = col.icon;
                return (
                  <div key={col.key} className="rounded-2xl border border-line bg-surface-2/40 p-3">
                    <div className="mb-3 flex items-center gap-2 px-1">
                      <Icon className="size-4" style={{ color: col.color }} />
                      <span className="text-[13px] font-bold text-ink">{col.label}</span>
                      <Badge tone="muted" className="ms-auto">
                        {items.length}
                      </Badge>
                    </div>
                    <div className="space-y-2.5">
                      {items.length === 0 && (
                        <div className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-[12px] text-faint">
                          لا توجد مهام
                        </div>
                      )}
                      {items.map((t) => (
                        <div
                          key={t.id}
                          className="group rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-soft)] transition-all hover:border-accent/40"
                        >
                          <div className="flex items-start gap-2">
                            <button
                              onClick={() => void setTaskStatus(t, t.status === "done" ? "todo" : "done")}
                              className="mt-0.5 shrink-0 text-muted transition-colors hover:text-ok"
                              title={t.status === "done" ? "إعادة فتح" : "تعليم كمنجزة"}
                            >
                              {t.status === "done" ? (
                                <CheckCircle2 className="size-4 text-ok" />
                              ) : (
                                <Circle className="size-4" />
                              )}
                            </button>
                            <div className="min-w-0 flex-1">
                              <div
                                className={cn(
                                  "text-[13px] font-semibold leading-snug",
                                  t.status === "done" ? "text-muted line-through" : "text-ink",
                                )}
                              >
                                {t.title}
                              </div>
                              {t.description && (
                                <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
                                  {t.description}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              {can("tasks.edit") && (
                                <IconButton
                                  icon={Pencil}
                                  label="تعديل"
                                  size="xs"
                                  onClick={() => {
                                    setEditId(t.id);
                                    setFormOpen(true);
                                  }}
                                />
                              )}
                              {can("tasks.delete") && (
                                <IconButton
                                  icon={Trash2}
                                  label="حذف"
                                  size="xs"
                                  onClick={() => setConfirm({ task: t, mode: "delete" })}
                                />
                              )}
                            </div>
                          </div>

                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            <TaskPriorityBadge priority={t.priority} />
                            <DueBadge date={t.dueDate} />
                            {t.matterId && (
                              <Badge tone="muted" icon={Link2}>
                                <span className="max-w-[140px] truncate">{matterTitle(t.matterId)}</span>
                              </Badge>
                            )}
                            {t.recurring && t.recurring !== "none" && (
                              <Badge tone="info" icon={Repeat}>
                                متكرر
                              </Badge>
                            )}
                          </div>

                          {t.checklist && t.checklist.length > 0 && (
                            <div className="mt-2.5 border-t border-line-soft pt-2">
                              <div className="mb-1 text-[10.5px] text-muted">
                                {t.checklist.filter((c) => c.done).length} / {t.checklist.length} من الخطوات
                              </div>
                              <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
                                <div
                                  className="h-full rounded-full bg-accent"
                                  style={{
                                    width: `${
                                      (t.checklist.filter((c) => c.done).length / t.checklist.length) * 100
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div id="tasks-print-area" className="hidden">
          <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>قائمة المهام</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["المهمة", "القضية", "المكلَّف بها", "الأولوية", "الحالة", "الاستحقاق"].map((h) => (
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
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{t.title}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{matterTitle(t.matterId) || "—"}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{userName(t.assigneeId)}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{TASK_PRIORITY[t.priority].label}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{TASK_STATUS[t.status].label}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>
                    {t.dueDate ? formatDateShort(t.dueDate) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageBody>

      <TaskForm open={formOpen} onClose={() => setFormOpen(false)} taskId={editId} />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doConfirm}
        title={confirm?.mode === "delete" ? "حذف المهمة" : "أرشفة المهمة"}
        message={
          confirm?.mode === "delete"
            ? `سيتم حذف «${confirm?.task.title}» نهائيًا.`
            : `سيتم نقل «${confirm?.task.title}» إلى الأرشيف.`
        }
        confirmLabel={confirm?.mode === "delete" ? "حذف نهائي" : "تأكيد"}
        tone={confirm?.mode === "delete" ? "danger" : "primary"}
      />
    </>
  );
}
