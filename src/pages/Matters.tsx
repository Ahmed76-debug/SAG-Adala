import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Scale,
  Plus,
  LayoutGrid,
  Rows3,
  Download,
  Printer,
  FileDown,
  Archive,
  Filter,
  X,
  Lock,
} from "lucide-react";
import { db } from "@/lib/db";
import { useApp } from "@/state/AppProvider";
import { PageHeader, PageBody } from "@/components/layout/AppShell";
import { Button, Select, Segmented, EmptyState, Checkbox } from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/ui/data-table";
import { MatterCard, StatusBadge, PriorityBadge, DueBadge } from "@/components/common/Badges";
import { MatterForm } from "@/components/forms/Forms";
import { MATTER_STATUS, MATTER_PRIORITY, formatCurrency, formatDateShort } from "@/lib/format";
import { downloadCsv, exportPrintArea, fileDateStamp } from "@/lib/pdf";
import { printElement } from "@/lib/print";
import { useToast } from "@/components/ui/overlays";
import type { Matter } from "@/lib/types";

const STATUS_ORDER: Matter["status"][] = [
  "open",
  "in_review",
  "hearing",
  "suspended",
  "settled",
  "judged",
  "closed",
];

export default function Matters() {
  const { can, settings } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<"table" | "grid">("table");
  const [formOpen, setFormOpen] = useState(params.get("new") === "1");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [lawyer, setLawyer] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const matters = useLiveQuery(() => db.matters.toArray(), [], []);
  const clients = useLiveQuery(() => db.clients.toArray(), [], []);
  const types = useLiveQuery(() => db.matterTypes.toArray(), [], []);
  const users = useLiveQuery(() => db.users.toArray(), [], []);

  const clientName = (id: string) => (clients ?? []).find((c) => c.id === id)?.name ?? "—";
  const typeName = (id: string) => (types ?? []).find((t) => t.id === id)?.name ?? "—";
  const typeColor = (id: string) => (types ?? []).find((t) => t.id === id)?.color ?? "#888";
  const lawyerNames = (ids: string[] = []) =>
    (ids ?? []).map((id) => (users ?? []).find((u) => u.id === id)?.name).filter(Boolean) as string[];

  const filtered = useMemo(
    () =>
      (matters ?? []).filter((m) => {
        if (showArchived ? !m.archived : m.archived) return false;
        if (type && m.typeId !== type) return false;
        if (status && m.status !== status) return false;
        if (priority && m.priority !== priority) return false;
        if (lawyer && !(m.lawyerIds ?? []).includes(lawyer)) return false;
        return true;
      }),
    [matters, type, status, priority, lawyer, showArchived],
  );

  const columns: Column<Matter>[] = [
    {
      key: "title",
      header: "القضية",
      mobile: "primary",
      sortValue: (m) => m.title,
      render: (m) => (
        <div className="min-w-[220px]">
          <div className="flex items-center gap-1.5">
            <span className="num text-[11.5px] font-semibold text-accent">{m.number}</span>
            {m.confidential && <Lock className="size-3 text-danger" />}
          </div>
          <div className="truncate font-semibold text-ink">{m.title}</div>
          <div className="truncate text-[11.5px] text-muted">{clientName(m.clientId)}</div>
        </div>
      ),
    },
    {
      key: "type",
      header: "النوع",
      mobile: "secondary",
      sortValue: (m) => typeName(m.typeId),
      render: (m) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: typeColor(m.typeId) }} />
          {typeName(m.typeId)}
        </span>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      mobile: "secondary",
      sortValue: (m) => m.status,
      render: (m) => <StatusBadge status={m.status} />,
    },
    {
      key: "priority",
      header: "الأولوية",
      mobile: "row",
      sortValue: (m) => ["normal", "high", "critical"].indexOf(m.priority),
      render: (m) => <PriorityBadge priority={m.priority} />,
    },
    {
      key: "fee",
      header: "الأتعاب",
      align: "end",
      mobile: "row",
      sortValue: (m) => m.agreedFee,
      render: (m) => <span className="num font-semibold">{formatCurrency(m.agreedFee, m.currency)}</span>,
    },
    {
      key: "progress",
      header: "الإنجاز",
      width: "120px",
      mobile: "hidden",
      sortValue: (m) => m.progress,
      render: (m) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${m.progress}%` }}
            />
          </div>
          <span className="num text-[11.5px] text-muted">{m.progress}%</span>
        </div>
      ),
    },
    {
      key: "next",
      header: "الموعد القادم",
      mobile: "row",
      sortValue: (m) => m.nextActionDate ?? "",
      render: (m) =>
        m.nextAction ? (
          <div className="min-w-[140px]">
            <div className="truncate text-[12.5px] text-ink-soft">{m.nextAction}</div>
            <DueBadge date={m.nextActionDate} />
          </div>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  const exportCsv = () => {
    downloadCsv(
      `القضايا-${new Date().toISOString().slice(0, 10)}`,
      ["الرقم", "الرقم الداخلي", "العنوان", "الموكّل", "النوع", "الحالة", "الأولوية", "المحكمة", "الأتعاب", "الإنجاز"],
      filtered.map((m) => [
        m.number,
        m.internalRef,
        m.title,
        clientName(m.clientId),
        typeName(m.typeId),
        MATTER_STATUS[m.status].label,
        MATTER_PRIORITY[m.priority].label,
        m.courtName ?? "",
        m.agreedFee,
        `${m.progress}%`,
      ]),
    );
    toast.success("تم تصدير قائمة القضايا");
  };

  const printList = () => {
    const el = document.getElementById("matters-print-area");
    if (!el) return;
    printElement(el, {
      header: settings.printHeader,
      footer: settings.printFooter,
      title: "قائمة القضايا",
    });
  };

  const exportPdf = async () => {
    const ok = await exportPrintArea(
      "matters-print-area",
      `قائمة-القضايا-${fileDateStamp()}`,
      {
        header: settings.printHeader,
        footer: settings.printFooter,
        orientation: "landscape",
      },
    );
    if (ok) toast.success("تم تصدير قائمة القضايا بصيغة PDF");
    else toast.error("تعذّر تصدير قائمة القضايا");
  };

  const activeFilters = [type, status, priority, lawyer].filter(Boolean).length;

  return (
    <>
      <PageHeader
        title="القضايا والملفات"
        subtitle={`${filtered.length} قضية معروضة من أصل ${(matters ?? []).length}`}
        icon={
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-2 to-accent text-accent-ink">
            <Scale className="size-6" />
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
            {can("matters.create") && (
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setFormOpen(true)}>
                قضية جديدة
              </Button>
            )}
          </>
        }
      />

      <PageBody>
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
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: "table", label: "جدول", icon: Rows3 },
                { value: "grid", label: "بطاقات", icon: LayoutGrid },
              ]}
            />
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
                {(types ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">كل الحالات</option>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {MATTER_STATUS[s].label}
                  </option>
                ))}
              </Select>
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">كل الأولويات</option>
                <option value="normal">عادية</option>
                <option value="high">متصاعدة</option>
                <option value="critical">حرجة</option>
              </Select>
              <Select value={lawyer} onChange={(e) => setLawyer(e.target.value)}>
                <option value="">كل المحامين</option>
                {(users ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
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
            </div>
          )}

          {view === "table" ? (
            <DataTable
              rows={filtered}
              columns={columns}
              rowKey={(m) => m.id}
              onRowClick={(m) => navigate(`/matters/${m.id}`)}
              searchPlaceholder="ابحث برقم القضية أو العنوان أو الموكّل…"
              searchFn={(m, q) =>
                m.title.toLowerCase().includes(q) ||
                m.number.toLowerCase().includes(q) ||
                m.internalRef.toLowerCase().includes(q) ||
                clientName(m.clientId).toLowerCase().includes(q) ||
                (m.courtName ?? "").toLowerCase().includes(q)
              }
              emptyIcon={Scale}
              emptyTitle="لا توجد قضايا"
              emptyDescription="ابدأ بفتح قضية جديدة لتتابع ملفها بالكامل."
            />
          ) : (
            <div className="grid gap-3.5 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((m) => (
                <MatterCard
                  key={m.id}
                  matter={m}
                  clientName={clientName(m.clientId)}
                  lawyerNames={lawyerNames(m.lawyerIds)}
                />
              ))}
              {filtered.length === 0 && (
                <div className="sm:col-span-2 xl:col-span-3">
                  <EmptyState icon={Scale} title="لا توجد قضايا" description="جرّب تعديل عوامل التصفية." />
                </div>
              )}
            </div>
          )}
        </div>

        {/* نسخة للطباعة */}
        <div id="matters-print-area" className="hidden">
          <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>قائمة القضايا</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["الرقم", "العنوان", "الموكّل", "النوع", "الحالة", "الأتعاب", "الموعد القادم"].map((h) => (
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
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{m.number}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{m.title}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{clientName(m.clientId)}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{typeName(m.typeId)}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{MATTER_STATUS[m.status].label}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{m.agreedFee}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>
                    {m.nextActionDate ? formatDateShort(m.nextActionDate) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageBody>

      <MatterForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          if (params.get("new")) {
            params.delete("new");
            setParams(params, { replace: true });
          }
        }}
      />
    </>
  );
}
