import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Printer,
  Download,
  FileText,
  Receipt,
  Scale,
  Gavel,
  CalendarDays,
  Wallet,
  ShieldCheck,
  ChevronLeft,
  Loader2,
  FileCheck2,
} from "lucide-react";
import { db } from "@/lib/db";
import { useApp } from "@/state/AppProvider";
import { PageHeader, PageBody } from "@/components/layout/AppShell";
import { SectionCard } from "@/components/common/Badges";
import { Button, Field, Select, Input, Badge, Tabs, EmptyState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/overlays";
import { downloadPdf } from "@/lib/pdf";
import { printElement } from "@/lib/print";
import {
  MATTER_STATUS,
  FEE_TYPES,
  AGREEMENT_TYPES,
  AGREEMENT_STATUS,
  formatCurrency,
  formatDate,
  formatDateShort,
} from "@/lib/format";
import { cn } from "@/lib/cn";

/* =============================================================
   مركز الطباعة — قوالب مستندات جاهزة
   زرّان منفصلان دائمًا: تصدير PDF · طباعة مباشرة
   ============================================================= */

type TemplateKey = "account" | "poa" | "memo" | "financial" | "schedule";

interface TemplateDef {
  key: TemplateKey;
  title: string;
  description: string;
  icon: typeof FileText;
  needsMatter: boolean;
}

const TEMPLATES: TemplateDef[] = [
  {
    key: "account",
    title: "كشف حساب",
    description: "بيان مستحقات ومدفوعات لكل قضية",
    icon: Receipt,
    needsMatter: true,
  },
  {
    key: "poa",
    title: "توكيل خاص",
    description: "نموذج توكيل معتمد للتوقيع",
    icon: ShieldCheck,
    needsMatter: false,
  },
  {
    key: "memo",
    title: "مذكرة قانونية",
    description: "مذكرة داخلية أو مذكرة للخصم",
    icon: Gavel,
    needsMatter: true,
  },
  {
    key: "financial",
    title: "تقرير مالي",
    description: "ملخص الإيرادات والتكاليف حسب الفترة",
    icon: Wallet,
    needsMatter: false,
  },
  {
    key: "schedule",
    title: "جدول مواعيد",
    description: "جدول جلسات ومواعيد موحّد",
    icon: CalendarDays,
    needsMatter: false,
  },
];

export default function PrintCenter() {
  const { settings } = useApp();
  const toast = useToast();
  const [template, setTemplate] = useState<TemplateKey>("account");
  const [matterId, setMatterId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState<"pdf" | "print" | null>(null);

  const matters = useLiveQuery(() => db.matters.toArray(), [], []);
  const clients = useLiveQuery(() => db.clients.toArray(), [], []);
  const payments = useLiveQuery(() => db.payments.toArray(), [], []);
  const events = useLiveQuery(() => db.events.toArray(), [], []);
  const agreements = useLiveQuery(() => db.agreements.toArray(), [], []);

  const activeMatters = useMemo(() => (matters ?? []).filter((m) => !m.archived), [matters]);
  const matter = useMemo(
    () => activeMatters.find((m) => m.id === matterId) ?? null,
    [activeMatters, matterId],
  );
  const client = useMemo(
    () => (clients ?? []).find((c) => c.id === clientId) ?? null,
    [clients, clientId],
  );

  const def = TEMPLATES.find((t) => t.key === template)!;

  const ensureReady = (): boolean => {
    if (def.needsMatter && !matter) {
      toast.error("اختر القضية أولًا", "هذا النموذج مرتبط بقضية محددة.");
      return false;
    }
    if (template === "poa" && !clientName.trim() && !client) {
      toast.error("أدخل اسم الموكّل", "التوكيل يحتاج اسم الموكّل.");
      return false;
    }
    if (template === "memo" && !subject.trim()) {
      toast.error("أدخل عنوان المذكرة", "المذكرة تحتاج عنوانًا واضحًا.");
      return false;
    }
    return true;
  };

  const getElement = () => document.getElementById("print-center-area");

  const doPdf = async () => {
    if (!ensureReady()) return;
    const el = getElement();
    if (!el) return;
    setBusy("pdf");
    try {
      await downloadPdf(el, `${def.title}-${matter?.number ?? "عام"}`, {
        orientation: template === "financial" || template === "schedule" ? "landscape" : "portrait",
        header: settings.printHeader || settings.profile.firmName,
        footer: settings.printFooter,
        fitToSinglePage: template === "poa",
      });
      toast.success("تم تصدير الملف بصيغة PDF", "الملف جاهز للفتح والمشاركة.");
    } catch {
      toast.error("تعذّر تصدير الملف");
    } finally {
      setBusy(null);
    }
  };

  const doPrint = () => {
    if (!ensureReady()) return;
    const el = getElement();
    if (!el) return;
    printElement(el, {
      header: settings.printHeader || settings.profile.firmName,
      footer: settings.printFooter,
      title: def.title,
    });
  };

  const matterPayments = matter
    ? (payments ?? []).filter((p) => p.matterId === matter.id).sort((a, b) => a.date.localeCompare(b.date))
    : [];
  const matterAgreements = matter
    ? (agreements ?? []).filter((a) => a.matterId === matter.id)
    : [];
  const totalPaid = matterPayments.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = matterPayments
    .filter((p) => p.kind === "expense" || p.kind === "court_fee")
    .reduce((s, p) => s + p.amount, 0);

  const periodEvents = useMemo(() => {
    const start = from ? new Date(from).getTime() : 0;
    const end = to ? new Date(to).getTime() + 86_400_000 : Infinity;
    return (events ?? [])
      .filter((e) => {
        const t = new Date(e.date).getTime();
        return t >= start && t <= end && !e.archived;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events, from, to]);

  return (
    <>
      <PageHeader
        title="مركز الطباعة"
        subtitle="قوالب مستندات جاهزة — تصدير PDF وطباعة مباشرة بزرّين منفصلين"
        icon={
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-2 to-accent text-accent-ink">
            <Printer className="size-6" />
          </span>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              icon={busy === "pdf" ? Loader2 : Download}
              loading={busy === "pdf"}
              onClick={() => void doPdf()}
            >
              تصدير PDF
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Printer}
              loading={busy === "print"}
              onClick={doPrint}
            >
              طباعة مباشرة
            </Button>
          </>
        }
      />

      <PageBody>
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          {/* ------------------------------ اللوحة الجانبية ------------------------------ */}
          <div className="space-y-4">
            <SectionCard title="القوالب" subtitle="اختر النموذج المراد توليده">
              <div className="space-y-2">
                {TEMPLATES.map((t) => {
                  const Icon = t.icon;
                  const active = t.key === template;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTemplate(t.key)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-3 text-start transition-all duration-200",
                        active
                          ? "border-accent/50 bg-accent-soft"
                          : "border-line bg-surface-2/50 hover:border-accent/30 hover:bg-surface-2",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg",
                          active ? "bg-accent text-accent-ink" : "bg-surface-3 text-muted",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block text-[13px] font-semibold",
                            active ? "text-accent" : "text-ink",
                          )}
                        >
                          {t.title}
                        </span>
                        <span className="block truncate text-[11px] text-muted">{t.description}</span>
                      </span>
                      <ChevronLeft
                        className={cn(
                          "size-4 shrink-0 transition-opacity",
                          active ? "text-accent opacity-100" : "text-faint opacity-0",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="خيارات المستند" subtitle="تُدمج في رأس وتذييل المستند">
              <div className="grid gap-3">
                {def.needsMatter && (
                  <Field label="القضية" required>
                    <Select value={matterId} onChange={(e) => setMatterId(e.target.value)}>
                      <option value="">— اختر القضية —</option>
                      {activeMatters.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.number} — {m.title}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}

                {template === "poa" && (
                  <>
                    <Field label="الموكّل" required>
                      <Select
                        value={clientId}
                        onChange={(e) => {
                          setClientId(e.target.value);
                          const c = (clients ?? []).find((x) => x.id === e.target.value);
                          if (c) setClientName(c.name);
                        }}
                      >
                        <option value="">— اختر الموكّل —</option>
                        {(clients ?? [])
                          .filter((c) => !c.archived)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </Select>
                    </Field>
                    <Field label="اسم الموكّل في التوكيل">
                      <Input
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="الاسم الكامل"
                      />
                    </Field>
                  </>
                )}

                {template === "memo" && (
                  <>
                    <Field label="عنوان المذكرة" required>
                      <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="مثال: مذكرة دفاعية في دعوى الإلغاء"
                      />
                    </Field>
                    <Field label="نص المذكرة">
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={6}
                        placeholder="اكتب خلاصة المذكرة ثم اطبعها للمراجعة…"
                        className="input-base resize-y leading-relaxed"
                      />
                    </Field>
                  </>
                )}

                {(template === "financial" || template === "schedule") && (
                  <>
                    <Field label="من تاريخ">
                      <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </Field>
                    <Field label="إلى تاريخ">
                      <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                    </Field>
                  </>
                )}

                {template === "account" && matter && (
                  <div className="rounded-xl border border-line bg-surface-2 p-3">
                    <div className="text-[11.5px] text-muted">موكّل القضية</div>
                    <div className="text-[13px] font-semibold text-ink">
                      {(clients ?? []).find((c) => c.id === matter?.clientId)?.name ?? "—"}
                    </div>
                    <div className="mt-2 text-[11.5px] text-muted">المحكمة</div>
                    <div className="text-[12.5px] text-ink-soft">{matter.courtName ?? "—"}</div>
                  </div>
                )}
              </div>
            </SectionCard>

            <div className="card p-4">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                <FileCheck2 className="size-4 text-accent" />
                الفرق بين الزرّين
              </div>
              <ul className="mt-2.5 space-y-2 text-[12px] leading-relaxed text-muted">
                <li>
                  <span className="font-semibold text-ink">تصدير PDF</span>: ينشئ ملفًا يُحفظ على
                  الجهاز ولا يستدعي الطابعة.
                </li>
                <li>
                  <span className="font-semibold text-ink">طباعة مباشرة</span>: يرسل المستند فورًا
                  إلى طابعة النظام.
                </li>
              </ul>
            </div>
          </div>

          {/* ------------------------------ المعاينة ------------------------------ */}
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone="accent" icon={def.icon}>
                {def.title}
              </Badge>
              <span className="text-[12px] text-muted">معاينة المستند</span>
              <div className="ms-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  loading={busy === "pdf"}
                  onClick={() => void doPdf()}
                >
                  تصدير PDF
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Printer}
                  loading={busy === "print"}
                  onClick={doPrint}
                >
                  طباعة
                </Button>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="border-b border-line bg-surface-2/60 px-4 py-3">
                <Tabs
                  value={template}
                  onChange={setTemplate}
                  tabs={TEMPLATES.map((t) => ({ value: t.key, label: t.title }))}
                />
              </div>

              <div className="bg-surface p-4 sm:p-6">
                {template === "account" && !matter && (
                  <EmptyState
                    icon={Receipt}
                    title="اختر قضية"
                    description="كشف يُحرَّر لكل قضية على حدة من لوحة الخيارات."
                  />
                )}

                {template === "account" && matter && (
                  <div id="print-center-area" className="space-y-5">
                    <DocHeader
                      title="كشف حساب"
                      subtitle={`${matter.number} — ${matter.title}`}
                      firm={settings.profile.firmName}
                      date={formatDate(new Date().toISOString())}
                    />

                    <InfoGrid
                      items={[
                        ["الموكّل", (clients ?? []).find((c) => c.id === matter.clientId)?.name ?? "—"],
                        ["الخصم", matter.opposingParty ?? "—"],
                        ["المحكمة", matter.courtName ?? "—"],
                        ["رقم القضية", matter.caseNumber ?? "—"],
                        ["الحالة", MATTER_STATUS[matter.status].label],
                        ["نوع الأتعاب", FEE_TYPES[matter.feeType]],
                      ]}
                    />

                    <SimpleTable
                      headers={["التاريخ", "البيان", "النوع", "المبلغ"]}
                      rows={matterPayments.map((p) => [
                        formatDateShort(p.date),
                        p.notes ?? p.receiptNo ?? "—",
                        p.kind === "fee" ? "أتعاب" : p.kind === "installment" ? "دفعة" : p.kind === "expense" ? "مصروف" : p.kind === "court_fee" ? "رسوم" : "أخرى",
                        formatCurrency(p.amount, p.currency),
                      ])}
                      empty="لا توجد حركات مسجلة على هذه القضية"
                    />

                    {matterAgreements.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[12.5px] font-semibold text-ink">الاتفاقيات والأتعاب المتفق عليها</div>
                        <SimpleTable
                          headers={["الاتفاقية", "النوع", "المبلغ", "القسط", "الحالة"]}
                          rows={matterAgreements.map((a) => [
                            a.title,
                            AGREEMENT_TYPES[a.type],
                            formatCurrency(a.amount, a.currency),
                            `${a.installmentCount} × ${formatCurrency(a.installmentAmount, a.currency)}`,
                            AGREEMENT_STATUS[a.status].label,
                          ])}
                          empty=""
                        />
                      </div>
                    )}

                    <Totals
                      rows={[
                        ["إجمالي الأتعاب المتفق عليها", formatCurrency(matter.agreedFee, matter.currency)],
                        ["إجمالي المدفوع", formatCurrency(totalPaid, matter.currency)],
                        ["المصروفات والرسوم", formatCurrency(totalExpenses, matter.currency)],
                        [
                          "الرصيد المستحق",
                          formatCurrency(Math.max(0, matter.agreedFee - totalPaid), matter.currency),
                        ],
                      ]}
                    />

                    <DocFooter notice={settings.confidentialityNotice} />
                  </div>
                )}

                {template === "poa" && (
                  <div id="print-center-area" className="space-y-5">
                    <DocHeader
                      title="توكيل خاص"
                      subtitle="Special Power of Attorney"
                      firm={settings.profile.firmName}
                      date={formatDate(new Date().toISOString())}
                    />

                    <div className="space-y-4 text-[13.5px] leading-[2.1] text-ink-soft">
                      <p>
                        أنا الموكّل:{" "}
                        <span className="font-semibold text-ink">
                          {clientName || client?.name || "........................................"}
                        </span>
                        ، أتعهد وأفوّض بموجب هذا التوكيل المحامي{" "}
                        <span className="font-semibold text-ink">
                          {settings.profile.lawyerName || "........................................"}
                        </span>
                        ، المحامٍ المرخص رقم{" "}
                        <span className="num font-semibold text-ink">
                          {settings.profile.licenseNumber || "........"}
                        </span>
                        ، لتمثيلي في كل ما يتعلق بالقضية المشار إليها أعلاه.
                      </p>
                      <p>
                        ويشمل هذا التوكيل تقديم الطلبات والدفوع والتوكيلات أمام الجهات القضائية
                        والمحاكم والجهات الإدارية، واستلام المستندات والإيصالات والتصرفات، والتوقيع
                        على التسويات والاتفاقيات بما لا يتجاوز الصلاحية الممنوحة.
                      </p>
                      <p>
                        ويحق للموكّل سحب هذا التوكيل بإشعار كتابي، ويبقى التوكيل ساريًا حتى تاريخ
                        إشعار السحب.
                      </p>
                      <div className="rounded-xl border border-line bg-surface-2 p-3.5 text-[12px] leading-relaxed text-muted">
                        إرشادات: يُشترط أن يكون التوكيل محددًا في الغرض، ومحدد المدة، وأن يوقّعه
                        الموكّل أمام شاهد أو أمام كاتب عدل، وأن يحتوي على البيانات التعريفية الكاملة
                        للموكّل. راجع هذا النص مع الموكّل قبل الاعتماد عليه.
                      </div>
                    </div>

                    <SignatureBlock
                      clientName={clientName || client?.name || ""}
                      lawyerName={settings.profile.lawyerName}
                    />

                    <DocFooter notice={settings.confidentialityNotice} />
                  </div>
                )}

                {template === "memo" && (
                  <div id="print-center-area" className="space-y-5">
                    <DocHeader
                      title="مذكرة"
                      subtitle={subject || "مذكرة قانونية"}
                      firm={settings.profile.firmName}
                      date={formatDate(new Date().toISOString())}
                    />

                    {matter && (
                      <InfoGrid
                        items={[
                          ["القضية", `${matter.number} — ${matter.title}`],
                          ["الموكّل", (clients ?? []).find((c) => c.id === matter.clientId)?.name ?? "—"],
                          ["المحكمة", matter.courtName ?? "—"],
                          ["الحالة", MATTER_STATUS[matter.status].label],
                        ]}
                      />
                    )}

                    <div className="whitespace-pre-line rounded-xl border border-line bg-surface-2 p-4 text-[13.5px] leading-[2.1] text-ink-soft">
                      {body || "لم يُكتب نص المذكرة بعد."}
                    </div>

                    <DocFooter notice={settings.confidentialityNotice} />
                  </div>
                )}

                {template === "financial" && (
                  <div id="print-center-area" className="space-y-5">
                    <DocHeader
                      title="التقرير المالي"
                      subtitle={from || to ? `من ${from || "البداية"} إلى ${to || "اليوم"}` : "كل الفترات"}
                      firm={settings.profile.firmName}
                      date={formatDate(new Date().toISOString())}
                    />

                    <FinancialSummary
                      payments={(payments ?? []).filter((p) => {
                        if (from && p.date < from) return false;
                        if (to && p.date > to) return false;
                        return true;
                      })}
                    />

                    <SimpleTable
                      headers={["التاريخ", "القضية", "النوع", "المبلغ"]}
                      rows={(payments ?? [])
                        .filter((p) => {
                          if (from && p.date < from) return false;
                          if (to && p.date > to) return false;
                          return true;
                        })
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((p) => [
                          formatDateShort(p.date),
                          (matters ?? []).find((m) => m.id === p.matterId)?.number ?? "—",
                          p.kind === "fee" ? "أتعاب" : p.kind === "installment" ? "دفعة" : p.kind === "expense" ? "مصروف" : p.kind === "court_fee" ? "رسوم" : "أخرى",
                          formatCurrency(p.amount, p.currency),
                        ])}
                      empty="لا توجد مدفوعات ضمن الفترة المحددة"
                    />

                    <DocFooter notice={settings.confidentialityNotice} />
                  </div>
                )}

                {template === "schedule" && (
                  <div id="print-center-area" className="space-y-5">
                    <DocHeader
                      title="جدول المواعيد والجلسات"
                      subtitle={from || to ? `من ${from || "البداية"} إلى ${to || "اليوم"}` : "كل المواعيد"}
                      firm={settings.profile.firmName}
                      date={formatDate(new Date().toISOString())}
                    />

                    <SimpleTable
                      headers={["التاريخ", "الوقت", "الموضوع", "النوع", "المكان"]}
                      rows={periodEvents.map((e) => [
                        formatDateShort(e.date),
                        e.endTime ?? "—",
                        e.title,
                        e.type === "hearing"
                          ? "جلسة"
                          : e.type === "deadline"
                            ? "ميعاد"
                            : e.type === "meeting"
                              ? "اجتماع"
                              : e.type === "payment"
                                ? "تحصيل"
                                : e.type === "followup"
                                  ? "متابعة"
                                  : "داخلي",
                        e.location ?? "—",
                      ])}
                      empty="لا توجد مواعيد ضمن الفترة المحددة"
                    />

                    <DocFooter notice={settings.confidentialityNotice} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </PageBody>
    </>
  );
}

/* =============================================================
   عناصر المستند
   ============================================================= */

function DocHeader({
  title,
  subtitle,
  firm,
  date,
}: {
  title: string;
  subtitle?: string;
  firm?: string;
  date: string;
}) {
  return (
    <div className="border-b-2 border-accent/50 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Scale className="size-5 text-accent" />
            <span className="text-[14px] font-bold text-ink">{firm ?? "مكتب المحاماة"}</span>
          </div>
          <h2 className="mt-2 text-[20px] font-bold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
        </div>
        <div className="text-end">
          <div className="text-[11.5px] text-muted">التاريخ</div>
          <div className="text-[13px] font-semibold text-ink">{date}</div>
        </div>
      </div>
    </div>
  );
}

function DocFooter({ notice }: { notice?: string }) {
  return (
    <div className="border-t border-line pt-3 text-center">
      {notice && <div className="text-[12px] font-semibold text-danger">{notice}</div>}
      <div className="mt-1 text-[11px] text-muted">
        أُعدّ هذا المستند إلكترونيًا بواسطة نظام «عدالة» لإدارة أعمال المحاماة.
      </div>
    </div>
  );
}

function InfoGrid({ items }: { items: [string, string][] }) {
  return (
    <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-3">
      {items.map(([k, v]) => (
        <div key={k} className="border-b border-line-soft pb-2">
          <div className="text-[11.5px] text-muted">{k}</div>
          <div className="mt-0.5 truncate text-[13px] font-semibold text-ink">{v}</div>
        </div>
      ))}
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: string[][];
  empty: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-[12.5px] text-muted">{empty}</div>
      ) : (
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-line bg-surface-2">
              {headers.map((h) => (
                <th key={h} className="px-3 py-2.5 text-start font-semibold text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-line-soft last:border-0">
                {r.map((c, j) => (
                  <td key={j} className="px-3 py-2.5 text-ink-soft">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Totals({ rows }: { rows: [string, string][] }) {
  return (
    <div className="ms-auto w-full max-w-sm space-y-2 rounded-xl border border-line bg-surface-2 p-4">
      {rows.map(([k, v], i) => (
        <div
          key={k}
          className={cn(
            "flex items-center justify-between gap-4 text-[13px]",
            i === rows.length - 1 && "border-t border-line pt-2.5 font-bold",
          )}
        >
          <span className={i === rows.length - 1 ? "text-ink" : "text-muted"}>{k}</span>
          <span className="num text-ink">{v}</span>
        </div>
      ))}
    </div>
  );
}

function SignatureBlock({ clientName, lawyerName }: { clientName: string; lawyerName: string }) {
  return (
    <div className="grid gap-6 pt-4 sm:grid-cols-2">
      {[
        { role: "الموكّل", name: clientName },
        { role: "المحامي / الوكيل", name: lawyerName },
      ].map((s) => (
        <div key={s.role} className="text-center">
          <div className="h-16 border-b border-dashed border-line" />
          <div className="mt-2 text-[12.5px] font-semibold text-ink">{s.role}</div>
          <div className="text-[11.5px] text-muted">{s.name || "................................"}</div>
        </div>
      ))}
    </div>
  );
}

function FinancialSummary({
  payments,
}: {
  payments: { amount: number; currency: string; kind: string }[];
}) {
  const total = payments.reduce((s, p) => s + p.amount, 0);
  const fees = payments
    .filter((p) => p.kind === "fee" || p.kind === "installment")
    .reduce((s, p) => s + p.amount, 0);
  const expenses = payments
    .filter((p) => p.kind === "expense" || p.kind === "court_fee")
    .reduce((s, p) => s + p.amount, 0);
  const currency = payments[0]?.currency ?? "SAR";

  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "إجمالي الإيرادات", value: fees, icon: Wallet, tone: "ok" },
        { label: "إجمالي المصروفات", value: expenses, icon: Receipt, tone: "warn" },
        { label: "صافي الحركة", value: total, icon: FileText, tone: "accent" },
      ].map((c) => (
        <div key={c.label} className="rounded-xl border border-line bg-surface-2 p-3.5">
          <div className="flex items-center gap-2 text-[11.5px] text-muted">
            <c.icon className="size-3.5" />
            {c.label}
          </div>
          <div className="num mt-1 text-[17px] font-bold text-ink">
            {formatCurrency(c.value, currency)}
          </div>
        </div>
      ))}
    </div>
  );
}
