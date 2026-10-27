import { useEffect, useRef, useState } from "react";
import {
  Settings as SettingsIcon,
  Building2,
  Palette,
  BellRing,
  Archive,
  Printer,
  Database,
  Save,
  Download,
  Upload,
  Trash2,
  HardDrive,
  ShieldCheck,
  RotateCcw,
  Info,
} from "lucide-react";
import { useApp } from "@/state/AppProvider";
import { PageHeader, PageBody } from "@/components/layout/AppShell";
import { SectionCard } from "@/components/common/Badges";
import {
  Button,
  Field,
  Input,
  Select,
  Switch,
  Textarea,
  Tabs,
  Badge,
  Segmented,
} from "@/components/ui/primitives";
import { useToast, ConfirmDialog } from "@/components/ui/overlays";
import { db, exportBackup, importBackup, storageEstimate, wipeLocalData, logActivity } from "@/lib/db";
import { FEE_TYPES, formatBytes } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { FeeType, Settings as SettingsModel, ThemeMode } from "@/lib/types";

type TabKey = "firm" | "appearance" | "reminders" | "archive" | "printing" | "data";

const CURRENCIES = [
  { code: "SAR", label: "ريال سعودي" },
  { code: "AED", label: "درهم إماراتي" },
  { code: "KWD", label: "دينار كويتي" },
  { code: "BHD", label: "دينار بحريني" },
  { code: "QAR", label: "ريال قطري" },
  { code: "OMR", label: "ريال عماني" },
  { code: "JOD", label: "دينار أردني" },
  { code: "EGP", label: "جنيه مصري" },
  { code: "USD", label: "دولار أمريكي" },
  { code: "EUR", label: "يورو" },
];

const FEE_TYPE_KEYS = Object.keys(FEE_TYPES) as FeeType[];

