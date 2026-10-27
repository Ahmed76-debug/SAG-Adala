import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Award,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Pencil,
  FileText,
  Quote,
  Briefcase,
  GraduationCap,
  Star,
  Languages,
  Landmark,
  Award as AwardIcon,
} from "lucide-react";
import { db, nowISO, logActivity } from "@/lib/db";
import { useApp } from "@/state/AppProvider";
import { PageHeader, PageBody } from "@/components/layout/AppShell";
import { SectionCard } from "@/components/common/Badges";
import {
  Button,
  Field,
  Input,
  Textarea,
  Tabs,
  Badge,
  IconButton,
  EmptyState,
} from "@/components/ui/primitives";
import { useToast } from "@/components/ui/overlays";
import type { PortfolioContent } from "@/lib/types";

/* =============================================================
   محرر البورتفوليو العام
   ============================================================= */

type TabKey =
  | "hero"
  | "about"
  | "services"
  | "expertise"
  | "experience"
  | "credentials"
  | "cases"
  | "testimonials"
  | "articles"
  | "lists";

const SERVICE_ICONS = [
  { key: "gavel", label: "مطرقة" },
  { key: "scale", label: "ميزان" },
  { key: "file-signature", label: "توقيع" },
  { key: "building-2", label: "مبنى" },
  { key: "briefcase", label: "حقيبة" },
  { key: "graduation-cap", label: "تعليم" },
  { key: "landmark", label: "مؤسسة" },
];

function AvatarPreview({ fileId }: { fileId: string }) {
  const file = useLiveQuery(() => db.files.get(fileId), [fileId], undefined);
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!file?.blob) return;
    const url = URL.createObjectURL(file.blob);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file?.blob]);
  if (!src) return null;
  return <img src={src} alt="صورة المحامي" className="h-full w-full object-cover" />;
}

