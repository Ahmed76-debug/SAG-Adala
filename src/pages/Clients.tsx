import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Users,
  Plus,
  Download,
  Printer,
  FileDown,
  Filter,
  X,
  Pencil,
  Archive,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Scale,
  FolderOpen,
  ListTodo,
  FileText,
  Star,
  ArchiveRestore,
  Building2,
  UserRound,
  Landmark,
  ShieldAlert,
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
  EmptyState,
  StatCard,
  Progress,
} from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Drawer, useToast, ConfirmDialog } from "@/components/ui/overlays";
import { SectionCard } from "@/components/common/Badges";
import { ClientForm } from "@/components/forms/Forms";
import { CLIENT_TYPES, CLIENT_STATUS, formatCurrency, formatDateShort } from "@/lib/format";
import { downloadCsv, exportPrintArea, fileDateStamp } from "@/lib/pdf";
import { printElement } from "@/lib/print";
import { cn } from "@/lib/cn";
import type { Client } from "@/lib/types";

const PRIORITY_LABEL: Record<Client["priority"], string> = {
  normal: "عادية",
  high: "متصاعدة",
  vip: "م VIP",
};

const PRIORITY_TONE: Record<Client["priority"], "muted" | "warn" | "accent"> = {
  normal: "muted",
  high: "warn",
  vip: "accent",
};