export default function Settings() {
  const { settings, updateSettings, theme, setTheme, notifyPermission, requestNotifyPermission, user } =
    useApp();
  const toast = useToast();

  const [tab, setTab] = useState<TabKey>("firm");
  const [form, setForm] = useState<SettingsModel>(settings);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [includeFiles, setIncludeFiles] = useState(true);
  const [usage, setUsage] = useState({ usage: 0, quota: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(settings);
    setDirty(false);
  }, [settings]);

  useEffect(() => {
    void storageEstimate().then(setUsage);
  }, []);

  const set = <K extends keyof SettingsModel>(key: K, value: SettingsModel[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const setProfile = (key: keyof SettingsModel["profile"], value: string) => {
    setForm((f) => ({ ...f, profile: { ...f.profile, [key]: value } }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ...form,
        profile: { ...form.profile },
      });
      await logActivity({
        userId: user?.id,
        userName: user?.name ?? "—",
        action: "تعديل",
        entity: "إعدادات",
        meta: "تحديث إعدادات النظام",
      });
      setDirty(false);
      toast.success("تم حفظ الإعدادات", "طُبِّقت التغييرات على النظام فورًا.");
    } catch {
      toast.error("تعذّر حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setForm(settings);
    setDirty(false);
    toast.info("تم التراجع عن التغييرات غير المحفوظة");
  };

  /* ------------------------------ النسخ الاحتياطي ------------------------------ */

  const doExport = async () => {
    try {
      const payload = await exportBackup(includeFiles);
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `نسخة-احتياطية-عدالة-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      await logActivity({
        userId: user?.id,
        userName: user?.name ?? "—",
        action: "تصدير",
        entity: "نسخة احتياطية",
        meta: includeFiles ? "مع الملفات المرفقة" : "بدون الملفات",
      });
      toast.success("تم إنشاء النسخة الاحتياطية", "حُفظ الملف على جهازك.");
    } catch {
      toast.error("تعذّر إنشاء النسخة الاحتياطية");
    }
  };

  const doImport = async (file: File) => {
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      await importBackup(payload, "replace");
      await logActivity({
        userId: user?.id,
        userName: user?.name ?? "—",
        action: "استيراد",
        entity: "نسخة احتياطية",
        meta: file.name,
      });
      toast.success("تم استرجاع البيانات", "أُعيدت قاعدة البيانات من النسخة الاحتياطية.");
      setTimeout(() => window.location.reload(), 900);
    } catch {
      toast.error("ملف غير صالح", "تأكد من اختيار ملف نسخة احتياطيةproduced by the system.");
    }
  };

  const doWipe = async () => {
    try {
      await wipeLocalData();
      toast.success("تم محو البيانات المحلية", "سيُعاد تشغيل التطبيق...");
      setTimeout(() => window.location.reload(), 900);
    } catch {
      toast.error("تعذّر محو البيانات");
    }
  };

  const counts = useLiveCounts();

  const usagePct = usage.quota > 0 ? Math.min(100, (usage.usage / usage.quota) * 100) : 0;

  return (
    <>
      <PageHeader
        title="إعدادات النظام"
        subtitle="هوية المكتب · المظهر · التذكيرات · الأرشفة · الطباعة · النسخ الاحتياطي"
        icon={
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-2 to-accent text-accent-ink">
            <SettingsIcon className="size-6" />
          </span>
        }
        actions={
          <>
            {dirty && (
              <Button variant="ghost" size="sm" icon={RotateCcw} onClick={reset}>
                تراجع
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              icon={Save}
              loading={saving}
              disabled={!dirty}
              onClick={() => void save()}
            >
              حفظ التغييرات
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
              { value: "firm", label: "هوية المكتب", icon: Building2 },
              { value: "appearance", label: "المظهر", icon: Palette },
              { value: "reminders", label: "التذكيرات", icon: BellRing },
              { value: "archive", label: "الأرشفة", icon: Archive },
              { value: "printing", label: "الطباعة", icon: Printer },
              { value: "data", label: "البيانات", icon: Database },
            ]}
          />
        </div>

        {/* ------------------------------ هوية المكتب ------------------------------ */}
        {tab === "firm" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="بيانات المكتب" subtitle="تظهر في الترويسة والتذييل وتقارير المكتب">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="اسم المكتب" required className="sm:col-span-2">
                  <Input
                    value={form.profile.firmName}
                    onChange={(e) => setProfile("firmName", e.target.value)}
                    placeholder="مثال: مكتب المنصور للمحاماة"
                  />
                </Field>
                <Field label="الشعار النصي" className="sm:col-span-2">
                  <Input
                    value={form.profile.tagline}
                    onChange={(e) => setProfile("tagline", e.target.value)}
                    placeholder="وصف مختصر يظهر تحت اسم المكتب"
                  />
                </Field>
                <Field label="اسم المحامي المسؤول">
                  <Input
                    value={form.profile.lawyerName}
                    onChange={(e) => setProfile("lawyerName", e.target.value)}
                    placeholder="المحامي خالد بن سعد المنصور"
                  />
                </Field>
                <Field label="رقم الترخيص">
                  <Input
                    value={form.profile.licenseNumber}
                    onChange={(e) => setProfile("licenseNumber", e.target.value)}
                    placeholder="ترخيص رقم ..."
                  />
                </Field>
                <Field label="البريد الإلكتروني">
                  <Input
                    type="email"
                    value={form.profile.email}
                    onChange={(e) => setProfile("email", e.target.value)}
                    placeholder="info@example.sa"
                    dir="ltr"
                  />
                </Field>
                <Field label="الهاتف">
                  <Input
                    value={form.profile.phone}
                    onChange={(e) => setProfile("phone", e.target.value)}
                    placeholder="+966 11 000 0000"
                    dir="ltr"
                  />
                </Field>
                <Field label="الموقع الإلكتروني">
                  <Input
                    value={form.profile.website}
                    onChange={(e) => setProfile("website", e.target.value)}
                    placeholder="example.sa"
                    dir="ltr"
                  />
                </Field>
                <Field label="العنوان" className="sm:col-span-2">
                  <Textarea
                    rows={3}
                    value={form.profile.address}
                    onChange={(e) => setProfile("address", e.target.value)}
                    placeholder="المدينة، الحي، المبنى، الدور"
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="العملة وأتعاب المكتب" subtitle="تُستخدم كقيم افتراضية في القضايا الجديدة">
              <div className="grid gap-4">
                <Field label="العملة الافتراضية" hint="تُطبَّق على القضايا والمدفوعات الجديدة">
                  <Select
                    value={form.currency}
                    onChange={(e) => set("currency", e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="نوع الأتعاب الافتراضي">
                  <Select
                    value={form.defaultFeeType}
                    onChange={(e) => set("defaultFeeType", e.target.value as FeeType)}
                  >
                    {FEE_TYPE_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {FEE_TYPES[k]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="rounded-xl border border-line bg-surface-2 p-3.5">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <ShieldCheck className="size-4 text-accent" />
                    مزامنة مع نظام القواعد
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                    يحتفظ النظام نسخة محلية من كل البيانات في متصفحك. عند التحويل لاحقًا إلى خادم أو
                    تطبيق سطح مكتب، تُنقل هذه الإعدادات نفسها دون تغيير في طريقة العمل.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ------------------------------ المظهر ------------------------------ */}
        {tab === "appearance" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="سمة الألوان" subtitle="تُطبَّق فورًا على جميع الشاشات">
              <div className="space-y-4">
                <Field label="نمط العرض">
                  <Segmented
                    value={theme}
                    onChange={(v) => void setTheme(v as ThemeMode)}
                    options={[
                      { value: "light", label: "نهاري" },
                      { value: "dark", label: "ليلي" },
                      { value: "system", label: "حسب النظام" },
                    ]}
                  />
                </Field>
                <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 p-3.5">
                  <div>
                    <div className="text-[13px] font-semibold text-ink">الوضع الحالي</div>
                    <div className="text-[12px] text-muted">
                      {theme === "system" ? "يتبع تفضيل نظام التشغيل" : theme === "dark" ? "ليلي" : "نهاري"}
                    </div>
                  </div>
                  <Badge tone="accent">
                    {theme === "dark" ? "Midnight Navy" : theme === "light" ? "Paper Gold" : "تلقائي"}
                  </Badge>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="كثافة العرض" subtitle="تباعد الصفوف والبطاقات">
              <div className="space-y-4">
                <Field label="كثافة الجداول">
                  <Segmented
                    value={form.density}
                    onChange={(v) => set("density", v)}
                    options={[
                      { value: "comfortable", label: "مريحة" },
                      { value: "compact", label: "مضغوطة" },
                    ]}
                  />
                </Field>
                <div className="rounded-xl border border-line bg-surface-2 p-3.5">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <Info className="size-4 text-info" />
                    معاينة
                  </div>
                  <div className="mt-2.5 space-y-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "rounded-lg border border-line bg-surface",
                          form.density === "compact" ? "h-6" : "h-8",
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ------------------------------ التذكيرات ------------------------------ */}
        {tab === "reminders" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="جدولة التذكيرات" subtitle="متى يتم تنبيهك قبل المواعيد والمهام">
              <div className="space-y-4">
                <Field
                  label="مدة التذكير المسبق (بالأيام)"
                  hint="عدد الأيام التي يسبق بها النظام تذكير الجلسات والمواعيد النظامية"
                >
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={form.reminderLeadDays}
                    onChange={(e) => set("reminderLeadDays", Math.max(0, Number(e.target.value) || 0))}
                  />
                </Field>
                <Switch
                  checked={form.dailyDigest}
                  onChange={(v) => set("dailyDigest", v)}
                  label="ملخص يومي"
                  description="رسالة واحدة صباحًا تجمع مواعيد اليوم والمهام المستحقة"
                />
                <Switch
                  checked={form.soundEnabled}
                  onChange={(v) => set("soundEnabled", v)}
                  label="تنبيه صوتي"
                  description="تشغيل نغمة قصيرة عند ورود إشعار جديد"
                />
              </div>
            </SectionCard>

            <SectionCard title="إشعارات النظام" subtitle="صلاحية إشعارات المتصفح">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 p-3.5">
                  <div>
                    <div className="text-[13px] font-semibold text-ink">حالة الإذن</div>
                    <div className="text-[12px] text-muted">
                      {notifyPermission === "granted"
                        ? "مسموح — تصلك إشعارات الجلسات"
                        : notifyPermission === "denied"
                          ? "مرفوض — فعّل الإذن من إعدادات المتصفح"
                          : "لم يُطلب بعد"}
                    </div>
                  </div>
                  <Badge
                    tone={
                      notifyPermission === "granted" ? "ok" : notifyPermission === "denied" ? "danger" : "muted"
                    }
                  >
                    {notifyPermission === "granted"
                      ? "مسموح"
                      : notifyPermission === "denied"
                        ? "مرفوض"
                        : "غير محدد"}
                  </Badge>
                </div>
                {notifyPermission !== "granted" && (
                  <Button
                    variant="outline"
                    icon={BellRing}
                    onClick={() => void requestNotifyPermission()}
                    disabled={notifyPermission === "denied"}
                  >
                    طلب إذن الإشعارات
                  </Button>
                )}
                <div className="rounded-xl border border-line bg-surface-2 p-3.5 text-[12px] leading-relaxed text-muted">
                  يعمل مجدول التذكيرات داخل التطبيق كل ستين ثانية، ويعمل حتى مع إغلاق النافذة عند
                  تحويل النظام لاحقًا إلى تطبيق سطح مكتب أو هاتف.
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ------------------------------ الأرشفة ------------------------------ */}
        {tab === "archive" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="سياسة الاحتفاظ" subtitle="متى تُنقل القضايا المغلقة إلى الأرشيف">
              <div className="space-y-4">
                <Field label="مدة الاحتفاظ (بالأشهر)" hint="بعد هذه المدة تصبح القضايا المغلقة مؤرشفة تلقائيًا">
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={form.archiveAfterMonths}
                    onChange={(e) =>
                      set("archiveAfterMonths", Math.max(0, Number(e.target.value) || 0))
                    }
                  />
                </Field>
                <Switch
                  checked={form.autoArchiveClosed}
                  onChange={(v) => set("autoArchiveClosed", v)}
                  label="أرشفة تلقائية للقضايا المغلقة"
                  description="عند إتمام الإغلاق تُنقل القضية إلى الأرشيف مباشرة"
                />
              </div>
            </SectionCard>

            <SectionCard title="حالة الأرشيف" subtitle="ملخص حجم السجلات المؤرشفة">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {counts.map((c) => (
                  <div key={c.label} className="rounded-xl border border-line bg-surface-2 p-3">
                    <div className="text-[11.5px] text-muted">{c.label}</div>
                    <div className="num mt-1 text-[19px] font-bold text-ink">{c.value}</div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-muted">
                السجلات المؤرشفة تبقى قابلة للبحث والاسترجاع، ولا تُحذف نهائيًا إلا بإذن صريح من
                صفحة الأرشيف.
              </p>
            </SectionCard>
          </div>
        )}

        {/* ------------------------------ الطباعة ------------------------------ */}
        {tab === "printing" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="ترويسة وتذييل المستندات" subtitle="تُطبع في أعلى وأسفل كل صفحة">
              <div className="space-y-4">
                <Field label="نص الترويسة">
                  <Input
                    value={form.printHeader}
                    onChange={(e) => set("printHeader", e.target.value)}
                    placeholder="اسم المكتب"
                  />
                </Field>
                <Field label="نص التذييل">
                  <Input
                    value={form.printFooter}
                    onChange={(e) => set("printFooter", e.target.value)}
                    placeholder="جميع الحقوق محفوظة"
                  />
                </Field>
                <Field label="إشعار السرية" hint="يظهر أعلى المستندات السرية">
                  <Input
                    value={form.confidentialityNotice}
                    onChange={(e) => set("confidentialityNotice", e.target.value)}
                    placeholder="سري ومحدود التداول"
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="نماذج الطباعة" subtitle="استخدم مركز الطباعة لتوليد المستندات الجاهزة">
              <div className="space-y-3">
                {[
                  { title: "كشف حساب", desc: "بيان مستحقات ومدفوعات لكل قضية" },
                  { title: "توكيل خاص", desc: "نموذج توكيل معتمد للتوقيع" },
                  { title: "مذكرة قانونية", desc: "مذكرة داخلية أو مذكرة للخصم" },
                  { title: "تقرير مالي", desc: "ملخص الإيرادات والتكاليف" },
                ].map((t) => (
                  <div
                    key={t.title}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 p-3"
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-ink">{t.title}</div>
                      <div className="truncate text-[11.5px] text-muted">{t.desc}</div>
                    </div>
                    <Badge tone="muted">مركز الطباعة</Badge>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}

        {/* ------------------------------ البيانات ------------------------------ */}
        {tab === "data" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="النسخ الاحتياطي" subtitle="احفظ نسخة كاملة من نظامك واستعدها عند الحاجة">
              <div className="space-y-4">
                <Switch
                  checked={includeFiles}
                  onChange={setIncludeFiles}
                  label="تضمين الملفات المرفقة"
                  description="يشمل DOCUMENTS والملفات المخزّنة داخل النظام (قد يزيد حجم النسخة)"
                />
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" icon={Download} onClick={() => void doExport()}>
                    تصدير نسخة احتياطية
                  </Button>
                  <Button variant="outline" icon={Upload} onClick={() => fileInputRef.current?.click()}>
                    استيراد نسخة
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void doImport(f);
                      e.target.value = "";
                    }}
                  />
                </div>
                <div className="rounded-xl border border-line bg-surface-2 p-3.5 text-[12px] leading-relaxed text-muted">
                  يُنشئ ملف النسخة بصيغة JSON واحد يحتوي كل الجداول. الاستيراد يستبدل المحتوى
                  الحالي بالكامل، لذا يُنصح بتصدير نسخة قبل الاستيراد.
                </div>
              </div>
            </SectionCard>

            <SectionCard title="مساحة التخزين" subtitle="حصة المتصفح المتاحة لتخزين البيانات">
              <div className="space-y-4">
                <div className="rounded-xl border border-line bg-surface-2 p-3.5">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-2 text-muted">
                      <HardDrive className="size-4" />
                      المستخدم
                    </span>
                    <span className="num font-semibold text-ink">{formatBytes(usage.usage)}</span>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{ width: `${usagePct}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11.5px] text-muted">
                    <span>الحصة المتاحة</span>
                    <span className="num">{formatBytes(usage.quota)}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-danger/25 bg-danger-soft/50 p-3.5">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-danger">
                    <Trash2 className="size-4" />
                    منطقة الخطر
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
                    محو كل البيانات المحلية يزيل القضايا والموكلين والمستخدمين من هذا المتصفح نهائيًا.
                    لا يمكن التراجع عن هذه الخطوة.
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    className="mt-3"
                    onClick={() => setWipeOpen(true)}
                  >
                    محو جميع البيانات
                  </Button>
                </div>
              </div>
            </SectionCard>
          </div>
        )}
      </PageBody>

      <ConfirmDialog
        open={wipeOpen}
        onClose={() => setWipeOpen(false)}
        onConfirm={() => {
          setWipeOpen(false);
          void doWipe();
        }}
        title="محو جميع البيانات المحلية"
        message="سيُحذف كل شيء مخزّن في هذا المتصفح: القضايا، الموكلون، المهام، الوثائق، المستخدمون، والإعدادات. هل أنت متأكد؟"
        confirmLabel="نعم، امحُ البيانات"
        cancelLabel="إلغاء"
      />

    </>
  );
}

/* ------------------------------ عدّاد السجلات ------------------------------ */

function useLiveCounts() {
  const [counts, setCounts] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      const [matters, clients, docs, tasks] = await Promise.all([
        db.matters.toArray(),
        db.clients.toArray(),
        db.documents.toArray(),
        db.tasks.toArray(),
      ]);
      if (!alive) return;
      setCounts([
        { label: "قضايا مؤرشفة", value: matters.filter((m) => m.archived).length },
        { label: "موكلون مؤرشفون", value: clients.filter((c) => c.archived).length },
        { label: "وثائق مؤرشفة", value: docs.filter((d) => d.archived).length },
        { label: "مهام مؤرشفة", value: tasks.filter((t) => t.archived).length },
        { label: "إجمالي القضايا", value: matters.length },
        { label: "إجمالي الموكلين", value: clients.length },
      ]);
    };
    void run();
    const timer = window.setInterval(run, 5000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  return counts;
}