export default function PortfolioAdmin() {
  const { can, user, settings, updateSettings } = useApp();
  const toast = useToast();
  const stored = useLiveQuery(() => db.portfolio.get("portfolio"), [], undefined);
  const appSettings = useLiveQuery(() => db.settings.get("settings"), [], undefined);
  const [draft, setDraft] = useState<PortfolioContent | null>(null);
  const [tab, setTab] = useState<TabKey>("hero");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [headerLawyer, setHeaderLawyer] = useState(settings?.profile?.lawyerName || "");
  const [headerFirm, setHeaderFirm] = useState(settings?.profile?.firmName || "");
  const [headerDirty, setHeaderDirty] = useState(false);

  useEffect(() => {
    if (stored && !draft) setDraft(stored);
  }, [stored, draft]);

  useEffect(() => {
    if (stored && !dirty) setDraft(stored);
  }, [stored, dirty]);

  useEffect(() => {
    if (appSettings?.profile) {
      if (!headerDirty) {
        setHeaderLawyer(appSettings.profile.lawyerName || "");
        setHeaderFirm(appSettings.profile.firmName || "");
      }
    } else if (settings?.profile && !headerDirty) {
      setHeaderLawyer(settings.profile.lawyerName || "");
      setHeaderFirm(settings.profile.firmName || "");
    }
  }, [appSettings, settings, headerDirty]);

  if (!can("portfolio.edit")) {
    return (
      <PageBody>
        <EmptyState
          icon={Award}
          title="لا تملك صلاحية تحرير البورتفوليو"
          description="تواصل مع مدير النظام لمنحك صلاحية portfolio.edit."
        />
      </PageBody>
    );
  }

  if (!draft) {
    return (
      <PageBody>
        <EmptyState icon={Award} title="لا توجد بيانات بورتفوليو" description="جرّب تحديث الصفحة." />
      </PageBody>
    );
  }

  const set = (patch: Partial<PortfolioContent>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
  };

  const setList = <K extends keyof PortfolioContent>(
    key: K,
    list: PortfolioContent[K] extends (infer T)[] ? T[] : never,
  ) => {
    setDraft((d) => (d ? ({ ...d, [key]: list } as PortfolioContent) : d));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await db.portfolio.put({ ...draft, updatedAt: nowISO() });
      if (headerDirty) {
        const current = appSettings ?? settings ?? (await db.settings.get("settings"));
        if (current) {
          await db.settings.put({
            ...current,
            profile: {
              ...current.profile,
              lawyerName: headerLawyer.trim() || current.profile.lawyerName,
              firmName: headerFirm.trim() || current.profile.firmName,
            },
          });
        } else {
          await updateSettings({
            profile: {
              ...((settings?.profile as any) || {
                firmName: "",
                tagline: "",
                lawyerName: "",
                licenseNumber: "",
                email: "",
                phone: "",
                address: "",
                website: "",
              }),
              lawyerName: headerLawyer.trim(),
              firmName: headerFirm.trim(),
            } as any,
          });
        }
        setHeaderDirty(false);
      }
      await logActivity({
        userId: user?.id,
        userName: user?.name ?? "—",
        action: "تعديل",
        entity: "بورتفوليو",
        meta: "تحديث محتوى البورتفوليو العام وبيانات رأس الصفحة",
      });
      setDirty(false);
      toast.success("تم حفظ البورتفوليو", "التغييرات ظاهرة الآن في الصفحة العامة.");
    } catch {
      toast.error("تعذّر حفظ المحتوى");
    } finally {
      setSaving(false);
    }
  };

  const revert = () => {
    if (stored) setDraft(stored);
    setDirty(false);
    toast.info("تم التراجع عن التعديلات");
  };

  return (
    <>
      <PageHeader
        title="تحرير البورتفوليو العام"
        subtitle="المحتوى الظاهر في الصفحة التعريفية المفتوحة"
        icon={
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-2 to-accent text-accent-ink">
            <Award className="size-6" />
          </span>
        }
        actions={
          <>
            <Button variant="ghost" size="sm" icon={RotateCcw} disabled={!dirty} onClick={revert}>
              تراجع
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Save}
              loading={saving}
              disabled={!dirty && !headerDirty}
              onClick={() => void save()}
            >
              حفظ
            </Button>
          </>
        }
      />

      <PageBody>
        <div className="mb-4 overflow-x-auto">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "hero", label: "الواجهة", icon: Star },
              { value: "about", label: "النبذة", icon: FileText },
              { value: "services", label: "الخدمات", icon: Briefcase, count: draft.services.length },
              { value: "expertise", label: "الخبرة", icon: AwardIcon, count: draft.expertise.length },
              { value: "experience", label: "المسار", icon: GraduationCap, count: draft.experience.length },
              {
                value: "credentials",
                label: "المؤهلات",
                icon: Landmark,
                count: draft.credentials.length,
              },
              { value: "cases", label: "القضايا", icon: Eye, count: draft.caseHighlights.length },
              {
                value: "testimonials",
                label: "الآراء",
                icon: Quote,
                count: draft.testimonials.length,
              },
              { value: "articles", label: "المقالات", icon: FileText, count: draft.articles.length },
              { value: "lists", label: "اللغات والعضويات", icon: Languages },
            ]}
          />
        </div>

        {/* ------------------------------ الواجهة ------------------------------ */}
        {tab === "hero" && (
          <div className="grid gap-4">
            <SectionCard title="صورة المحامي ورأس الصفحة" subtitle="صورة المحامي تظهر بجوار اسمه في أعلى البورتفوليو وتبقى ثابتة عند التمرير">
              <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative flex size-40 items-center justify-center overflow-hidden rounded-3xl border border-line bg-surface-2 shadow-[var(--shadow-soft)]">
                    {draft.avatarFileId ? (
                      <AvatarPreview fileId={draft.avatarFileId} />
                    ) : (
                      <Award className="size-10 text-faint" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="portfolio-avatar"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const { saveFile } = await import("@/lib/db");
                          const stored = await saveFile(file, file.name);
                          set({ avatarFileId: stored.id });
                          toast.success("تم رفع صورة المحامي");
                        } catch {
                          toast.error("تعذّر رفع الصورة");
                        } finally {
                          e.target.value = "";
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Pencil}
                      onClick={() => document.getElementById("portfolio-avatar")?.click()}
                    >
                      رفع صورة
                    </Button>
                    {draft.avatarFileId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        onClick={() => {
                          set({ avatarFileId: undefined });
                          toast.info("تم إزالة الصورة");
                        }}
                      >
                        إزالة
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="اسم المحامي الظاهر في رأس الصفحة">
                    <Input
                      value={headerLawyer}
                      onChange={(e) => {
                        setHeaderLawyer(e.target.value);
                        setHeaderDirty(true);
                      }}
                      placeholder="عزت حسين الغرباوي"
                    />
                  </Field>
                  <Field label="اسم المكتب">
                    <Input
                      value={headerFirm}
                      onChange={(e) => {
                        setHeaderFirm(e.target.value);
                        setHeaderDirty(true);
                      }}
                      placeholder="مكتب الغرباوي للمحاماة والاستشارات القانونية"
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>
            <SectionCard title="نصوص الواجهة" subtitle="العنوان والعنوان الفرعي ونص زر الدعوة">
              <div className="grid gap-4">
                <Field label="عنوان الصفحة الرئيسية">
                  <Input value={draft.heroTitle} onChange={(e) => set({ heroTitle: e.target.value })} />
                </Field>
                <Field label="العنوان الفرعي">
                  <Textarea
                    rows={4}
                    value={draft.heroSubtitle}
                    onChange={(e) => set({ heroSubtitle: e.target.value })}
                  />
                </Field>
                <Field label="نص زر الدعوة">
                  <Input value={draft.heroCta} onChange={(e) => set({ heroCta: e.target.value })} />
                </Field>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ------------------------------ النبذة ------------------------------ */}
        {tab === "about" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="نص النبذة">
              <div className="grid gap-4">
                <Field label="عنوان النبذة">
                  <Input value={draft.aboutTitle} onChange={(e) => set({ aboutTitle: e.target.value })} />
                </Field>
                <Field label="نص النبذة">
                  <Textarea
                    rows={12}
                    value={draft.aboutBody}
                    onChange={(e) => set({ aboutBody: e.target.value })}
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="الدعوة للتواصل" subtitle="القسم الختامي في الصفحة">
              <div className="grid gap-4">
                <Field label="عنوان الدعوة">
                  <Input value={draft.ctaTitle} onChange={(e) => set({ ctaTitle: e.target.value })} />
                </Field>
                <Field label="نص الدعوة">
                  <Textarea
                    rows={5}
                    value={draft.ctaBody}
                    onChange={(e) => set({ ctaBody: e.target.value })}
                  />
                </Field>
                <Field label="مؤشرات الخبرة" hint="اكتب كل مؤشر في سطر، بالشكل: القيمة | اللقب | الوحدة">
                  <Textarea
                    rows={5}
                    value={draft.stats.map((s) => `${s.value} | ${s.label} | ${s.suffix ?? ""}`).join("\n")}
                    onChange={(e) =>
                      set({
                        stats: e.target.value
                          .split("\n")
                          .map((l) => l.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const [value = "", label = "", suffix = ""] = line.split("|").map((x) => x.trim());
                            return { value, label, suffix: suffix || undefined };
                          }),
                      })
                    }
                  />
                </Field>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ------------------------------ الخدمات ------------------------------ */}
        {tab === "services" && (
          <ListEditor
            title="الخدمات"
            hint="كل خدمة لها عنوان ووصف وأيقونة"
            items={draft.services}
            onAdd={() =>
              setList("services", [
                ...draft.services,
                { title: "خدمة جديدة", description: "وصف الخدمة", icon: "scale" },
              ])
            }
            onRemove={(i) => setList("services", draft.services.filter((_, x) => x !== i))}
            onUpdate={(i, patch) =>
              setList(
                "services",
                draft.services.map((s, x) => (x === i ? { ...s, ...patch } : s)),
              )
            }
            render={(item, patch) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="العنوان">
                  <Input
                    value={item.title}
                    onChange={(e) => patch({ title: e.target.value })}
                  />
                </Field>
                <Field label="الأيقونة">
                  <select
                    value={item.icon}
                    onChange={(e) => patch({ icon: e.target.value })}
                    className="input-base"
                  >
                    {SERVICE_ICONS.map((i) => (
                      <option key={i.key} value={i.key}>
                        {i.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="الوصف" className="sm:col-span-2">
                  <Textarea
                    rows={3}
                    value={item.description}
                    onChange={(e) => patch({ description: e.target.value })}
                  />
                </Field>
              </div>
            )}
          />
        )}

        {/* ------------------------------ الخبرة ------------------------------ */}
        {tab === "expertise" && (
          <ListEditor
            title="مجالات الخبرة"
            hint="كل مجال يحتوي نقاطًا فرعية"
            items={draft.expertise}
            onAdd={() =>
              setList("expertise", [
                ...draft.expertise,
                { title: "مجال جديد", description: "وصف المجال", items: ["نقطة أولى"] },
              ])
            }
            onRemove={(i) => setList("expertise", draft.expertise.filter((_, x) => x !== i))}
            onUpdate={(i, patch) =>
              setList(
                "expertise",
                draft.expertise.map((s, x) => (x === i ? { ...s, ...patch } : s)),
              )
            }
            render={(item, patch) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="العنوان">
                  <Input value={item.title} onChange={(e) => patch({ title: e.target.value })} />
                </Field>
                <Field label="الوصف">
                  <Input
                    value={item.description}
                    onChange={(e) => patch({ description: e.target.value })}
                  />
                </Field>
                <Field label="النقاط الفرعية" hint="نقطة في كل سطر" className="sm:col-span-2">
                  <Textarea
                    rows={4}
                    value={item.items.join("\n")}
                    onChange={(e) =>
                      patch({
                        items: e.target.value
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </Field>
              </div>
            )}
          />
        )}

        {/* ------------------------------ المسار المهني ------------------------------ */}
        {tab === "experience" && (
          <ListEditor
            title="المسار المهني"
            hint="الفترة · المسمى · الجهة · الوصف"
            items={draft.experience}
            onAdd={() =>
              setList("experience", [
                ...draft.experience,
                { period: "2024 — الآن", title: "مسمى جديد", org: "الجهة", description: "الوصف" },
              ])
            }
            onRemove={(i) => setList("experience", draft.experience.filter((_, x) => x !== i))}
            onUpdate={(i, patch) =>
              setList(
                "experience",
                draft.experience.map((s, x) => (x === i ? { ...s, ...patch } : s)),
              )
            }
            render={(item, patch) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="الفترة">
                  <Input value={item.period} onChange={(e) => patch({ period: e.target.value })} />
                </Field>
                <Field label="المسمى">
                  <Input value={item.title} onChange={(e) => patch({ title: e.target.value })} />
                </Field>
                <Field label="الجهة">
                  <Input value={item.org} onChange={(e) => patch({ org: e.target.value })} />
                </Field>
                <Field label="الوصف" className="sm:col-span-2">
                  <Textarea
                    rows={3}
                    value={item.description}
                    onChange={(e) => patch({ description: e.target.value })}
                  />
                </Field>
              </div>
            )}
          />
        )}

        {/* ------------------------------ المؤهلات ------------------------------ */}
        {tab === "credentials" && (
          <ListEditor
            title="المؤهلات والاعتمادات"
            hint="العنوان · الجهة · السنة"
            items={draft.credentials}
            onAdd={() =>
              setList("credentials", [
                ...draft.credentials,
                { title: "مؤهل جديد", org: "الجهة", year: "2024" },
              ])
            }
            onRemove={(i) => setList("credentials", draft.credentials.filter((_, x) => x !== i))}
            onUpdate={(i, patch) =>
              setList(
                "credentials",
                draft.credentials.map((s, x) => (x === i ? { ...s, ...patch } : s)),
              )
            }
            render={(item, patch) => (
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="العنوان">
                  <Input value={item.title} onChange={(e) => patch({ title: e.target.value })} />
                </Field>
                <Field label="الجهة">
                  <Input value={item.org} onChange={(e) => patch({ org: e.target.value })} />
                </Field>
                <Field label="السنة">
                  <Input value={item.year} onChange={(e) => patch({ year: e.target.value })} />
                </Field>
              </div>
            )}
          />
        )}

        {/* ------------------------------ نماذج القضايا ------------------------------ */}
        {tab === "cases" && (
          <ListEditor
            title="نماذج من القضايا"
            hint="العنوان · القطاع · النتيجة · الوصف"
            items={draft.caseHighlights}
            onAdd={() =>
              setList("caseHighlights", [
                ...draft.caseHighlights,
                { title: "قضية جديدة", sector: "القطاع", result: "النتيجة", description: "الوصف" },
              ])
            }
            onRemove={(i) => setList("caseHighlights", draft.caseHighlights.filter((_, x) => x !== i))}
            onUpdate={(i, patch) =>
              setList(
                "caseHighlights",
                draft.caseHighlights.map((s, x) => (x === i ? { ...s, ...patch } : s)),
              )
            }
            render={(item, patch) => (
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="العنوان" className="sm:col-span-2">
                  <Input value={item.title} onChange={(e) => patch({ title: e.target.value })} />
                </Field>
                <Field label="القطاع">
                  <Input value={item.sector} onChange={(e) => patch({ sector: e.target.value })} />
                </Field>
                <Field label="النتيجة">
                  <Input value={item.result} onChange={(e) => patch({ result: e.target.value })} />
                </Field>
                <Field label="الوصف" className="sm:col-span-2">
                  <Textarea
                    rows={3}
                    value={item.description}
                    onChange={(e) => patch({ description: e.target.value })}
                  />
                </Field>
              </div>
            )}
          />
        )}

        {/* ------------------------------ الآراء ------------------------------ */}
        {tab === "testimonials" && (
          <ListEditor
            title="آراء العملاء"
            hint="نص الرأي · الاسم · الصفة"
            items={draft.testimonials}
            onAdd={() =>
              setList("testimonials", [
                ...draft.testimonials,
                { quote: "رأي جديد.", name: "الاسم", role: "الصفة" },
              ])
            }
            onRemove={(i) => setList("testimonials", draft.testimonials.filter((_, x) => x !== i))}
            onUpdate={(i, patch) =>
              setList(
                "testimonials",
                draft.testimonials.map((s, x) => (x === i ? { ...s, ...patch } : s)),
              )
            }
            render={(item, patch) => (
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="نص الرأي" className="sm:col-span-3">
                  <Textarea
                    rows={3}
                    value={item.quote}
                    onChange={(e) => patch({ quote: e.target.value })}
                  />
                </Field>
                <Field label="الاسم">
                  <Input value={item.name} onChange={(e) => patch({ name: e.target.value })} />
                </Field>
                <Field label="الصفة" className="sm:col-span-2">
                  <Input value={item.role} onChange={(e) => patch({ role: e.target.value })} />
                </Field>
              </div>
            )}
          />
        )}

        {/* ------------------------------ المقالات ------------------------------ */}
        {tab === "articles" && (
          <ListEditor
            title="المقالات"
            hint="العنوان · المقتطف · الوسم · التاريخ"
            items={draft.articles}
            onAdd={() =>
              setList("articles", [
                ...draft.articles,
                { title: "مقال جديد", excerpt: "مقتطف المقال", tag: "وسم", date: "2026-01-01" },
              ])
            }
            onRemove={(i) => setList("articles", draft.articles.filter((_, x) => x !== i))}
            onUpdate={(i, patch) =>
              setList(
                "articles",
                draft.articles.map((s, x) => (x === i ? { ...s, ...patch } : s)),
              )
            }
            render={(item, patch) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="العنوان" className="sm:col-span-2">
                  <Input value={item.title} onChange={(e) => patch({ title: e.target.value })} />
                </Field>
                <Field label="المقتطف" className="sm:col-span-2">
                  <Textarea
                    rows={3}
                    value={item.excerpt}
                    onChange={(e) => patch({ excerpt: e.target.value })}
                  />
                </Field>
                <Field label="الوسم">
                  <Input value={item.tag} onChange={(e) => patch({ tag: e.target.value })} />
                </Field>
                <Field label="التاريخ">
                  <Input
                    type="date"
                    value={item.date}
                    onChange={(e) => patch({ date: e.target.value })}
                  />
                </Field>
              </div>
            )}
          />
        )}

        {/* ------------------------------ اللغات والعضويات ------------------------------ */}
        {tab === "lists" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="اللغات" subtitle="لغة في كل سطر">
              <Textarea
                rows={8}
                value={draft.languages.join("\n")}
                onChange={(e) =>
                  set({
                    languages: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </SectionCard>
            <SectionCard title="العضويات" subtitle="عضوية في كل سطر">
              <Textarea
                rows={8}
                value={draft.memberships.join("\n")}
                onChange={(e) =>
                  set({
                    memberships: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </SectionCard>
          </div>
        )}
      </PageBody>
    </>
  );
}

/* =============================================================
   محرر قائمة قابل لإعادة الترتيب
   ============================================================= */

function ListEditor<T>({
  title,
  hint,
  items,
  onAdd,
  onRemove,
  onUpdate,
  render,
}: {
  title: string;
  hint: string;
  items: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<T>) => void;
  render: (item: T, patch: (p: Partial<T>) => void) => React.ReactNode;
}) {
  return (
    <SectionCard
      title={title}
      subtitle={hint}
      action={
        <Button size="sm" variant="outline" icon={Plus} onClick={onAdd}>
          إضافة
        </Button>
      }
    >
      {items.length === 0 ? (
        <EmptyState icon={Pencil} title="لا توجد عناصر" description="اضغط «إضافة» لبدء التحرير." />
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-line bg-surface-2/60 p-3.5 transition-colors hover:border-accent/40"
            >
              <div className="mb-3 flex items-center gap-2">
                <GripVertical className="size-4 shrink-0 text-faint" />
                <Badge tone="muted">
                  <span className="num">{i + 1}</span>
                </Badge>
                <IconButton
                  icon={Trash2}
                  label="حذف"
                  size="xs"
                  variant="ghost"
                  className="ms-auto text-danger hover:bg-danger-soft"
                  onClick={() => onRemove(i)}
                />
              </div>
              {render(item, (p) => onUpdate(i, p))}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
