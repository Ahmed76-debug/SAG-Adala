import { useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowRight,
  Scale,
  Pencil,
  Printer,
  Download,
  Archive,
  ArchiveRestore,
  ListTodo,
  FolderOpen,
  CalendarDays,
  Wallet,
  ScrollText,
  Plus,
  Lock,
  User,
  Gavel,
  Phone,
  Mail,
  MapPin,
  Tag as TagIcon,
  Check,
  Trash,
  FileText,
  Landmark,
  TrendingUp,
  Clock,
  Info,
} from "lucide-react";
import { db, logActivity, nowISO } from "@/lib/db";
import { useApp } from "@/state/AppProvider";
import { PageBody } from "@/components/layout/AppShell";
import { useToast, ConfirmDialog } from "@/components/ui/overlays";
import {
  Button,
  Badge,
  Tabs,
  Progress,
  Avatar,
  EmptyState,
  IconButton,
  Textarea,
} from "@/components/ui/primitives";
import {
  SectionCard,
  StatusBadge,
  PriorityBadge,
  DueBadge,
  TaskStatusBadge,
  TaskPriorityBadge,
  EventTypeBadge,
  DocCategoryBadge,
} from "@/components/common/Badges";
import { MatterForm, TaskForm, EventForm, DocumentForm } from "@/components/forms/Forms";
import {
  MATTER_STATUS,
  FEE_TYPES,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatHijri,
  relativeTime,
} from "@/lib/format";
import { downloadPdf } from "@/lib/pdf";
import { printElement } from "@/lib/print";
import { cn } from "@/lib/cn";
import type { Task, Payment, Agreement, MatterNote, LegalEvent } from "@/lib/types";

type Tab = "overview" | "tasks" | "documents" | "events" | "fees" | "timeline";

