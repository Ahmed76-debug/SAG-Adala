import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Archive,
  ArchiveRestore,
  Trash2,
  Download,
  Printer,
  FileDown,
  Search,
  Scale,
  Users,
  ListTodo,
  CalendarDays,
  FolderOpen,
  BookOpen,
  FileSignature,
  Wallet,
  HardDrive,
  CalendarClock,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { db, logActivity, deleteFile } from "@/lib/db";
import { useApp } from "@/state/AppProvider";
import { PageHeader, PageBody } from "@/components/layout/AppShell";
import {
  Button,
  Badge,
  Select,
  IconButton,
  EmptyState,
  StatCard,
  Tabs,
} from "@/components/ui/primitives";
import { ConfirmDialog, useToast } from "@/components/ui/overlays";
import { SectionCard } from "@/components/common/Badges";
import { MATTER_STATUS, TASK_STATUS, EVENT_STATUS, formatDateShort, formatCurrency } from "@/lib/format";
import { downloadCsv, exportPrintArea, fileDateStamp } from "@/lib/pdf";
import { printElement } from "@/lib/print";
import { cn } from "@/lib/cn";

type Scope = "matters" | "clients" | "tasks" | "events" | "documents" | "agreements" | "payments" | "library";

const SCOPES: { key: Scope; label: string; icon: typeof Archive }[] = [
  { key: "matters", label: "القضايا", icon: Scale },
  { key: "clients", label: "الموكلون", icon: Users },
  { key: "tasks", label: "المهام", icon: ListTodo },
  { key: "events", label: "المواعيد", icon: CalendarDays },
  { key: "documents", label: "الوثائق", icon: FolderOpen },
  { key: "agreements", label: "الاتفاقيات", icon: FileSignature },
  { key: "payments", label: "المدفوعات", icon: Wallet },
  { key: "library", label: "المكتبة", icon: BookOpen },
];

interface Row {
  id: string;
  title: string;
  sub: string;
  date: string;
  amount?: number;
  currency?: string;
  table: string;
  scope: Scope;
  extra?: Record<string, unknown>;
}

