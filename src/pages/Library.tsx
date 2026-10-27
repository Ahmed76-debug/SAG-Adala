import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  BookOpen,
  Plus,
  Download,
  Trash2,
  Pencil,
  Star,
  ExternalLink,
  FileText,
  Video,
  Newspaper,
  GraduationCap,
  Copy,
  Headphones,
  X,
  Search,
  Bookmark,
  MessageSquare,
  Archive,
  ArchiveRestore,
  Upload,
  FileDown,
  PlayCircle,
} from "lucide-react";
import { db, getFile, logActivity, saveFile, uid, nowISO, deleteFile } from "@/lib/db";
import { useApp } from "@/state/AppProvider";
import { PageHeader, PageBody } from "@/components/layout/AppShell";
import {
  Button,
  Badge,
  Select,
  IconButton,
  EmptyState,
  StatCard,
  Field,
  Input,
  Textarea,
  Checkbox,
  Progress,
} from "@/components/ui/primitives";
import { Drawer, ConfirmDialog, Modal, useToast } from "@/components/ui/overlays";
import { SectionCard } from "@/components/common/Badges";
import { LIBRARY_TYPES, LIBRARY_STATUS, formatDateShort } from "@/lib/format";
import { downloadCsv } from "@/lib/pdf";
import { cn } from "@/lib/cn";
import type { LibraryItem, LibraryNote, LibraryStatus, LibraryType } from "@/lib/types";

const TYPE_ICONS: Record<LibraryType, typeof BookOpen> = {
  book: BookOpen,
  article: FileText,
  video: Video,
  journal: Newspaper,
  course: GraduationCap,
  template: Copy,
  audio: Headphones,
};

const COVERS = ["#1B2846", "#0F8A5F", "#B08419", "#7C3AED", "#0E7490", "#C02B3A", "#2563C9"];