export default function MatterDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user, can, settings } = useApp();
  const toast = useToast();

  const matter = useLiveQuery(() => db.matters.get(id), [id]);
  const client = useLiveQuery(() => (matter ? db.clients.get(matter.clientId) : undefined), [matter?.clientId]);
  const type = useLiveQuery(() => (matter ? db.matterTypes.get(matter.typeId) : undefined), [matter?.typeId]);
  const tasks = useLiveQuery(() => db.tasks.filter((t) => t.matterId === id).toArray(), [id], []);
  const events = useLiveQuery(() => db.events.filter((e) => e.matterId === id).toArray(), [id], []);
  const docs = useLiveQuery(() => db.documents.filter((d) => d.matterId === id).toArray(), [id], []);
  const notes = useLiveQuery(() => db.notes.filter((n) => n.matterId === id).toArray(), [id], []);
  const agreements = useLiveQuery(() => db.agreements.filter((a) => a.matterId === id).toArray(), [id], []);
  const payments = useLiveQuery(() => db.payments.filter((p) => p.matterId === id).toArray(), [id], []);
  const users = useLiveQuery(() => db.users.toArray(), [], []);

  const [tab, setTab] = useState<Tab>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [notePinned, setNotePinned] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  if (!matter) {
    return (
      <PageBody>
        <EmptyState
          icon={Scale}
          title="القضية غير موجودة"
          description="ربما تم حذفها أو أن الرابط غير صحيح."
          action={
            <Button variant="primary" onClick={() => navigate("/matters")}>
              العودة إلى القضايا
            </Button>
          }
        />
      </PageBody>
    );
  }

  const team = (matter.lawyerIds ?? []).map((uid) => (users ?? []).find((u) => u.id === uid)).filter(Boolean);
  const activeTasks = (tasks ?? []).filter((t) => !t.archived);
  const activeEvents = (events ?? []).filter((e) => !e.archived).sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const activeDocs = (docs ?? []).filter((d) => !d.archived);
  const totalPaid = (payments ?? [])
    .filter((p) => !p.archived && p.kind !== "expense" && p.kind !== "court_fee")
    .reduce((s, p) => s + p.amount, 0);
  const totalExpenses = (payments ?? [])
    .filter((p) => !p.archived && (p.kind === "expense" || p.kind === "court_fee"))
    .reduce((s, p) => s + p.amount, 0);
  const remaining = matter.agreedFee - totalPaid;

  const addNote = async () => {
    if (!noteBody.trim()) return;
    setSavingNote(true);
    const n: MatterNote = {
      id: "nt_" + Math.random().toString(36).slice(2),
      matterId: id,
      body: noteBody.trim(),
      kind: "note",
      authorId: user?.id,
      pinned: notePinned,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      archived: false,
    };
    await db.notes.add(n);
    await logActivity({
      userId: user?.id,
      userName: user?.name ?? "—",
      action: "إضافة",
      entity: "مذكرة",
      entityId: id,
      meta: n.body.slice(0, 60),
    });
    setNoteBody("");
    setNotePinned(false);
    setSavingNote(false);
    toast.success("تمت إضافة المذكرة إلى سجل القضية");
  };

  const toggleTask = async (t: Task) => {
    const next = t.status === "done" ? "todo" : "done";
    await db.tasks.update(t.id, {
      status: next,
      completedAt: next === "done" ? nowISO() : undefined,
      updatedAt: nowISO(),
    });
  };

  const archiveMatter = async () => {
    await db.matters.update(id, { archived: true, archivedAt: nowISO(), archiveYear: new Date().getFullYear() });
    await logActivity({
      userId: user?.id,
      userName: user?.name ?? "—",
      action: "أرشفة",
      entity: "قضية",
      entityId: id,
      meta: matter.title,
    });
    setArchiveOpen(false);
    toast.success("تمت أرشفة القضية");
    navigate("/archive");
  };

  const restoreMatter = async () => {
    await db.matters.update(id, { archived: false, archivedAt: undefined });
    toast.success("تمت استرجاع القضية من الأرشيف");
  };

  const removeMatter = async () => {
    await db.matters.delete(id);
    await logActivity({
      userId: user?.id,
      userName: user?.name ?? "—",
      action: "حذف",
      entity: "قضية",
      entityId: id,
      meta: matter.title,
    });
    toast.success("تم حذف القضية");
    navigate("/matters");
  };

  const doPrint = () => {
    if (printRef.current)
      printElement(printRef.current, {
        header: settings.printHeader,
        footer: settings.printFooter,
        title: `قضية ${matter.number}`,
      });
  };

  const doPdf = async () => {
    if (!printRef.current) return;
    setPdfBusy(true);
    try {
      await downloadPdf(printRef.current, `قضية-${matter.number}`, {
        header: settings.printHeader,
        footer: settings.printFooter,
      });
      toast.success("تم تصدير ملف PDF");
    } catch {
      toast.error("تعذّر تصدير PDF");
    } finally {
      setPdfBusy(false);
    }
  };

  const tabs = [
    { value: "overview" as Tab, label: "نظرة عامة", icon: Info },
    { value: "tasks" as Tab, label: "المهام", icon: ListTodo, count: activeTasks.length },
    { value: "documents" as Tab, label: "الوثائق", icon: FolderOpen, count: activeDocs.length },
    { value: "events" as Tab, label: "المواعيد", icon: CalendarDays, count: activeEvents.length },
    { value: "fees" as Tab, label: "الأتعاب والاتفاقيات", icon: Wallet, count: (agreements ?? []).length },
    { value: "timeline" as Tab, label: "سجل الإجراءات", icon: ScrollText, count: (notes ?? []).length },
  ];

  return (
    <>
      {/* الترويسة */}
      <div className="border-b border-line bg-surface/40">
        <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
          <Link to="/matters" className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-accent">
            <ArrowRight className="size-3.5 rotate-180" /> عودة إلى القضايا
          </Link>

          <div className="flex flex-wrap items-start gap-4">
            <span
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${type?.color ?? "#888"}, ${type?.color ?? "#666"}cc)` }}
            >
              <Scale className="size-6" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="num text-[12px] font-semibold text-accent">{matter.number}</span>
                <span className="num text-[11.5px] text-muted">{matter.internalRef}</span>
                <StatusBadge status={matter.status} />
                <PriorityBadge priority={matter.priority} />
                {matter.confidential && (
                  <Badge tone="danger" icon={Lock}>
                    سري
                  </Badge>
                )}
                {matter.archived && (
                  <Badge tone="muted" icon={Archive}>
                    مؤرشفة
                  </Badge>
                )}
              </div>
              <h1 className="mt-1.5 text-[20px] font-bold leading-snug text-ink sm:text-[24px]">{matter.title}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted">
                {client && (
                  <Link to={`/clients?focus=${client.id}`} className="flex items-center gap-1.5 hover:text-accent">
                    <User className="size-3.5" />
                    {client.name}
                  </Link>
                )}
                {matter.courtName && (
                  <span className="flex items-center gap-1.5">
                    <Landmark className="size-3.5" />
                    {matter.courtName}
                  </span>
                )}
                {matter.caseNumber && (
                  <span className="num flex items-center gap-1.5">
                    <Gavel className="size-3.5" />
                    {matter.caseNumber}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  فُتحت {formatDate(matter.openedAt)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" icon={Printer} onClick={doPrint}>
                طباعة
              </Button>
              <Button variant="outline" size="sm" icon={Download} loading={pdfBusy} onClick={doPdf}>
                تصدير PDF
              </Button>
              {matter.archived ? (
                can("matters.archive") && (
                  <Button variant="outline" size="sm" icon={ArchiveRestore} onClick={restoreMatter}>
                    استرجاع
                  </Button>
                )
              ) : (
                can("matters.archive") && (
                  <Button variant="outline" size="sm" icon={Archive} onClick={() => setArchiveOpen(true)}>
                    أرشفة
                  </Button>
                )
              )}
              {can("matters.edit") && (
                <Button variant="primary" size="sm" icon={Pencil} onClick={() => setEditOpen(true)}>
                  تعديل
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5">
            <Tabs value={tab} onChange={setTab} tabs={tabs} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
        {tab === "overview" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <SectionCard title="ملخص الملف" subtitle="أهم ما يوجّه سير العمل">
                <div className="space-y-4">
                  {matter.description && (
                    <p className="text-[13.5px] leading-relaxed text-ink-soft">{matter.description}</p>
                  )}

                  {matter.nextAction && (
                    <div className="rounded-2xl border border-accent/30 bg-accent-soft/40 p-4">
                      <div className="mb-1 flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-wide text-accent">
                        <TrendingUp className="size-3.5" /> الخطوة التالية
                      </div>
                      <div className="text-[14.5px] font-semibold text-ink">{matter.nextAction}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <DueBadge date={matter.nextActionDate} />
                        {matter.nextActionDate && (
                          <span className="text-[11.5px] text-muted">
                            {formatDate(matter.nextActionDate)} · {formatHijri(matter.nextActionDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-[12px]">
                      <span className="text-muted">نسبة إنجاز الملف</span>
                      <span className="num font-bold text-ink">{matter.progress}%</span>
                    </div>
                    <Progress value={matter.progress} />
                  </div>

                  {matter.stage && (
                    <div className="flex items-center gap-2 text-[13px]">
                      <span className="text-muted">المرحلة الحالية:</span>
                      <Badge tone="accent">{matter.stage}</Badge>
                    </div>
                  )}

                  {matter.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <TagIcon className="size-3.5 text-muted" />
                      {matter.tags.map((t) => (
                        <Badge key={t}>{t}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard title="بيانات الملف" subtitle="معلومات قانونية وإدارية">
                <dl className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
                  <InfoRow label="الموكّل" value={client?.name ?? "—"} />
                  <InfoRow label="نوع الموكّل" value={client ? (client.type === "company" ? "شركة / مؤسسة" : client.type === "entity" ? "جهة حكومية" : "شخص طبيعي") : "—"} />
                  <InfoRow label="الخصم" value={matter.opposingParty ?? "—"} />
                  <InfoRow label="المحكمة" value={matter.courtName ?? "—"} />
                  <InfoRow label="رقم القضية بالمحكمة" value={matter.caseNumber ?? "—"} />
                  <InfoRow label="القاضي / الدائرة" value={matter.judge ?? "—"} />
                  <InfoRow label="تاريخ الفتح" value={formatDate(matter.openedAt)} />
                  <InfoRow label="تاريخ الإغلاق" value={matter.closedAt ? formatDate(matter.closedAt) : "—"} />
                  <InfoRow label="النتيجة" value={matter.outcome ?? "—"} />
                  <InfoRow label="معدل الفوز" value={matter.winRate ? `${matter.winRate}%` : "—"} />
                </dl>
              </SectionCard>
            </div>

            <div className="space-y-4">
              <SectionCard title="فريق المحاماة" subtitle={`${team.length} محامٍ`}>
                {team.length === 0 ? (
                  <p className="text-[12.5px] text-muted">لم يُسند إلى أحد بعد.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {team.map((u) => (
                      <li key={u!.id} className="flex items-center gap-2.5">
                        <Avatar name={u!.name} color={u!.avatarColor} size={34} />
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-ink">{u!.name}</div>
                          <div className="truncate text-[11.5px] text-muted">{u!.title}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              <SectionCard title="الملخص المالي" subtitle="الأتعاب والمصاريف">
                <div className="space-y-3">
                  <MoneyRow label="الأتعاب المتفق عليها" value={formatCurrency(matter.agreedFee, matter.currency)} />
                  <MoneyRow label="نوع الأتعاب" value={FEE_TYPES[matter.feeType]} muted />
                  <MoneyRow label="المحصّل" value={formatCurrency(totalPaid, matter.currency)} tone="ok" />
                  <MoneyRow label="المصاريف والرسوم" value={formatCurrency(totalExpenses + matter.courtFees, matter.currency)} tone="danger" />
                  <div className="border-t border-line pt-3">
                    <MoneyRow
                      label="المتبقي"
                      value={formatCurrency(Math.max(0, remaining), matter.currency)}
                      tone={remaining > 0 ? "warn" : "ok"}
                      strong
                    />
                  </div>
                </div>
              </SectionCard>

              {client && (
                <SectionCard title="بيانات الموكّل" subtitle="للتواصل السريع">
                  <div className="space-y-2.5 text-[12.5px]">
                    {client.phone && (
                      <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-ink-soft hover:text-accent">
                        <Phone className="size-3.5 text-muted" /> {client.phone}
                      </a>
                    )}
                    {client.email && (
                      <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-ink-soft hover:text-accent">
                        <Mail className="size-3.5 text-muted" /> {client.email}
                      </a>
                    )}
                    {client.address && (
                      <div className="flex items-start gap-2 text-ink-soft">
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted" />
                        <span>
                          {client.address}
                          {client.city ? `، ${client.city}` : ""}
                        </span>
                      </div>
                    )}
                    {client.notes && (
                      <div className="rounded-xl border border-line bg-surface-2 p-3 text-[12px] leading-relaxed text-muted">
                        {client.notes}
                      </div>
                    )}
                  </div>
                </SectionCard>
              )}
            </div>
          </div>
        )}

        {tab === "tasks" && (
          <SectionCard
            title="مهام القضية"
            subtitle={`${activeTasks.filter((t) => t.status === "done").length} من ${activeTasks.length} مكتملة`}
            action={
              can("tasks.create") && (
                <Button size="sm" variant="primary" icon={Plus} onClick={() => setTaskOpen(true)}>
                  مهمة جديدة
                </Button>
              )
            }
            bodyClassName="p-0"
          >
            {activeTasks.length === 0 ? (
              <EmptyState icon={ListTodo} title="لا مهام في هذا الملف" description="أضف المهام المطلوبة لتنفيذ الإجراء." />
            ) : (
              <ul className="divide-y divide-line-soft">
                {activeTasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 px-4 py-3">
                    <button
                      onClick={() => void toggleTask(t)}
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                        t.status === "done"
                          ? "border-accent bg-accent text-accent-ink"
                          : "border-line hover:border-accent",
                      )}
                    >
                      {t.status === "done" && <Check className="size-3.5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={cn("text-[13.5px] font-medium", t.status === "done" ? "text-muted line-through" : "text-ink")}>
                        {t.title}
                      </div>
                      {t.description && <div className="mt-0.5 text-[12px] text-muted">{t.description}</div>}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <TaskStatusBadge status={t.status} />
                        <TaskPriorityBadge priority={t.priority} />
                        <DueBadge date={t.dueDate} />
                      </div>
                      {t.checklist.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {t.checklist.map((c) => (
                            <label key={c.id} className="flex items-center gap-2 text-[12px] text-muted">
                              <input
                                type="checkbox"
                                checked={c.done}
                                onChange={async () => {
                                  await db.tasks.update(t.id, {
                                    checklist: t.checklist.map((x) =>
                                      x.id === c.id ? { ...x, done: !x.done } : x,
                                    ),
                                  });
                                }}
                                className="size-3.5 accent-[var(--accent)]"
                              />
                              <span className={cn(c.done && "line-through opacity-60")}>{c.text}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    <IconButton
                      icon={Trash}
                      label="حذف"
                      size="xs"
                      onClick={async () => {
                        await db.tasks.delete(t.id);
                        toast.success("تم حذف المهمة");
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        {tab === "documents" && (
          <SectionCard
            title="وثائق القضية"
            subtitle={`${activeDocs.length} وثيقة`}
            action={
              can("documents.create") && (
                <Button size="sm" variant="primary" icon={Plus} onClick={() => setDocOpen(true)}>
                  إضافة وثيقة
                </Button>
              )
            }
            bodyClassName="p-0"
          >
            {activeDocs.length === 0 ? (
              <EmptyState icon={FolderOpen} title="لا وثائق" description="ارفع العقود والمذكرات والأدلة هنا." />
            ) : (
              <ul className="divide-y divide-line-soft">
                {activeDocs.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                      <FileText className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-ink">{d.title}</div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                        <DocCategoryBadge category={d.category} />
                        <span className="num">نسخة {d.version}</span>
                        {d.fileName && <span className="truncate">· {d.fileName}</span>}
                        {d.confidential && <Lock className="size-3 text-danger" />}
                      </div>
                    </div>
                    <span className="num hidden text-[11.5px] text-muted sm:block">
                      {formatDate(d.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        {tab === "events" && (
          <SectionCard
            title="مواعيد وجلسات القضية"
            subtitle={`${activeEvents.length} موعد`}
            action={
              can("events.create") && (
                <Button size="sm" variant="primary" icon={Plus} onClick={() => setEventOpen(true)}>
                  موعد جديد
                </Button>
              )
            }
            bodyClassName="p-0"
          >
            {activeEvents.length === 0 ? (
              <EmptyState icon={CalendarDays} title="لا مواعيد" description="أضف الجلسات والمواعيد النظامية." />
            ) : (
              <ul className="divide-y divide-line-soft">
                {activeEvents.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-surface-2">
                      <span className="text-[14px] font-bold leading-none text-ink">
                        {new Date(e.date).getDate()}
                      </span>
                      <span className="text-[9px] text-muted">
                        {new Intl.DateTimeFormat("ar-SA", { month: "short" }).format(new Date(e.date))}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold text-ink">{e.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
                        <EventTypeBadge type={e.type} />
                        {e.location && <span>· {e.location}</span>}
                        {e.courtRoom && <span className="num">· {e.courtRoom}</span>}
                      </div>
                    </div>
                    <DueBadge date={e.date} />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        {tab === "fees" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="الاتفاقيات" subtitle={`${(agreements ?? []).length} اتفاقية`} bodyClassName="p-0">
              {(agreements ?? []).length === 0 ? (
                <EmptyState icon={ScrollText} title="لا اتفاقيات" />
              ) : (
                <ul className="divide-y divide-line-soft">
                  {(agreements ?? []).map((a: Agreement) => (
                    <li key={a.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-ink">{a.title}</div>
                          <div className="text-[11.5px] text-muted">
                            {formatDate(a.signedDate)} · {a.installmentCount} دفعة
                          </div>
                        </div>
                        <span className="num shrink-0 text-[13px] font-bold text-ink">
                          {formatCurrency(a.amount, a.currency)}
                        </span>
                      </div>
                      {a.terms && (
                        <p className="mt-2 rounded-xl bg-surface-2 p-2.5 text-[12px] leading-relaxed text-muted">
                          {a.terms}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="المدفوعات" subtitle={`${(payments ?? []).length} عملية`} bodyClassName="p-0">
              {(payments ?? []).length === 0 ? (
                <EmptyState icon={Wallet} title="لا مدفوعات" />
              ) : (
                <ul className="divide-y divide-line-soft">
                  {(payments ?? [])
                    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
                    .map((p: Payment) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-medium text-ink">
                            {p.kind === "fee"
                              ? "أتعاب"
                              : p.kind === "installment"
                                ? "دفعة من الأتعاب"
                                : p.kind === "expense"
                                  ? "مصروف"
                                  : p.kind === "court_fee"
                                    ? "رسوم قضائية"
                                    : "أخرى"}
                          </div>
                          <div className="text-[11px] text-muted">
                            {formatDate(p.date)} {p.receiptNo ? `· ${p.receiptNo}` : ""}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "num shrink-0 text-[13px] font-bold",
                            p.kind === "expense" || p.kind === "court_fee" ? "text-danger" : "text-ok",
                          )}
                        >
                          {p.kind === "expense" || p.kind === "court_fee" ? "−" : "+"}
                          {formatCurrency(p.amount, p.currency)}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </SectionCard>
          </div>
        )}

        {tab === "timeline" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionCard title="سجل الإجراءات" subtitle="كل ما جرى في هذا الملف">
                <div className="relative space-y-4 ps-6">
                  <span className="absolute inset-y-2 start-[7px] w-px bg-line" />
                  {(notes ?? []).length === 0 ? (
                    <EmptyState icon={ScrollText} title="لا سجلات بعد" />
                  ) : (
                    [...(notes ?? [])]
                      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
                      .map((n) => {
                        const author = (users ?? []).find((u) => u.id === n.authorId);
                        return (
                          <div key={n.id} className="relative">
                            <span className="absolute -start-6 top-1.5 size-3.5 rounded-full border-2 border-[var(--surface)] bg-accent" />
                            <div className="rounded-2xl border border-line bg-surface-2 p-3.5">
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span className="text-[12px] font-semibold text-ink">
                                  {author?.name ?? "غير معروف"}
                                </span>
                                <span className="text-[11px] text-faint">{relativeTime(n.createdAt)}</span>
                                <span className="num text-[11px] text-faint">{formatDateTime(n.createdAt)}</span>
                                {n.pinned && <Badge tone="accent">مثبّت</Badge>}
                              </div>
                              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">{n.body}</p>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </SectionCard>
            </div>

            <div>
              <SectionCard title="إضافة مذكرة / إجراء" subtitle="يُحفظ في سجل القضية">
                <div className="space-y-3">
                  <Textarea
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    rows={5}
                    placeholder="اكتب ما تم اتخاذه، وما اتُّخذ، وما يليه…"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-[12.5px] text-ink-soft">
                      <input
                        type="checkbox"
                        checked={notePinned}
                        onChange={(e) => setNotePinned(e.target.checked)}
                        className="size-3.5 accent-[var(--accent)]"
                      />
                      تثبيت في الأعلى
                    </label>
                    <Button size="sm" variant="primary" loading={savingNote} onClick={addNote} icon={Plus}>
                      إضافة
                    </Button>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        )}
      </div>

      {/* منطقة الطباعة */}
      <div ref={printRef} className="hidden">
        <div style={{ padding: 8 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            {matter.title}
          </h1>
          <p style={{ fontSize: 12, color: "#444", marginBottom: 12 }}>
            رقم القضية: {matter.number} · الرقم الداخلي: {matter.internalRef} · الحالة:{" "}
            {MATTER_STATUS[matter.status].label}
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 14 }}>
            <tbody>
              {[
                ["الموكّل", client?.name ?? "—"],
                ["نوع القضية", type?.name ?? "—"],
                ["المحكمة", matter.courtName ?? "—"],
                ["رقم القضية بالمحكمة", matter.caseNumber ?? "—"],
                ["الخصم", matter.opposingParty ?? "—"],
                ["تاريخ الفتح", formatDate(matter.openedAt)],
                ["الخطوة التالية", matter.nextAction ?? "—"],
                ["الأتعاب المتفق عليها", formatCurrency(matter.agreedFee, matter.currency)],
                ["المحصّل", formatCurrency(totalPaid, matter.currency)],
                ["نسبة الإنجاز", `${matter.progress}%`],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ border: "1px solid #bbb", padding: 5, width: 180, background: "#f4f4f4" }}>{k}</td>
                  <td style={{ border: "1px solid #bbb", padding: 5 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>وصف الملف</h2>
          <p style={{ fontSize: 12, lineHeight: 1.8, marginBottom: 14 }}>{matter.description ?? "—"}</p>

          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>المهام</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, marginBottom: 14 }}>
            <thead>
              <tr>
                {["المهمة", "المسؤول", "الاستحقاق", "الحالة"].map((h) => (
                  <th key={h} style={{ border: "1px solid #999", padding: 5, background: "#eee", textAlign: "right" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeTasks.map((t) => (
                <tr key={t.id}>
                  <td style={{ border: "1px solid #ccc", padding: 5 }}>{t.title}</td>
                  <td style={{ border: "1px solid #ccc", padding: 5 }}>
                    {(users ?? []).find((u) => u.id === t.assigneeId)?.name ?? "—"}
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: 5 }}>{formatDate(t.dueDate)}</td>
                  <td style={{ border: "1px solid #ccc", padding: 5 }}>{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>المواعيد</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
            <thead>
              <tr>
                {["الموعد", "التاريخ", "المكان", "النوع"].map((h) => (
                  <th key={h} style={{ border: "1px solid #999", padding: 5, background: "#eee", textAlign: "right" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeEvents.map((e: LegalEvent) => (
                <tr key={e.id}>
                  <td style={{ border: "1px solid #ccc", padding: 5 }}>{e.title}</td>
                  <td style={{ border: "1px solid #ccc", padding: 5 }}>{formatDateTime(e.date)}</td>
                  <td style={{ border: "1px solid #ccc", padding: 5 }}>{e.location ?? "—"}</td>
                  <td style={{ border: "1px solid #ccc", padding: 5 }}>{e.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <MatterForm open={editOpen} onClose={() => setEditOpen(false)} matterId={id} />
      <TaskForm open={taskOpen} onClose={() => setTaskOpen(false)} defaultMatterId={id} />
      <EventForm open={eventOpen} onClose={() => setEventOpen(false)} defaultMatterId={id} />
      <DocumentForm open={docOpen} onClose={() => setDocOpen(false)} defaultMatterId={id} />

      <ConfirmDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={archiveMatter}
        title="أرشفة القضية"
        message="سيتم نقل القضية إلى الأرشيف مع الاحتفاظ بكامل البيانات والوثائق. يمكنك الاسترجاع لاحقًا في أي وقت."
        confirmLabel="أرشفة"
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={removeMatter}
        title="حذف القضية نهائيًا"
        message="لا يمكن التراجع عن هذه الخطوة. يُنصح بالأرشفة بدل الحذف."
        confirmLabel="حذف نهائي"
      />
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11.5px] text-muted">{label}</dt>
      <dd className="mt-0.5 text-[13px] font-medium text-ink">{value}</dd>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  tone,
  muted,
  strong,
}: {
  label: string;
  value: string;
  tone?: "ok" | "danger" | "warn";
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn("text-[12.5px]", muted ? "text-muted" : "text-ink-soft")}>{label}</span>
      <span
        className={cn(
          "num",
          strong ? "text-[15px] font-bold" : "text-[13px] font-semibold",
          tone === "ok" && "text-ok",
          tone === "danger" && "text-danger",
          tone === "warn" && "text-warn",
          !tone && "text-ink",
        )}
      >
        {value}
      </span>
    </div>
  );
}