export default function ArchivePage() {
  const { can, settings, user } = useApp();
  const toast = useToast();

  const [scope, setScope] = useState<Scope>("matters");
  const [year, setYear] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<{ rows: Row[]; mode: "restore" | "purge" } | null>(null);

  const matters = useLiveQuery(() => db.matters.toArray(), [], []);
  const clients = useLiveQuery(() => db.clients.toArray(), [], []);
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], []);
  const events = useLiveQuery(() => db.events.toArray(), [], []);
  const documents = useLiveQuery(() => db.documents.toArray(), [], []);
  const agreements = useLiveQuery(() => db.agreements.toArray(), [], []);
  const payments = useLiveQuery(() => db.payments.toArray(), [], []);
  const library = useLiveQuery(() => db.library.toArray(), [], []);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const m of matters ?? []) {
      if (!m.archived) continue;
      out.push({
        id: m.id,
        title: m.title,
        sub: `${m.number} · ${MATTER_STATUS[m.status].label}`,
        date: m.archivedAt ?? m.updatedAt ?? m.createdAt,
        amount: m.agreedFee,
        currency: m.currency,
        table: "matters",
        scope: "matters",
        extra: { year: m.archiveYear ?? new Date(m.archivedAt ?? m.createdAt).getFullYear() },
      });
    }
    for (const c of clients ?? []) {
      if (!c.archived) continue;
      out.push({
        id: c.id,
        title: c.name,
        sub: c.legalName || c.email || "موكّل",
        date: c.archivedAt ?? c.updatedAt ?? c.createdAt,
        table: "clients",
        scope: "clients",
        extra: { year: new Date(c.archivedAt ?? c.createdAt).getFullYear() },
      });
    }
    for (const t of tasks ?? []) {
      if (!t.archived) continue;
      out.push({
        id: t.id,
        title: t.title,
        sub: TASK_STATUS[t.status].label,
        date: t.updatedAt ?? t.createdAt,
        table: "tasks",
        scope: "tasks",
        extra: { year: new Date(t.updatedAt ?? t.createdAt).getFullYear() },
      });
    }
    for (const e of events ?? []) {
      if (!e.archived) continue;
      out.push({
        id: e.id,
        title: e.title,
        sub: EVENT_STATUS[e.status].label,
        date: e.archivedAt ?? e.updatedAt ?? e.createdAt,
        table: "events",
        scope: "events",
        extra: { year: new Date(e.archivedAt ?? e.createdAt).getFullYear() },
      });
    }
    for (const d of documents ?? []) {
      if (!d.archived) continue;
      out.push({
        id: d.id,
        title: d.title,
        sub: `النسخة ${d.version}${d.fileName ? ` · ${d.fileName}` : ""}`,
        date: d.archivedAt ?? d.updatedAt ?? d.createdAt,
        table: "documents",
        scope: "documents",
        extra: { year: new Date(d.archivedAt ?? d.createdAt).getFullYear(), fileId: d.fileId },
      });
    }
    for (const a of agreements ?? []) {
      if (!a.archived) continue;
      out.push({
        id: a.id,
        title: a.title,
        sub: a.status,
        date: a.updatedAt ?? a.createdAt,
        amount: a.amount,
        currency: a.currency,
        table: "agreements",
        scope: "agreements",
        extra: { year: new Date(a.updatedAt ?? a.createdAt).getFullYear() },
      });
    }
    for (const p of payments ?? []) {
      if (!p.archived) continue;
      out.push({
        id: p.id,
        title: `دفعة — ${p.kind}`,
        sub: p.notes || p.receiptNo || "—",
        date: p.date,
        amount: p.amount,
        currency: p.currency,
        table: "payments",
        scope: "payments",
        extra: { year: new Date(p.date).getFullYear() },
      });
    }
    for (const l of library ?? []) {
      if (!l.archived) continue;
      out.push({
        id: l.id,
        title: l.title,
        sub: l.author || l.category,
        date: l.addedAt,
        table: "library",
        scope: "library",
        extra: { year: new Date(l.addedAt).getFullYear() },
      });
    }
    return out;
  }, [matters, clients, tasks, events, documents, agreements, payments, library]);

  const counts = useMemo(() => {
    const c: Record<Scope, number> = {
      matters: 0,
      clients: 0,
      tasks: 0,
      events: 0,
      documents: 0,
      agreements: 0,
      payments: 0,
      library: 0,
    };
    for (const r of rows) c[r.scope] += 1;
    return c;
  }, [rows]);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const r of rows) set.add(Number(r.extra?.year) || 0);
    return [...set].filter(Boolean).sort((a, b) => b - a);
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (r.scope !== scope) return false;
        if (year && String(r.extra?.year) !== year) return false;
        if (q.trim()) {
          const t = q.trim().toLowerCase();
          if (!r.title.toLowerCase().includes(t) && !r.sub.toLowerCase().includes(t)) return false;
        }
        return true;
      }),
    [rows, scope, year, q],
  );

  const canRestore = can("archive.restore");
  const canPurge = can("archive.purge");

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const apply = async (mode: "restore" | "purge") => {
    if (!confirm) return;
    const list = confirm.rows;
    for (const r of list) {
      const table = (db as unknown as Record<string, { update: (id: string, p: unknown) => Promise<unknown> }>)[
        r.table
      ];
      if (!table) continue;
      if (mode === "restore") {
        await table.update(r.id, { archived: false, archivedAt: undefined });
      } else {
        if (r.scope === "documents" && r.extra?.fileId) await deleteFile(String(r.extra.fileId));
        await (db as unknown as Record<string, { delete: (id: string) => Promise<unknown> }>)[r.table].delete(r.id);
      }
    }
    await logActivity({
      userId: user?.id,
      userName: user?.name ?? "—",
      action: mode === "restore" ? "استرجاع من الأرشيف" : "حذف نهائي من الأرشيف",
      entity: "أرشيف",
      meta: `${list.length} سجل`,
    });
    toast.success(
      mode === "restore"
        ? `تمت استعادة ${list.length} سجل بنجاح`
        : `تم حذف ${list.length} سجل نهائيًا`,
    );
    setSelected([]);
    setConfirm(null);
  };

  const exportCsv = () => {
    downloadCsv(
      `الأرشيف-${new Date().toISOString().slice(0, 10)}`,
      ["العنوان", "التفاصيل", "التاريخ", "القيمة"],
      filtered.map((r) => [r.title, r.sub, formatDateShort(r.date), r.amount ?? ""]),
    );
    toast.success("تم تصدير سجل الأرشيف");
  };

  const printList = () => {
    const el = document.getElementById("archive-print-area");
    if (!el) return;
    printElement(el, {
      header: settings.printHeader,
      footer: settings.printFooter,
      title: "سجل الأرشيف",
    });
  };

  const exportPdf = async () => {
    const ok = await exportPrintArea(
      "archive-print-area",
      `سجل-الأرشيف-${fileDateStamp()}`,
      {
        header: settings.printHeader,
        footer: settings.printFooter,
        orientation: "landscape",
      },
    );
    if (ok) toast.success("تم تصدير سجل الأرشيف بصيغة PDF");
    else toast.error("تعذّر تصدير سجل الأرشيف");
  };

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.includes(r.id));

  return (
    <>
      <PageHeader
        title="الأرشيف"
        subtitle={`${rows.length} سجل مؤرشف — محفوظ وفق سياسة الاحتفاظ`}
        icon={
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-2 to-accent text-accent-ink">
            <Archive className="size-6" />
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
          </>
        }
      />

      <PageBody>
        <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="إجمالي السجلات المؤرشفة" value={rows.length} suffix="سجل" icon={Archive} tone="accent" />
          <StatCard label="قضايا مؤرشفة" value={counts.matters} suffix="قضية" icon={Scale} tone="info" />
          <StatCard label="وثائق مؤرشفة" value={counts.documents} suffix="وثيقة" icon={FolderOpen} tone="warn" />
          <StatCard
            label="سنة الاحتفاظ"
            value={settings.archiveAfterMonths}
            suffix="شهر"
            icon={CalendarClock}
            tone="info"
          />
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-line px-4 pt-3">
            <Tabs
              value={scope}
              onChange={(v) => {
                setScope(v);
                setSelected([]);
              }}
              tabs={SCOPES.map((s) => ({
                value: s.key,
                label: s.label,
                count: counts[s.key],
                icon: s.icon,
              }))}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث في الأرشيف…"
                className="input-base ps-9"
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-faint hover:text-ink"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <Select value={year} onChange={(e) => setYear(e.target.value)} className="max-w-[150px]">
              <option value="">كل السنوات</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>

            <div className="ms-auto flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                icon={allSelected ? CheckSquare : Square}
                onClick={() =>
                  setSelected(allSelected ? [] : filtered.map((r) => r.id))
                }
              >
                {allSelected ? "إلغاء التحديد" : "تحديد الكل"}
              </Button>
              {canRestore && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={ArchiveRestore}
                  disabled={selected.length === 0}
                  onClick={() =>
                    setConfirm({
                      rows: filtered.filter((r) => selected.includes(r.id)),
                      mode: "restore",
                    })
                  }
                >
                  استرجاع ({selected.length})
                </Button>
              )}
              {canPurge && (
                <Button
                  size="sm"
                  variant="danger"
                  icon={Trash2}
                  disabled={selected.length === 0}
                  onClick={() =>
                    setConfirm({
                      rows: filtered.filter((r) => selected.includes(r.id)),
                      mode: "purge",
                    })
                  }
                >
                  حذف نهائي ({selected.length})
                </Button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Archive}
              title="لا توجد سجلات في هذا القسم"
              description="ستظهر هنا الملفات المؤرشفة فور نقلها إلى الأرشيف."
            />
          ) : (
            <ul className="divide-y divide-line-soft">
              {filtered.map((r) => {
                const Icon = SCOPES.find((s) => s.key === r.scope)?.icon ?? Archive;
                const on = selected.includes(r.id);
                return (
                  <li
                    key={`${r.scope}-${r.id}`}
                    className={cn("flex items-center gap-3 px-4 py-3 transition-colors", on && "bg-accent-soft/40")}
                  >
                    <button
                      onClick={() => toggle(r.id)}
                      className="shrink-0 text-muted transition-colors hover:text-accent"
                      title="تحديد"
                    >
                      {on ? <CheckSquare className="size-4 text-accent" /> : <Square className="size-4" />}
                    </button>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold text-ink">{r.title}</div>
                      <div className="truncate text-[11.5px] text-muted">{r.sub}</div>
                    </div>
                    <span className="num hidden shrink-0 text-[12px] text-muted sm:block">
                      {formatDateShort(r.date)}
                    </span>
                    {r.amount !== undefined && (
                      <span className="num hidden shrink-0 text-[12.5px] font-semibold text-ink md:block">
                        {formatCurrency(r.amount, r.currency ?? "SAR")}
                      </span>
                    )}
                    <div className="flex shrink-0 items-center gap-1">
                      {canRestore && (
                        <IconButton
                          icon={ArchiveRestore}
                          label="استرجاع"
                          size="xs"
                          onClick={() => setConfirm({ rows: [r], mode: "restore" })}
                        />
                      )}
                      {canPurge && (
                        <IconButton
                          icon={Trash2}
                          label="حذف نهائي"
                          size="xs"
                          onClick={() => setConfirm({ rows: [r], mode: "purge" })}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-5 grid gap-3.5 lg:grid-cols-2">
          <SectionCard title="سياسة الاحتفاظ" subtitle="تُطبَّق على القضايا والوثائق المغلقة">
            <div className="space-y-3 text-[12.5px] text-ink-soft">
              <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                <span>مدة الاحتفاظ الافتراضية</span>
                <span className="num font-semibold text-ink">{settings.archiveAfterMonths} شهرًا</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                <span>أرشفة تلقائية للقضايا المغلقة</span>
                <Badge tone={settings.autoArchiveClosed ? "ok" : "muted"}>
                  {settings.autoArchiveClosed ? "مفعّلة" : "معطّلة"}
                </Badge>
              </div>
              <p className="leading-relaxed text-muted">
                يحتفظ النظام بسجلات Mango مؤرشفة آمنة. عند تجاوز مدة الاحتفاظ تُنقل السجلات تلقائيًا إلى
                قسم الاستعادة مع إمكانية الرجوع إليها في أي وقت.
              </p>
            </div>
          </SectionCard>

          <SectionCard title="سلامة البيانات" subtitle="نسخ احتياطي واستعادة">
            <div className="space-y-3 text-[12.5px] text-ink-soft">
              <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                <span className="flex items-center gap-2">
                  <HardDrive className="size-3.5 text-muted" />
                  التخزين المحلي
                </span>
                <Badge tone="ok">فعّال</Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                <span className="flex items-center gap-2">
                  <Archive className="size-3.5 text-muted" />
                  سجلات مؤرشفة
                </span>
                <span className="num font-semibold text-ink">{rows.length}</span>
              </div>
              <p className="leading-relaxed text-muted">
                يُنصح بأخذ نسخة احتياطية دورية من الإعدادات، ويفعّل الأرشفة التلقائية بعد إغلاق القضايا
                لتسهيل الوصول السريع للملفات المؤرشفة.
              </p>
            </div>
          </SectionCard>
        </div>

        <div id="archive-print-area" className="hidden">
          <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>سجل الأرشيف</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["العنوان", "التفاصيل", "التاريخ", "القيمة"].map((h) => (
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
              {filtered.map((r) => (
                <tr key={`${r.scope}-${r.id}`}>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{r.title}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{r.sub}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{formatDateShort(r.date)}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{r.amount ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageBody>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => void apply(confirm?.mode ?? "restore")}
        title={confirm?.mode === "purge" ? "حذف نهائي من الأرشيف" : "استرجاع من الأرشيف"}
        message={
          confirm?.mode === "purge"
            ? `سيتم حذف ${confirm?.rows.length} سجل نهائيًا ولا يمكن التراجع عن هذه الخطوة. يُنصح بأخذ نسخة احتياطية أولًا.`
            : `سيتم إعادة ${confirm?.rows.length} سجل إلى قوائمها النشطة.`
        }
        confirmLabel={confirm?.mode === "purge" ? "حذف نهائي" : "استرجاع"}
        tone={confirm?.mode === "purge" ? "danger" : "primary"}
      />
    </>
  );
}
