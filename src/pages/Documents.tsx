import { useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  FolderOpen,
  Plus,
  Download,
  Printer,
  FileText,
  FileDown,
  Trash2,
  Pencil,
  Lock,
  X,
  Paperclip,
  Eye,
  Archive,
  ArchiveRestore,
  FileSignature,
  FileStack,
  HardDrive,
} from "lucide-react";
import { db, getFile, logActivity, deleteFile } from "@/lib/db";
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
  Segmented,
} from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Drawer, ConfirmDialog, useToast, Modal } from "@/components/ui/overlays";
import { SectionCard, DocCategoryBadge } from "@/components/common/Badges";
import { DocumentForm } from "@/components/forms/Forms";
import { DOC_CATEGORIES, formatDateShort, formatBytes } from "@/lib/format";
import { downloadCsv, downloadPdf } from "@/lib/pdf";
import { printElement } from "@/lib/print";
import type { LegalDocument } from "@/lib/types";

export default function Documents() {
  const { can, settings, user } = useApp();
  const toast = useToast();
  const printRef = useRef<HTMLDivElement | null>(null);

  const [view, setView] = useState<"table" | "grid">("table");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<LegalDocument | null>(null);
  const [confirm, setConfirm] = useState<{ doc: LegalDocument; mode: "delete" | "archive" } | null>(null);
  const [preview, setPreview] = useState<{ name: string; url: string; mime: string } | null>(null);
  const [category, setCategory] = useState("");
  const [matter, setMatter] = useState("");
  const [confidentialOnly, setConfidentialOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState(false);

  const documents = useLiveQuery(() => db.documents.toArray(), [], []);
  const matters = useLiveQuery(() => db.matters.toArray(), [], []);
  const clients = useLiveQuery(() => db.clients.toArray(), [], []);

  const matterTitle = (id?: string) => (matters ?? []).find((m) => m.id === id)?.title ?? "";
  const clientName = (id?: string) => (clients ?? []).find((c) => c.id === id)?.name ?? "";

  const filtered = useMemo(
    () =>
      (documents ?? []).filter((d) => {
        if (showArchived ? !d.archived : d.archived) return false;
        if (category && d.category !== category) return false;
        if (matter && d.matterId !== matter) return false;
        if (confidentialOnly && !d.confidential) return false;
        return true;
      }),
    [documents, category, matter, confidentialOnly, showArchived],
  );

  const stats = useMemo(() => {
    const list = (documents ?? []).filter((d) => !d.archived);
    const size = list.reduce((s, d) => s + (d.size ?? 0), 0);
    const confidential = list.filter((d) => d.confidential).length;
    const pending = list.filter((d) => d.requiresSignature && !d.signedAt).length;
    return { count: list.length, size, confidential, pending };
  }, [documents]);

  const openFile = async (doc: LegalDocument) => {
    if (!doc.fileId) {
      toast.error("لا يوجد ملف مرفق بهذه الوثيقة");
      return;
    }
    const f = await getFile(doc.fileId);
    if (!f) {
      toast.error("تعذّر العثور على الملف");
      return;
    }
    const url = URL.createObjectURL(f.blob);
    if (f.mime.startsWith("image/") || f.mime === "application/pdf") {
      setPreview({ name: f.name, url, mime: f.mime });
    } else {
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  };

  const downloadFile = async (doc: LegalDocument) => {
    if (!doc.fileId) {
      toast.error("لا يوجد ملف مرفق بهذه الوثيقة");
      return;
    }
    const f = await getFile(doc.fileId);
    if (!f) {
      toast.error("تعذّر العثور على الملف");
      return;
    }
    const url = URL.createObjectURL(f.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    await db.documents.update(doc.id, { printCount: (doc.printCount ?? 0) + 1 });
    toast.success("تم تنزيل الملف");
  };

  const exportPdf = async (doc: LegalDocument) => {
    if (!printRef.current) return;
    setBusy(true);
    try {
      await downloadPdf(printRef.current, `وثيقة-${doc.title}`, {
        header: settings.printHeader || "مكتب المحاماة",
        footer: settings.printFooter || "سري ومحدود التداول",
        orientation: "portrait",
      });
      await logActivity({
        userId: user?.id,
        userName: user?.name ?? "—",
        action: "تصدير PDF",
        entity: "وثيقة",
        entityId: doc.id,
        meta: doc.title,
      });
      toast.success("تم تصدير الوثيقة بصيغة PDF");
    } catch {
      toast.error("تعذّر إنشاء ملف PDF");
    } finally {
      setBusy(false);
    }
  };

  const printDoc = (doc: LegalDocument) => {
    if (!printRef.current) return;
    void db.documents.update(doc.id, { printCount: (doc.printCount ?? 0) + 1 });
    printElement(printRef.current, {
      header: settings.printHeader,
      footer: settings.printFooter,
      title: doc.title,
    });
  };

  const exportCsv = () => {
    downloadCsv(
      `الوثائق-${new Date().toISOString().slice(0, 10)}`,
      ["العنوان", "التصنيف", "القضية", "الموكّل", "النسخة", "الحجم", "تاريخ الإضافة", "سري"],
      filtered.map((d) => [
        d.title,
        DOC_CATEGORIES[d.category].label,
        matterTitle(d.matterId),
        clientName(d.clientId),
        d.version,
        d.size ? formatBytes(d.size) : "",
        formatDateShort(d.createdAt),
        d.confidential ? "نعم" : "لا",
      ]),
    );
    toast.success("تم تصدير سجل الوثائق");
  };

  const columns: Column<LegalDocument>[] = [
    {
      key: "title",
      header: "الوثيقة",
      mobile: "primary",
      sortValue: (d) => d.title,
      render: (d) => (
        <div className="min-w-[220px]">
          <div className="flex items-center gap-1.5">
            <FileText className="size-3.5 shrink-0 text-muted" />
            <span className="truncate font-semibold text-ink">{d.title}</span>
            {d.confidential && <Lock className="size-3 shrink-0 text-danger" />}
            {d.requiresSignature && !d.signedAt && (
              <FileSignature className="size-3 shrink-0 text-warn" />
            )}
          </div>
          {d.fileName && (
            <div className="truncate text-[11px] text-muted">
              {d.fileName} {d.size ? `· ${formatBytes(d.size)}` : ""}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: "التصنيف",
      mobile: "secondary",
      sortValue: (d) => DOC_CATEGORIES[d.category].label,
      render: (d) => <DocCategoryBadge category={d.category} />,
    },
    {
      key: "matter",
      header: "القضية",
      mobile: "row",
      sortValue: (d) => matterTitle(d.matterId),
      render: (d) => (
        <span className="line-clamp-1 max-w-[180px] text-[12.5px]">{matterTitle(d.matterId) || "—"}</span>
      ),
    },
    {
      key: "client",
      header: "الموكّل",
      mobile: "hidden",
      sortValue: (d) => clientName(d.clientId),
      render: (d) => <span className="text-[12.5px]">{clientName(d.clientId) || "—"}</span>,
    },
    {
      key: "version",
      header: "النسخة",
      align: "center",
      mobile: "row",
      sortValue: (d) => d.version,
      render: (d) => <Badge tone="muted">v{d.version}</Badge>,
    },
    {
      key: "date",
      header: "تاريخ الإضافة",
      mobile: "hidden",
      sortValue: (d) => d.createdAt,
      render: (d) => <span className="num text-[12px] text-muted">{formatDateShort(d.createdAt)}</span>,
    },
  ];

  const doConfirm = async () => {
    if (!confirm) return;
    const { doc, mode } = confirm;
    if (mode === "delete") {
      if (doc.fileId) await deleteFile(doc.fileId);
      await db.documents.delete(doc.id);
      toast.success("تم حذف الوثيقة");
    } else {
      await db.documents.update(doc.id, {
        archived: !doc.archived,
        archivedAt: doc.archived ? undefined : new Date().toISOString(),
      });
      toast.success(doc.archived ? "تمت استعادة الوثيقة" : "تمت أرشفة الوثيقة");
    }
    setConfirm(null);
  };

  const activeFilters = [category, matter].filter(Boolean).length + (confidentialOnly ? 1 : 0);

  return (
    <>
      <PageHeader
        title="الوثائق والأوراق"
        subtitle={`${stats.count} وثيقة · ${formatBytes(stats.size)} مستخدمة`}
        icon={
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-2 to-accent text-accent-ink">
            <FolderOpen className="size-6" />
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" icon={Download} onClick={exportCsv}>
              CSV
            </Button>
            {can("documents.create") && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => {
                  setEditId(undefined);
                  setFormOpen(true);
                }}
              >
                وثيقة جديدة
              </Button>
            )}
          </>
        }
      />

      <PageBody>
        <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="إجمالي الوثائق" value={stats.count} suffix="وثيقة" icon={FileStack} tone="accent" />
          <StatCard label="المساحة المستخدمة" value={formatBytes(stats.size)} icon={HardDrive} tone="info" />
          <StatCard label="وثائق سرية" value={stats.confidential} suffix="وثيقة" icon={Lock} tone="danger" />
          <StatCard label="بانتظار التوقيع" value={stats.pending} suffix="وثيقة" icon={FileSignature} tone="warn" />
        </div>

        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: "table", label: "جدول", icon: FileStack },
                { value: "grid", label: "بطاقات", icon: FolderOpen },
              ]}
            />
            <Select value={category} onChange={(e) => setCategory(e.target.value)} className="max-w-[190px]">
              <option value="">كل التصنيفات</option>
              {Object.entries(DOC_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
            <Select value={matter} onChange={(e) => setMatter(e.target.value)} className="max-w-[220px]">
              <option value="">كل القضايا</option>
              {(matters ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.number} — {m.title}
                </option>
              ))}
            </Select>
            <div className="ms-auto flex flex-wrap items-center gap-3">
              <Checkbox
                checked={confidentialOnly}
                onChange={setConfidentialOnly}
                label={<span className="flex items-center gap-1"><Lock className="size-3" /> السرية فقط</span>}
              />
              <Checkbox
                checked={showArchived}
                onChange={setShowArchived}
                label={<span className="flex items-center gap-1"><Archive className="size-3" /> المؤرشفة</span>}
              />
              {activeFilters > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={X}
                  onClick={() => {
                    setCategory("");
                    setMatter("");
                    setConfidentialOnly(false);
                  }}
                >
                  مسح
                </Button>
              )}
            </div>
          </div>

          {view === "table" ? (
            <DataTable
              rows={filtered}
              columns={columns}
              rowKey={(d) => d.id}
              onRowClick={(d) => setSelected(d)}
              searchPlaceholder="ابحث في الوثائق…"
              searchFn={(d, q) =>
                d.title.toLowerCase().includes(q) ||
                (d.fileName ?? "").toLowerCase().includes(q) ||
                d.tags.some((t) => t.toLowerCase().includes(q)) ||
                matterTitle(d.matterId).toLowerCase().includes(q)
              }
              emptyIcon={FolderOpen}
              emptyTitle="لا توجد وثائق"
              emptyDescription="ابدأ برفع أول وثيقة أو توكيل أو عقد إلى أرشيف المكتب."
              rowActions={(d) => (
                <div className="flex items-center gap-1">
                  {d.fileId && (
                    <IconButton icon={Eye} label="عرض" size="xs" onClick={() => void openFile(d)} />
                  )}
                  {can("documents.edit") && (
                    <IconButton
                      icon={Pencil}
                      label="تعديل"
                      size="xs"
                      onClick={() => {
                        setEditId(d.id);
                        setFormOpen(true);
                      }}
                    />
                  )}
                  {can("documents.delete") && (
                    <IconButton
                      icon={Trash2}
                      label="حذف"
                      size="xs"
                      onClick={() => setConfirm({ doc: d, mode: "delete" })}
                    />
                  )}
                </div>
              )}
            />
          ) : (
            <div className="grid gap-3.5 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelected(d)}
                  className="card card-hover flex flex-col gap-2.5 p-4 text-start"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                      <FileText className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-[13.5px] font-bold text-ink">{d.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <DocCategoryBadge category={d.category} />
                        <Badge tone="muted">v{d.version}</Badge>
                        {d.confidential && (
                          <Badge tone="danger" icon={Lock}>
                            سري
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {d.matterId && (
                    <div className="truncate text-[11.5px] text-muted">{matterTitle(d.matterId)}</div>
                  )}
                  <div className="mt-auto flex items-center justify-between border-t border-line-soft pt-2.5 text-[11px] text-muted">
                    <span className="num">{formatDateShort(d.createdAt)}</span>
                    <span className="num">{d.size ? formatBytes(d.size) : "—"}</span>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="sm:col-span-2 xl:col-span-3 2xl:col-span-4">
                  <EmptyState icon={FolderOpen} title="لا توجد وثائق" description="جرّب تعديل عوامل التصفية." />
                </div>
              )}
            </div>
          )}
        </div>
      </PageBody>

      {/* ------------------------- درج تفاصيل الوثيقة ------------------------- */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        width="lg"
        title={selected?.title ?? ""}
        subtitle={selected ? DOC_CATEGORIES[selected.category].label : ""}
        footer={
          selected && (
            <>
              {can("documents.print") && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={Printer}
                  onClick={() => printDoc(selected)}
                >
                  طباعة مباشرة
                </Button>
              )}
              {can("documents.export") && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={FileDown}
                  loading={busy}
                  onClick={() => void exportPdf(selected)}
                >
                  تصدير PDF
                </Button>
              )}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <DocCategoryBadge category={selected.category} />
              <Badge tone="muted">النسخة {selected.version}</Badge>
              {selected.confidential && (
                <Badge tone="danger" icon={Lock}>
                  سري
                </Badge>
              )}
              {selected.requiresSignature && (
                <Badge tone={selected.signedAt ? "ok" : "warn"} icon={FileSignature}>
                  {selected.signedAt ? "موقّعة" : "بانتظار التوقيع"}
                </Badge>
              )}
            </div>

            {selected.fileName ? (
              <div className="rounded-xl border border-line bg-surface-2 p-3">
                <div className="flex items-center gap-2.5">
                  <Paperclip className="size-4 text-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-ink">{selected.fileName}</div>
                    <div className="text-[11px] text-muted">
                      {selected.size ? formatBytes(selected.size) : "—"}
                      {selected.mime ? ` · ${selected.mime}` : ""}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="soft" icon={Eye} onClick={() => void openFile(selected)}>
                    معاينة
                  </Button>
                  <Button size="sm" variant="outline" icon={Download} onClick={() => void downloadFile(selected)}>
                    تنزيل
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-line p-6 text-center text-[12.5px] text-muted">
                <FileText className="mx-auto mb-2 size-6 opacity-50" />
                لا يوجد ملف مرفق بهذه الوثيقة
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <MetaBox label="القضية" value={matterTitle(selected.matterId) || "—"} />
              <MetaBox label="الموكّل" value={clientName(selected.clientId) || "—"} />
              <MetaBox label="تاريخ الإضافة" value={formatDateShort(selected.createdAt)} />
              <MetaBox label="آخر تحديث" value={formatDateShort(selected.updatedAt)} />
              <MetaBox label="عدد مرات الطباعة" value={String(selected.printCount ?? 0)} />
              <MetaBox label="تاريخ التوقيع" value={selected.signedAt ? formatDateShort(selected.signedAt) : "—"} />
            </div>

            {selected.notes && (
              <div className="rounded-xl border border-line bg-surface-2 p-3 text-[12.5px] leading-relaxed text-ink-soft">
                <span className="mb-1 block text-[11px] text-muted">ملاحظات</span>
                {selected.notes}
              </div>
            )}

            {selected.tags.length > 0 && (
              <div>
                <div className="mb-1.5 text-[11.5px] font-semibold text-muted">الوسوم</div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.tags.map((t) => (
                    <Badge key={t} tone="accent">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <SectionCard title="الإجراءات" bodyClassName="p-3">
              <div className="flex flex-wrap gap-2">
                {can("documents.edit") && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Pencil}
                    onClick={() => {
                      setEditId(selected.id);
                      setFormOpen(true);
                    }}
                  >
                    تعديل البيانات
                  </Button>
                )}
                {can("documents.edit") && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={selected.archived ? ArchiveRestore : Archive}
                    onClick={() => setConfirm({ doc: selected, mode: "archive" })}
                  >
                    {selected.archived ? "استعادة" : "أرشفة"}
                  </Button>
                )}
                {can("documents.delete") && (
                  <Button
                    size="sm"
                    variant="danger"
                    icon={Trash2}
                    onClick={() => setConfirm({ doc: selected, mode: "delete" })}
                  >
                    حذف
                  </Button>
                )}
              </div>
            </SectionCard>
          </div>
        )}
      </Drawer>

      {/* ------------------ معاينة الملفات ------------------ */}
      <Modal
        open={!!preview}
        onClose={() => {
          if (preview) URL.revokeObjectURL(preview.url);
          setPreview(null);
        }}
        size="xl"
        title={preview?.name ?? ""}
      >
        {preview?.mime === "application/pdf" ? (
          <iframe src={preview.url} title="preview" className="h-[70vh] w-full rounded-xl border border-line" />
        ) : (
          <img src={preview?.url} alt={preview?.name} className="mx-auto max-h-[70vh] rounded-xl" />
        )}
      </Modal>

      <DocumentForm open={formOpen} onClose={() => setFormOpen(false)} docId={editId} />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doConfirm}
        title={confirm?.mode === "delete" ? "حذف الوثيقة" : "أرشفة الوثيقة"}
        message={
          confirm?.mode === "delete"
            ? `سيتم حذف «${confirm?.doc.title}» والملف المرفق نهائيًا.`
            : `سيتم نقل «${confirm?.doc.title}» إلى الأرشيف.`
        }
        confirmLabel={confirm?.mode === "delete" ? "حذف نهائي" : "تأكيد"}
        tone={confirm?.mode === "delete" ? "danger" : "primary"}
      />

      {/* مساحة الطباعة — تُستخدم عند طباعة أو تصدير وثيقة مفردة */}
      <div ref={printRef} className="hidden">
        {selected && (
          <div style={{ padding: 24, background: "#fff", color: "#000" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "2px solid #b08419",
                paddingBottom: 10,
                marginBottom: 18,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {settings.profile.firmName || "مكتب المحاماة"}
              </div>
              <div style={{ fontSize: 12, textAlign: "left" }}>
                <div>{settings.profile.lawyerName}</div>
                <div>رقم الترخيص: {settings.profile.licenseNumber || "—"}</div>
                <div>{settings.profile.phone}</div>
              </div>
            </div>

            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{selected.title}</h1>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 18 }}>
              {DOC_CATEGORIES[selected.category].label} · النسخة {selected.version} ·{" "}
              {formatDateShort(selected.createdAt)}
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 20 }}>
              <tbody>
                <tr>
                  <th style={{ width: 160, textAlign: "right", border: "1px solid #ccc", padding: 8, background: "#f5f5f5" }}>
                    القضية
                  </th>
                  <td style={{ border: "1px solid #ccc", padding: 8 }}>{matterTitle(selected.matterId) || "—"}</td>
                </tr>
                <tr>
                  <th style={{ textAlign: "right", border: "1px solid #ccc", padding: 8, background: "#f5f5f5" }}>
                    الموكّل
                  </th>
                  <td style={{ border: "1px solid #ccc", padding: 8 }}>{clientName(selected.clientId) || "—"}</td>
                </tr>
                <tr>
                  <th style={{ textAlign: "right", border: "1px solid #ccc", padding: 8, background: "#f5f5f5" }}>
                    ملاحظات
                  </th>
                  <td style={{ border: "1px solid #ccc", padding: 8 }}>{selected.notes || "—"}</td>
                </tr>
              </tbody>
            </table>

            <div
              style={{
                marginTop: 40,
                borderTop: "1px solid #999",
                paddingTop: 10,
                fontSize: 11,
                color: "#555",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>{settings.confidentialityNotice || "سري ومحدود التداول"}</span>
              <span>{formatDateShort(new Date().toISOString())}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function MetaBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-2">
      <div className="text-[10.5px] text-muted">{label}</div>
      <div className="mt-0.5 truncate text-[12.5px] font-medium text-ink">{value}</div>
    </div>
  );
}