export default function Clients() {
  const { can, settings, user } = useApp();
  const toast = useToast();
  const navigate = useNavigate();

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ client: Client; mode: "archive" | "delete" } | null>(null);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [lawyer, setLawyer] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const clients = useLiveQuery(() => db.clients.toArray(), [], []);
  const matters = useLiveQuery(() => db.matters.toArray(), [], []);
  const users = useLiveQuery(() => db.users.toArray(), [], []);
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], []);
  const docs = useLiveQuery(() => db.documents.toArray(), [], []);

  const userName = (id?: string) => (users ?? []).find((u) => u.id === id)?.name ?? "—";
  const mattersOf = (id: string) => (matters ?? []).filter((m) => m.clientId === id && !m.archived);
  const revenueOf = (id: string) =>
    mattersOf(id).reduce((s, m) => s + (m.agreedFee || 0), 0);

  const filtered = useMemo(
    () =>
      (clients ?? []).filter((c) => {
        if (showArchived ? !c.archived : c.archived) return false;
        if (type && c.type !== type) return false;
        if (status && c.status !== status) return false;
        if (priority && c.priority !== priority) return false;
        if (lawyer && c.assignedTo !== lawyer) return false;
        return true;
      }),
    [clients, type, status, priority, lawyer, showArchived],
  );

  const stats = useMemo(() => {
    const active = (clients ?? []).filter((c) => !c.archived && c.status === "active").length;
    const vip = (clients ?? []).filter((c) => !c.archived && c.priority === "vip").length;
    const total = (matters ?? [])
      .filter((m) => !m.archived)
      .reduce((s, m) => s + (m.agreedFee || 0), 0);
    return { active, vip, total, count: (clients ?? []).filter((c) => !c.archived).length };
  }, [clients, matters]);

  const detail = detailId ? (clients ?? []).find((c) => c.id === detailId) ?? null : null;
  const detailMatters = detail ? mattersOf(detail.id) : [];
  const detailTasks = detail
    ? (tasks ?? []).filter((t) => t.clientId === detail.id || detailMatters.some((m) => m.id === t.matterId))
    : [];
  const detailDocs = detail
    ? (docs ?? []).filter((d) => d.clientId === detail.id || detailMatters.some((m) => m.id === d.matterId))
    : [];

  const columns: Column<Client>[] = [
    {
      key: "name",
      header: "الموكّل",
      mobile: "primary",
      sortValue: (c) => c.name,
      render: (c) => (
        <div className="min-w-[200px]">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold text-ink">{c.name}</span>
            {c.priority === "vip" && <Star className="size-3.5 shrink-0 text-accent" />}
          </div>
          {c.legalName && c.legalName !== c.name && (
            <div className="truncate text-[11.5px] text-muted">{c.legalName}</div>
          )}
          {c.tags.slice(0, 3).map((t) => (
            <span key={t} className="me-1 text-[10.5px] text-accent">
              #{t}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "type",
      header: "النوع",
      mobile: "secondary",
      sortValue: (c) => CLIENT_TYPES[c.type],
      render: (c) => {
        const Icon =
          c.type === "company" ? Building2 : c.type === "entity" ? Landmark : c.type === "opponent" ? ShieldAlert : UserRound;
        return (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Icon className="size-3.5 text-muted" />
            {CLIENT_TYPES[c.type]}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "الحالة",
      mobile: "secondary",
      sortValue: (c) => c.status,
      render: (c) => {
        const s = CLIENT_STATUS[c.status];
        return (
          <Badge style={{ color: s.color, borderColor: `${s.color}44`, backgroundColor: `${s.color}18` }}>
            {s.label}
          </Badge>
        );
      },
    },
    {
      key: "priority",
      header: "الأولوية",
      mobile: "row",
      sortValue: (c) => ["normal", "high", "vip"].indexOf(c.priority),
      render: (c) => <Badge tone={PRIORITY_TONE[c.priority]}>{PRIORITY_LABEL[c.priority]}</Badge>,
    },
    {
      key: "matters",
      header: "القضايا",
      align: "center",
      mobile: "row",
      sortValue: (c) => mattersOf(c.id).length,
      render: (c) => {
        const n = mattersOf(c.id).length;
        return n ? (
          <Badge tone="info">{n}</Badge>
        ) : (
          <span className="text-muted">—</span>
        );
      },
    },
    {
      key: "revenue",
      header: "إجمالي الأتعاب",
      align: "end",
      mobile: "row",
      sortValue: (c) => revenueOf(c.id),
      render: (c) => (
        <span className="num whitespace-nowrap font-semibold">{formatCurrency(revenueOf(c.id), "SAR")}</span>
      ),
    },
    {
      key: "contact",
      header: "التواصل",
      mobile: "hidden",
      render: (c) => (
        <div className="min-w-[150px] space-y-0.5 text-[11.5px] text-muted">
          {c.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="size-3" />
              <span className="num">{c.phone}</span>
            </div>
          )}
          {c.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="size-3" />
              <span className="truncate">{c.email}</span>
            </div>
          )}
          {c.city && (
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3" />
              <span>{c.city}</span>
            </div>
          )}
          {!c.phone && !c.email && !c.city && "—"}
        </div>
      ),
    },
    {
      key: "lawyer",
      header: "المحامي المسؤول",
      mobile: "hidden",
      sortValue: (c) => userName(c.assignedTo),
      render: (c) => <span className="text-[12.5px]">{userName(c.assignedTo)}</span>,
    },
  ];

  const exportCsv = () => {
    downloadCsv(
      `الموكلون-${new Date().toISOString().slice(0, 10)}`,
      ["الاسم", "الاسم الرسمي", "النوع", "الحالة", "الأولوية", "الهاتف", "البريد", "المدينة", "عدد القضايا", "إجمالي الأتعاب"],
      filtered.map((c) => [
        c.name,
        c.legalName ?? "",
        CLIENT_TYPES[c.type],
        CLIENT_STATUS[c.status].label,
        PRIORITY_LABEL[c.priority],
        c.phone ?? "",
        c.email ?? "",
        c.city ?? "",
        mattersOf(c.id).length,
        revenueOf(c.id),
      ]),
    );
    toast.success("تم تصدير قائمة الموكلين");
  };

  const printList = () => {
    const el = document.getElementById("clients-print-area");
    if (!el) return;
    printElement(el, {
      header: settings.printHeader,
      footer: settings.printFooter,
      title: "قائمة الموكلين",
    });
  };

  const exportPdf = async () => {
    const ok = await exportPrintArea(
      "clients-print-area",
      `قائمة-الموكلين-${fileDateStamp()}`,
      {
        header: settings.printHeader,
        footer: settings.printFooter,
        orientation: "landscape",
      },
    );
    if (ok) toast.success("تم تصدير قائمة الموكلين بصيغة PDF");
    else toast.error("تعذّر تصدير قائمة الموكلين");
  };

  const doArchiveToggle = async () => {
    if (!confirm) return;
    const { client, mode } = confirm;
    if (mode === "delete") {
      await db.clients.delete(client.id);
      await logActivity({
        userId: user?.id,
        userName: user?.name ?? "—",
        action: "حذف",
        entity: "موكّل",
        entityId: client.id,
        meta: client.name,
      });
      toast.success("تم حذف الموكّل");
    } else {
      await db.clients.update(client.id, {
        archived: !client.archived,
        archivedAt: client.archived ? undefined : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success(client.archived ? "تمت استعادة الموكّل" : "تمت أرشفة الموكّل");
    }
    setConfirm(null);
  };

  const activeFilters = [type, status, priority, lawyer].filter(Boolean).length;

  return (
    <>
      <PageHeader
        title="الموكلون"
        subtitle={`${stats.count} موكّل نشط · ${stats.vip} موكّل مميز`}
        icon={
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-2 to-accent text-accent-ink">
            <Users className="size-6" />
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
            {can("clients.create") && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => {
                  setEditId(undefined);
                  setFormOpen(true);
                }}
              >
                موكّل جديد
              </Button>
            )}
          </>
        }
      />

      <PageBody>
        <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="إجمالي الموكلين"
            value={stats.count}
            suffix="موكّل"
            icon={Users}
            tone="accent"
            onClick={() => navigate("/matters")}
          />
          <StatCard label="موكّلون نشطون" value={stats.active} suffix="نشط" icon={UserRound} tone="ok" />
          <StatCard label="موكّلون مميزون" value={stats.vip} suffix="VIP" icon={Star} tone="warn" />
          <StatCard
            label="قيمة الأتعاب المتعاقد عليها"
            value={formatCurrency(stats.total, "SAR")}
            icon={Scale}
            tone="info"
          />
        </div>

        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
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
                  setType("");
                  setStatus("");
                  setPriority("");
                  setLawyer("");
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
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">كل الأنواع</option>
                {Object.entries(CLIENT_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">كل الحالات</option>
                {Object.entries(CLIENT_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">كل الأولويات</option>
                <option value="normal">عادية</option>
                <option value="high">متصاعدة</option>
                <option value="vip">م VIP</option>
              </Select>
              <Select value={lawyer} onChange={(e) => setLawyer(e.target.value)}>
                <option value="">كل المحامين</option>
                {(users ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <DataTable
            rows={filtered}
            columns={columns}
            rowKey={(c) => c.id}
            onRowClick={(c) => setDetailId(c.id)}
            searchPlaceholder="ابحث بالاسم أو الرقم أو المدينة…"
            searchFn={(c, q) =>
              c.name.toLowerCase().includes(q) ||
              (c.legalName ?? "").toLowerCase().includes(q) ||
              (c.nationalId ?? "").toLowerCase().includes(q) ||
              (c.commercialId ?? "").toLowerCase().includes(q) ||
              (c.email ?? "").toLowerCase().includes(q) ||
              (c.city ?? "").toLowerCase().includes(q) ||
              c.tags.some((t) => t.toLowerCase().includes(q))
            }
            emptyIcon={Users}
            emptyTitle="لا يوجد موكلون"
            emptyDescription="ابدأ بإضافة موكّل جديد إلى سجل المكتب."
            rowActions={(c) => (
              <div className="flex items-center gap-1">
                {can("clients.edit") && (
                  <IconButton
                    icon={Pencil}
                    label="تعديل"
                    size="xs"
                    onClick={() => {
                      setEditId(c.id);
                      setFormOpen(true);
                    }}
                  />
                )}
                {can("clients.archive") && (
                  <IconButton
                    icon={c.archived ? ArchiveRestore : Archive}
                    label={c.archived ? "استعادة" : "أرشفة"}
                    size="xs"
                    onClick={() => setConfirm({ client: c, mode: "archive" })}
                  />
                )}
                {can("clients.delete") && (
                  <IconButton
                    icon={Trash2}
                    label="حذف"
                    size="xs"
                    onClick={() => setConfirm({ client: c, mode: "delete" })}
                  />
                )}
              </div>
            )}
          />
        </div>

        {/* نسخة للطباعة */}
        <div id="clients-print-area" className="hidden">
          <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>قائمة الموكلين</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["الاسم", "النوع", "الحالة", "الهاتف", "المدينة", "عدد القضايا"].map((h) => (
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
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{c.name}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{CLIENT_TYPES[c.type]}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{CLIENT_STATUS[c.status].label}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{c.phone ?? "—"}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{c.city ?? "—"}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{mattersOf(c.id).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageBody>

      {/* ------------------------- درج تفاصيل الموكّل ------------------------- */}
      <Drawer
        open={!!detail}
        onClose={() => setDetailId(null)}
        width="lg"
        title={detail?.name ?? ""}
        subtitle={detail ? `${CLIENT_TYPES[detail.type]} · ${CLIENT_STATUS[detail.status].label}` : ""}
        footer={
          detail && (
            <>
              {can("clients.edit") && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={Pencil}
                  onClick={() => {
                    setEditId(detail.id);
                    setFormOpen(true);
                  }}
                >
                  تعديل البيانات
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                icon={Scale}
                onClick={() => {
                  setDetailId(null);
                  navigate("/matters");
                }}
              >
                عرض القضايا
              </Button>
            </>
          )
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <InfoBox label="رقم الهوية" value={detail.nationalId ?? "—"} mono />
              <InfoBox label="السجل التجاري" value={detail.commercialId ?? "—"} mono />
              <InfoBox label="الجوال" value={detail.phone ?? "—"} mono />
              <InfoBox label="البريد الإلكتروني" value={detail.email ?? "—"} />
              <InfoBox label="المدينة" value={detail.city ?? "—"} />
              <InfoBox label="المهنة" value={detail.profession ?? "—"} />
              <InfoBox label="المحامي المسؤول" value={userName(detail.assignedTo)} />
              <InfoBox label="تاريخ الإضافة" value={formatDateShort(detail.createdAt)} />
            </div>

            {detail.address && (
              <div className="rounded-xl border border-line bg-surface-2 p-3 text-[12.5px] text-ink-soft">
                <span className="mb-1 block text-[11px] text-muted">العنوان</span>
                {detail.address}
              </div>
            )}

            {detail.notes && (
              <div className="rounded-xl border border-line bg-surface-2 p-3 text-[12.5px] leading-relaxed text-ink-soft">
                <span className="mb-1 block text-[11px] text-muted">ملاحظات</span>
                {detail.notes}
              </div>
            )}

            <div className="rounded-xl border border-line bg-surface-2 p-3">
              <div className="mb-2 flex items-center justify-between text-[12px]">
                <span className="text-muted">نسبة الأتعاب المحصّلة</span>
                <span className="num font-semibold text-ink">
                  {formatCurrency(
                    (matters ?? [])
                      .filter((m) => m.clientId === detail.id)
                      .reduce((s, m) => s + (m.agreedFee || 0), 0),
                    "SAR",
                  )}
                </span>
              </div>
              <Progress value={detailMatters.length ? 72 : 0} tone="ok" size="sm" />
            </div>

            <SectionCard title="القضايا" subtitle={`${detailMatters.length} قضية`} bodyClassName="p-0">
              {detailMatters.length === 0 ? (
                <EmptyState icon={FolderOpen} title="لا توجد قضايا" description="لم تُسجَّل قضايا لهذا الموكّل بعد." />
              ) : (
                <ul className="divide-y divide-line-soft">
                  {detailMatters.map((m) => (
                    <li key={m.id}>
                      <button
                        onClick={() => {
                          setDetailId(null);
                          navigate(`/matters/${m.id}`);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-surface-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold text-ink">{m.title}</div>
                          <div className="num text-[11px] text-muted">{m.number}</div>
                        </div>
                        <span className="num shrink-0 text-[12px] font-semibold text-accent">
                          {formatCurrency(m.agreedFee, m.currency)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <SectionCard title="المهام" subtitle={`${detailTasks.length} مهمة`} bodyClassName="p-0">
                {detailTasks.length === 0 ? (
                  <EmptyState icon={ListTodo} title="لا توجد مهام" />
                ) : (
                  <ul className="divide-y divide-line-soft">
                    {detailTasks.slice(0, 6).map((t) => (
                      <li key={t.id} className="px-4 py-2.5">
                        <div className="truncate text-[12.5px] text-ink-soft">{t.title}</div>
                        <div className="text-[11px] text-muted">
                          {t.dueDate ? formatDateShort(t.dueDate) : "بلا موعد"}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              <SectionCard title="الوثائق" subtitle={`${detailDocs.length} وثيقة`} bodyClassName="p-0">
                {detailDocs.length === 0 ? (
                  <EmptyState icon={FileText} title="لا توجد وثائق" />
                ) : (
                  <ul className="divide-y divide-line-soft">
                    {detailDocs.slice(0, 6).map((d) => (
                      <li key={d.id} className="px-4 py-2.5">
                        <div className="truncate text-[12.5px] text-ink-soft">{d.title}</div>
                        <div className="text-[11px] text-muted">{formatDateShort(d.createdAt)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>
          </div>
        )}
      </Drawer>

      <ClientForm open={formOpen} onClose={() => setFormOpen(false)} clientId={editId} />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doArchiveToggle}
        title={confirm?.mode === "delete" ? "حذف الموكّل" : confirm?.client.archived ? "استعادة الموكّل" : "أرشفة الموكّل"}
        message={
          confirm?.mode === "delete"
            ? `سيتم حذف «${confirm?.client.name}» نهائيًا. لا يمكن التراجع عن هذه الخطوة.`
            : confirm?.client.archived
              ? `سيتم إعادة «${confirm?.client.name}» إلى قائمة الموكلين النشطين.`
              : `سيتم نقل «${confirm?.client.name}» إلى الأرشيف مع الاحتفاظ بسجلاته.`
        }
        confirmLabel={confirm?.mode === "delete" ? "حذف نهائي" : "تأكيد"}
        tone={confirm?.mode === "delete" ? "danger" : "primary"}
      />
    </>
  );
}

function InfoBox({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-2">
      <div className="text-[10.5px] text-muted">{label}</div>
      <div className={cn("mt-0.5 truncate text-[12.5px] font-medium text-ink", mono && "num")}>{value}</div>
    </div>
  );
}