export default function Library() {
  const { can, user } = useApp();
  const toast = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [detail, setDetail] = useState<LibraryItem | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [notePage, setNotePage] = useState("");
  const [confirm, setConfirm] = useState<LibraryItem | null>(null);
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [itemStatus, setItemStatus] = useState("");
  const [q, setQ] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const items = useLiveQuery(() => db.library.toArray(), [], []);

  const categories = useMemo(
    () => [...new Set((items ?? []).map((i) => i.category).filter(Boolean))].sort(),
    [items],
  );

  const editing = useMemo(
    () => (editId ? (items ?? []).find((i) => i.id === editId) ?? null : null),
    [editId, items],
  );

  const filtered = useMemo(
    () =>
      (items ?? []).filter((i) => {
        if (i.archived) return false;
        if (type && i.type !== type) return false;
        if (category && i.category !== category) return false;
        if (itemStatus && i.status !== itemStatus) return false;
        if (favOnly && !i.isFavorite) return false;
        if (q.trim()) {
          const t = q.trim().toLowerCase();
          if (
            !i.title.toLowerCase().includes(t) &&
            !(i.author ?? "").toLowerCase().includes(t) &&
            !i.description?.toLowerCase().includes(t) &&
            !i.tags.some((x) => x.toLowerCase().includes(t))
          )
            return false;
        }
        return true;
      }),
    [items, type, category, itemStatus, favOnly, q],
  );

  const stats = useMemo(() => {
    const list = (items ?? []).filter((i) => !i.archived);
    return {
      count: list.length,
      reading: list.filter((i) => i.status === "reading").length,
      finished: list.filter((i) => i.status === "finished").length,
      fav: list.filter((i) => i.isFavorite).length,
    };
  }, [items]);

  const openFile = async (item: LibraryItem) => {
    if (!item.fileId) {
      if (item.url) window.open(item.url, "_blank");
      else toast.error("لا يوجد رابط أو ملف لهذا العنصر");
      return;
    }
    const f = await getFile(item.fileId);
    if (!f) {
      toast.error("تعذّر العثور على الملف");
      return;
    }
    const url = URL.createObjectURL(f.blob);
    if (f.mime.startsWith("image/") || f.mime === "application/pdf") {
      window.open(url, "_blank");
    } else {
      window.open(url, "_blank");
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    await db.library.update(item.id, { lastOpenedAt: nowISO() });
  };

  const downloadFile = async (item: LibraryItem) => {
    if (!item.fileId) {
      if (item.url) window.open(item.url, "_blank");
      else toast.error("لا يوجد رابط أو ملف لهذا العنصر");
      return;
    }
    const f = await getFile(item.fileId);
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
    toast.success("تم تنزيل الملف");
  };

  const toggleFav = async (item: LibraryItem) => {
    await db.library.update(item.id, { isFavorite: !item.isFavorite });
  };

  const setProgress = async (item: LibraryItem, progress: number) => {
    await db.library.update(item.id, {
      progress,
      status: progress >= 100 ? "finished" : progress > 0 ? "reading" : item.status,
    });
  };

  const setStatus = async (item: LibraryItem, next: LibraryStatus) => {
    await db.library.update(item.id, { status: next });
    toast.success("تم تحديث حالة العنصر");
  };

  const addNote = async () => {
    if (!detail || !noteText.trim()) return;
    const note: LibraryNote = {
      id: uid("ln_"),
      body: noteText.trim(),
      page: notePage ? Number(notePage) : undefined,
      createdAt: nowISO(),
    };
    await db.library.update(detail.id, { notes: [...(detail.notes ?? []), note] });
    setNoteText("");
    setNotePage("");
    setNoteOpen(false);
    toast.success("أُضيفت الملاحظة");
  };

  const removeNote = async (noteId: string) => {
    if (!detail) return;
    await db.library.update(detail.id, { notes: detail.notes.filter((n) => n.id !== noteId) });
  };

  const saveItem = async () => {
    const title = (document.getElementById("lib-title") as HTMLInputElement | null)?.value?.trim();
    if (!title) {
      toast.error("عنوان العنصر مطلوب");
      return;
    }
    const t = (document.getElementById("lib-type") as HTMLSelectElement | null)?.value as LibraryType;
    const c = (document.getElementById("lib-category") as HTMLInputElement | null)?.value?.trim() || "عام";
    const a = (document.getElementById("lib-author") as HTMLInputElement | null)?.value?.trim();
    const u = (document.getElementById("lib-url") as HTMLInputElement | null)?.value?.trim();
    const d = (document.getElementById("lib-desc") as HTMLTextAreaElement | null)?.value?.trim();

    let fileId = editId ? (items ?? []).find((i) => i.id === editId)?.fileId : undefined;
    if (file) {
      const stored = await saveFile(file, file.name);
      fileId = stored.id;
    }

    const id = editId ?? uid("lib_");
    const payload: LibraryItem = {
      id,
      title,
      type: t ?? "book",
      author: a,
      category: c,
      description: d,
      url: u,
      fileId,
      coverColor: editing?.coverColor ?? COVERS[Math.floor(Math.random() * COVERS.length)],
      rating: editing?.rating ?? 0,
      status: editing?.status ?? "to_read",
      progress: editing?.progress ?? 0,
      tags: editing?.tags ?? [],
      notes: editing?.notes ?? [],
      isFavorite: editing?.isFavorite ?? false,
      addedAt: editing?.addedAt ?? nowISO(),
      addedBy: user?.id,
      archived: false,
    };
    await db.library.put(payload);
    await logActivity({
      userId: user?.id,
      userName: user?.name ?? "—",
      action: editId ? "تعديل" : "إضافة",
      entity: "عنصر مكتبة",
      entityId: id,
      meta: payload.title,
    });
    toast.success(editId ? "تم تحديث العنصر" : "تمت إضافة العنصر إلى المكتبة");
    setFormOpen(false);
    setEditId(undefined);
    setFile(null);
  };

  const exportCsv = () => {
    downloadCsv(
      `المكتبة-${new Date().toISOString().slice(0, 10)}`,
      ["العنوان", "النوع", "المؤلف", "التصنيف", "الحالة", "التقدّم", "مجلد"],
      filtered.map((i) => [
        i.title,
        LIBRARY_TYPES[i.type].label,
        i.author ?? "",
        i.category,
        LIBRARY_STATUS[i.status].label,
        `${i.progress}%`,
        i.isFavorite ? "نعم" : "لا",
      ]),
    );
    toast.success("تم تصدير فهرس المكتبة");
  };

  const activeFilters = [type, category, itemStatus].filter(Boolean).length + (favOnly ? 1 : 0);

  return (
    <>
      <PageHeader
        title="المكتبة القانونية"
        subtitle={`${stats.count} عنصرًا · ${stats.reading} قيد القراءة · ${stats.finished} مكتمل`}
        icon={
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-2 to-accent text-accent-ink">
            <BookOpen className="size-6" />
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" icon={Download} onClick={exportCsv}>
              CSV
            </Button>
            {can("library.create") && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => {
                  setEditId(undefined);
                  setFile(null);
                  setFormOpen(true);
                }}
              >
                عنصر جديد
              </Button>
            )}
          </>
        }
      />

      <PageBody>
        <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="إجمالي العناصر" value={stats.count} suffix="عنصر" icon={BookOpen} tone="accent" />
          <StatCard label="قيد القراءة" value={stats.reading} suffix="عنصر" icon={Bookmark} tone="info" />
          <StatCard label="مكتملة" value={stats.finished} suffix="عنصر" icon={FileDown} tone="ok" />
          <StatCard label="المفضّلة" value={stats.fav} suffix="عنصر" icon={Star} tone="warn" />
        </div>

        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث في المكتبة…"
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
            <Select value={type} onChange={(e) => setType(e.target.value)} className="max-w-[170px]">
              <option value="">كل الأنواع</option>
              {Object.entries(LIBRARY_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} className="max-w-[170px]">
              <option value="">كل التصنيفات</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select value={itemStatus} onChange={(e) => setItemStatus(e.target.value)} className="max-w-[170px]">
              <option value="">كل الحالات</option>
              {Object.entries(LIBRARY_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
            <div className="ms-auto flex flex-wrap items-center gap-3">
              <Checkbox
                checked={favOnly}
                onChange={setFavOnly}
                label={<span className="flex items-center gap-1"><Star className="size-3" /> المفضّلة</span>}
              />
              {activeFilters > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={X}
                  onClick={() => {
                    setType("");
                    setCategory("");
                    setItemStatus("");
                    setFavOnly(false);
                  }}
                >
                  مسح
                </Button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="لا توجد عناصر"
              description="أضف كتابًا أو مقالًا أو دورة تدريبية إلى مكتبة المكتب."
            />
          ) : (
            <div className="grid gap-3.5 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((i) => {
                const Icon = TYPE_ICONS[i.type];
                return (
                  <div key={i.id} className="card card-hover flex flex-col overflow-hidden">
                    <div
                      className="relative flex h-28 items-end p-3"
                      style={{ background: `linear-gradient(135deg, ${i.coverColor}, ${i.coverColor}bb)` }}
                    >
                      <Icon className="absolute end-3 top-3 size-8 text-white/20" />
                      <div className="relative">
                        <div className="line-clamp-2 text-[14px] font-bold leading-snug text-white">{i.title}</div>
                        {i.author && (
                          <div className="mt-0.5 truncate text-[11.5px] text-white/75">{i.author}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-2.5 p-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="muted">{LIBRARY_TYPES[i.type].label}</Badge>
                        <Badge tone="muted">{i.category}</Badge>
                        {i.isFavorite && (
                          <Badge tone="accent" icon={Star}>
                            مفضّل
                          </Badge>
                        )}
                      </div>

                      {i.description && (
                        <p className="line-clamp-2 text-[11.5px] leading-relaxed text-muted">{i.description}</p>
                      )}

                      {i.progress > 0 && (
                        <div>
                          <div className="mb-1 flex items-center justify-between text-[10.5px] text-muted">
                            <span>التقدّم</span>
                            <span className="num">{i.progress}%</span>
                          </div>
                          <Progress value={i.progress} size="sm" tone="accent" />
                        </div>
                      )}

                      <div className="mt-auto flex items-center gap-1.5 border-t border-line-soft pt-2.5">
                        <IconButton
                          icon={Star}
                          label="المفضّلة"
                          size="xs"
                          onClick={() => void toggleFav(i)}
                          className={cn(i.isFavorite && "text-accent")}
                        />
                        {i.fileId || i.url ? (
                          <IconButton
                            icon={i.type === "video" ? PlayCircle : ExternalLink}
                            label="فتح"
                            size="xs"
                            onClick={() => void openFile(i)}
                          />
                        ) : null}
                        {i.fileId && (
                          <IconButton icon={Download} label="تنزيل" size="xs" onClick={() => void downloadFile(i)} />
                        )}
                        <IconButton
                          icon={MessageSquare}
                          label="الملاحظات"
                          size="xs"
                          onClick={() => setDetail(i)}
                        />
                        {can("library.edit") && (
                          <IconButton
                            icon={Pencil}
                            label="تعديل"
                            size="xs"
                            onClick={() => {
                              setEditId(i.id);
                              setFile(null);
                              setFormOpen(true);
                            }}
                          />
                        )}
                        {can("library.delete") && (
                          <IconButton icon={Trash2} label="حذف" size="xs" onClick={() => setConfirm(i)} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PageBody>

      {/* ------------------------- نافذة إضافة/تعديل ------------------------- */}
      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditId(undefined);
        }}
        size="md"
        title={editId ? "تعديل عنصر المكتبة" : "إضافة عنصر جديد"}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setFormOpen(false);
                setEditId(undefined);
              }}
            >
              إلغاء
            </Button>
            <Button variant="primary" onClick={() => void saveItem()}>
              حفظ
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="العنوان" required>
            <Input id="lib-title" defaultValue={editing?.title ?? ""} placeholder="مثال: النظام التجاري السعودي" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="النوع">
              <Select id="lib-type" defaultValue={editing?.type ?? "book"}>
                {Object.entries(LIBRARY_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="التصنيف">
              <Input id="lib-category" defaultValue={editing?.category ?? ""} placeholder="تجاري" />
            </Field>
            <Field label="المؤلف / الناشر">
              <Input id="lib-author" defaultValue={editing?.author ?? ""} />
            </Field>
            <Field label="سنة النشر">
              <Input id="lib-year" type="number" defaultValue={editing?.year ?? ""} />
            </Field>
          </div>
          <Field label="الرابط" hint="رابط مباشر للمصدر أو النسخة الرقمية">
            <Input id="lib-url" defaultValue={editing?.url ?? ""} placeholder="https://" />
          </Field>
          <Field label="الوصف">
            <Textarea id="lib-desc" rows={3} defaultValue={editing?.description ?? ""} />
          </Field>
          <Field label="الملف" hint="PDF أو EPUB أو فيديو — يُحفظ محليًا داخل النظام">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line bg-surface-2 p-4 transition-colors hover:border-accent/50">
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Upload className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">
                  {file ? file.name : "اختر ملفًا"}
                </span>
                <span className="block text-[11.5px] text-muted">
                  {file ? `${(file.size / 1024).toFixed(0)} KB` : "من جهازك"}
                </span>
              </span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
              />
            </label>
          </Field>
        </div>
      </Modal>

      {/* ------------------------- درج التفاصيل ------------------------- */}
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        width="md"
        title={detail?.title ?? ""}
        subtitle={detail ? `${LIBRARY_TYPES[detail.type].label} · ${detail.category}` : ""}
        footer={
          detail && (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={MessageSquare}
                onClick={() => setNoteOpen(true)}
              >
                إضافة ملاحظة
              </Button>
              {detail.fileId && (
                <Button variant="primary" size="sm" icon={Download} onClick={() => void downloadFile(detail)}>
                  تنزيل
                </Button>
              )}
            </>
          )
        }
      >
        {detail && (
          <div className="space-y-4">
            <div
              className="flex h-32 items-end rounded-2xl p-4"
              style={{ background: `linear-gradient(135deg, ${detail.coverColor}, ${detail.coverColor}aa)` }}
            >
              <div>
                <div className="text-[16px] font-bold leading-snug text-white">{detail.title}</div>
                {detail.author && <div className="mt-0.5 text-[12px] text-white/80">{detail.author}</div>}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Badge tone="muted">{LIBRARY_TYPES[detail.type].label}</Badge>
              <Badge tone="muted">{detail.category}</Badge>
              <Badge
                style={{
                  color: LIBRARY_STATUS[detail.status].color,
                  borderColor: `${LIBRARY_STATUS[detail.status].color}44`,
                  backgroundColor: `${LIBRARY_STATUS[detail.status].color}18`,
                }}
              >
                {LIBRARY_STATUS[detail.status].label}
              </Badge>
              {detail.year && <Badge tone="muted">{detail.year}</Badge>}
            </div>

            {detail.description && (
              <p className="text-[12.5px] leading-relaxed text-ink-soft">{detail.description}</p>
            )}

            <div>
              <div className="mb-1.5 flex items-center justify-between text-[12px]">
                <span className="text-muted">نسبة الإنجاز</span>
                <span className="num font-semibold text-ink">{detail.progress}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={detail.progress}
                onChange={(e) => void setProgress(detail, Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </div>

            <div>
              <div className="mb-1.5 text-[11.5px] font-semibold text-muted">الحالة</div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(LIBRARY_STATUS).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => void setStatus(detail, k as LibraryStatus)}
                    className={cn(
                      "rounded-xl border px-3 py-1.5 text-[12px] transition-colors",
                      detail.status === k
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-line text-ink-soft hover:bg-surface-2",
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <SectionCard title="الملاحظات" subtitle={`${detail.notes.length} ملاحظة`} bodyClassName="p-3">
              {detail.notes.length === 0 ? (
                <div className="py-4 text-center text-[12px] text-muted">لا توجد ملاحظات بعد.</div>
              ) : (
                <ul className="space-y-2.5">
                  {detail.notes.map((n) => (
                    <li key={n.id} className="rounded-xl border border-line bg-surface-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[12.5px] leading-relaxed text-ink-soft">{n.body}</p>
                        {can("library.edit") && (
                          <IconButton
                            icon={Trash2}
                            label="حذف الملاحظة"
                            size="xs"
                            onClick={() => void removeNote(n.id)}
                          />
                        )}
                      </div>
                      <div className="mt-1.5 text-[10.5px] text-muted">
                        {formatDateShort(n.createdAt)}
                        {n.page ? ` · صفحة ${n.page}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            {can("library.edit") && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={Archive}
                  onClick={async () => {
                    await db.library.update(detail.id, { archived: true });
                    toast.success("تمت أرشفة العنصر");
                    setDetail(null);
                  }}
                >
                  أرشفة
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={ArchiveRestore}
                  onClick={async () => {
                    await db.library.update(detail.id, { archived: false });
                    toast.success("تمت استعادة العنصر");
                    setDetail(null);
                  }}
                >
                  استعادة
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* ------------------------- نافذة الملاحظة ------------------------- */}
      <Modal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        size="sm"
        title="إضافة ملاحظة"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNoteOpen(false)}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={() => void addNote()}>
              حفظ الملاحظة
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="نص الملاحظة">
            <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={4} />
          </Field>
          <Field label="رقم الصفحة">
            <Input value={notePage} onChange={(e) => setNotePage(e.target.value)} type="number" />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (confirm) {
            const cur = (items ?? []).find((i) => i.id === confirm.id);
            if (cur?.fileId) await deleteFile(cur.fileId);
            await db.library.delete(confirm.id);
            toast.success("تم حذف العنصر");
          }
          setConfirm(null);
        }}
        title="حذف عنصر المكتبة"
        message={`سيتم حذف «${confirm?.title}» والملف المرتبط به نهائيًا.`}
        confirmLabel="حذف نهائي"
      />
    </>
  );
}
