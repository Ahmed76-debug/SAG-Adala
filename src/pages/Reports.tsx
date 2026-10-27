import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  BarChart3,
  Download,
  Printer,
  TrendingUp,
  Wallet,
  Scale,
  Trophy,
  Users,
  Target,
  Percent,
  FileText,
} from "lucide-react";
import { db } from "@/lib/db";
import { useApp } from "@/state/AppProvider";
import { PageHeader, PageBody } from "@/components/layout/AppShell";
import {
  Button,
  StatCard,
  Segmented,
  Select,
  Badge,
  EmptyState,
  Progress,
} from "@/components/ui/primitives";
import { SectionCard } from "@/components/common/Badges";
import { AreaChart, BarChart, DonutChart, HBarList, type Slice } from "@/components/charts/Charts";
import {
  MATTER_STATUS,
  FEE_TYPES,
  formatCurrency,
  formatDateShort,
  formatNumber,
} from "@/lib/format";
import { downloadCsv, downloadPdf } from "@/lib/pdf";
import { printElement } from "@/lib/print";
import { useToast } from "@/components/ui/overlays";
import type { Matter } from "@/lib/types";

/* =============================================================
   التقارير والتحليلات — أداء المكتب، الإيرادات، القضايا، الفريق
   ============================================================= */

const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

type RangeKey = "6" | "12" | "all";

const monthKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  return `${AR_MONTHS[Number(m) - 1] ?? ""} ${String(y).slice(2)}`;
};

export default function Reports() {
  const { can, settings } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState<"overview" | "revenue" | "matters" | "team">("overview");
  const [range, setRange] = useState<RangeKey>("12");

  const matters = useLiveQuery(() => db.matters.toArray(), [], []);
  const payments = useLiveQuery(() => db.payments.toArray(), [], []);
  const users = useLiveQuery(() => db.users.toArray(), [], []);
  const types = useLiveQuery(() => db.matterTypes.toArray(), [], []);

  const rangeMonths = range === "all" ? 60 : Number(range);
  const cutoff = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - rangeMonths);
    return d.getTime();
  }, [rangeMonths]);

  const inRange = useMemo(
    () => (payments ?? []).filter((p) => new Date(p.date).getTime() >= cutoff),
    [payments, cutoff],
  );

  /* ------------------------------ الإيرادات ------------------------------ */

  const revenueByMonth = useMemo(() => {
    const map = new Map<string, { fees: number; expenses: number; feesOnly: number }>();
    const start = new Date();
    start.setMonth(start.getMonth() - (rangeMonths - 1));
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < rangeMonths; i++) {
      const d = new Date(start);
      d.setMonth(start.getMonth() + i);
      map.set(monthKey(d.toISOString()), { fees: 0, expenses: 0, feesOnly: 0 });
    }
    for (const p of inRange) {
      const k = monthKey(p.date);
      const cur = map.get(k);
      if (!cur) continue;
      if (p.kind === "expense" || p.kind === "court_fee") cur.expenses += p.amount;
      else {
        cur.fees += p.amount;
        cur.feesOnly += p.amount;
      }
    }
    return [...map.entries()].map(([k, v]) => ({ label: monthLabel(k), ...v }));
  }, [inRange, rangeMonths]);

  const totalFees = revenueByMonth.reduce((s, r) => s + r.fees, 0);
  const totalExpenses = revenueByMonth.reduce((s, r) => s + r.expenses, 0);
  const netFees = totalFees - totalExpenses;
  const avgTicket = inRange.length ? totalFees / inRange.length : 0;

  const feesByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of matters ?? []) {
      if (m.archived) continue;
      map.set(m.feeType, (map.get(m.feeType) ?? 0) + m.agreedFee);
    }
    const colors = ["#b08419", "#2563c9", "#0f8a5f", "#7c3aed", "#0e7490"];
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v], i) => ({
        label: FEE_TYPES[k as keyof typeof FEE_TYPES] ?? k,
        value: v,
        color: colors[i % colors.length],
      })) as Slice[];
  }, [matters]);

  /* ------------------------------ القضايا ------------------------------ */

  const activeMatters = (matters ?? []).filter((m) => !m.archived);
  const closedMatters = activeMatters.filter((m) => m.status === "closed" || m.status === "judged");

  const mattersByType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of activeMatters) counts.set(m.typeId, (counts.get(m.typeId) ?? 0) + 1);
    const typeById = new Map((types ?? []).map((t) => [t.id, t]));
    // الأنواع غير المعروفة تُجمع في شريحة واحدة "أخرى" حتى لا تتكرر المفاتيح
    const merged = new Map<string, { id: string; label: string; value: number; color: string }>();
    for (const [typeId, value] of counts) {
      const t = typeById.get(typeId);
      const label = t?.name ?? "أخرى";
      const id = t?.id ?? "__other__";
      const color = t?.color ?? "#64748b";
      const prev = merged.get(id);
      if (prev) prev.value += value;
      else merged.set(id, { id, label, value, color });
    }
    return [...merged.values()].sort((a, b) => b.value - a.value) as Slice[];
  }, [activeMatters, types]);

  const mattersByStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of activeMatters) map.set(m.status, (map.get(m.status) ?? 0) + 1);
    const order: Matter["status"][] = [
      "open",
      "in_review",
      "hearing",
      "suspended",
      "settled",
      "judged",
      "closed",
    ];
    return order
      .filter((s) => map.get(s))
      .map((s) => ({
        label: MATTER_STATUS[s].label,
        value: map.get(s) ?? 0,
        color: MATTER_STATUS[s].color,
      })) as Slice[];
  }, [activeMatters]);

  const winRate = useMemo(() => {
    const rated = closedMatters.filter((m) => typeof m.winRate === "number");
    if (!rated.length) return 0;
    return Math.round(rated.reduce((s, m) => s + (m.winRate ?? 0), 0) / rated.length);
  }, [closedMatters]);

  const avgProgress = useMemo(() => {
    if (!activeMatters.length) return 0;
    return Math.round(activeMatters.reduce((s, m) => s + m.progress, 0) / activeMatters.length);
  }, [activeMatters]);

  const pipelineValue = activeMatters
    .filter((m) => !["closed", "judged", "settled"].includes(m.status))
    .reduce((s, m) => s + m.agreedFee, 0);

  /* ------------------------------ الفريق ------------------------------ */

  const team = useMemo(
    () =>
      (users ?? [])
        .map((u) => {
          const mine = activeMatters.filter((m) => (m.lawyerIds ?? []).includes(u.id));
          const closed = mine.filter((m) => m.status === "closed" || m.status === "judged");
          const rated = closed.filter((m) => typeof m.winRate === "number");
          return {
            id: u.id,
            name: u.name,
            title: u.title,
            color: u.avatarColor,
            open: mine.filter((m) => !["closed", "judged", "settled"].includes(m.status)).length,
            total: mine.length,
            closed: closed.length,
            value: mine.reduce((s, m) => s + m.agreedFee, 0),
            win: rated.length ? Math.round(rated.reduce((s, m) => s + (m.winRate ?? 0), 0) / rated.length) : null,
            progress: mine.length
              ? Math.round(mine.reduce((s, m) => s + m.progress, 0) / mine.length)
              : 0,
          };
        })
        .filter((t) => t.total > 0)
        .sort((a, b) => b.value - a.value),
    [users, activeMatters],
  );

  /* ------------------------------ التصدير ------------------------------ */

  const exportCsv = () => {
    downloadCsv(
      `تقرير-المكتب-${new Date().toISOString().slice(0, 10)}`,
      ["الفترة", "إجمالي الأتعاب", "المصاريف", "الصافي"],
      revenueByMonth.map((r) => [r.label, r.fees, r.expenses, r.fees - r.expenses]),
    );
    toast.success("تم تصدير التقرير الشهري");
  };

  const exportPdf = async () => {
    const el = document.getElementById("reports-print-area");
    if (!el) return;
    await downloadPdf(el, `تقرير-المكتب-${new Date().toISOString().slice(0, 10)}`, {
      header: settings.printHeader,
      footer: settings.printFooter,
      orientation: "portrait",
    });
    toast.success("تم تصدير التقرير بصيغة PDF");
  };

  const printReport = () => {
    const el = document.getElementById("reports-print-area");
    if (!el) return;
    printElement(el, {
      header: settings.printHeader,
      footer: settings.printFooter,
      title: "تقرير أداء المكتب",
    });
  };

  const noData = activeMatters.length === 0;

  return (
    <>
      <PageHeader
        title="التقارير والتحليلات"
        subtitle="مؤشرات أداء المكتب: الإيرادات، توزيع القضايا، معدل الكسب، وأداء الفريق"
        icon={
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-2 to-accent text-accent-ink">
            <BarChart3 className="size-6" />
          </span>
        }
        actions={
          <>
            <Select value={range} onChange={(e) => setRange(e.target.value as RangeKey)} className="w-auto">
              <option value="6">آخر 6 أشهر</option>
              <option value="12">آخر 12 شهرًا</option>
              <option value="all">كل الفترة</option>
            </Select>
            {can("reports.export") && (
              <>
                <Button variant="outline" size="sm" icon={Download} onClick={exportCsv}>
                  CSV
                </Button>
                <Button variant="outline" size="sm" icon={FileText} onClick={exportPdf}>
                  تصدير PDF
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" icon={Printer} onClick={printReport}>
              طباعة
            </Button>
          </>
        }
      />

      <PageBody className="space-y-5">
        {/* شريط التبويب */}
        <div className="card p-1">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "overview", label: "نظرة عامة", icon: TrendingUp },
              { value: "revenue", label: "الإيرادات", icon: Wallet },
              { value: "matters", label: "القضايا", icon: Scale },
              { value: "team", label: "أداء الفريق", icon: Users },
            ]}
            className="w-full justify-start overflow-x-auto"
          />
        </div>

        {noData ? (
          <div className="card">
            <EmptyState
              icon={BarChart3}
              title="لا توجد بيانات كافية"
              description="أضف القضايا والمدفوعات لتظهر التحليلات والتقارير."
            />
          </div>
        ) : (
          <>
            {/* ------------------------- نظرة عامة ------------------------- */}
            {tab === "overview" && (
              <div className="space-y-5">
                <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="إجمالي الأتعاب المحصّلة"
                    value={formatCurrency(totalFees, settings.currency)}
                    icon={Wallet}
                    tone="accent"
                    hint={`${inRange.length} دفعة مسجّلة`}
                  />
                  <StatCard
                    label="صافي القيمة بعد المصاريف"
                    value={formatCurrency(netFees, settings.currency)}
                    icon={TrendingUp}
                    tone="ok"
                    hint={`المصاريف: ${formatCurrency(totalExpenses, settings.currency)}`}
                  />
                  <StatCard
                    label="معدل كسب القضايا"
                    value={`${winRate}%`}
                    icon={Trophy}
                    tone={winRate >= 70 ? "ok" : "warn"}
                    hint={`${closedMatters.length} قضية منتهية`}
                  />
                  <StatCard
                    label="قيمة خط القضايا الجارية"
                    value={formatCurrency(pipelineValue, settings.currency)}
                    icon={Target}
                    tone="info"
                    hint={`${activeMatters.length} ملف نشط`}
                  />
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                  <SectionCard
                    title="منحنى التحصيلات"
                    subtitle="الأتعاب المحصّلة شهريًا مقابل المصاريف"
                    className="lg:col-span-2"
                    bodyClassName="p-5"
                  >
                    <AreaChart
                      data={revenueByMonth.map((r) => ({ label: r.label, value: r.fees }))}
                      height={210}
                    />
                    <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line-soft pt-3 text-[12px] text-muted">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full bg-accent" /> الأتعاب المحصّلة
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full bg-danger" /> المصاريف والرسوم
                      </span>
                      <span className="ms-auto">
                        متوسط الدفعة:{" "}
                        <span className="num font-semibold text-ink">
                          {formatCurrency(avgTicket, settings.currency)}
                        </span>
                      </span>
                    </div>
                  </SectionCard>

                  <SectionCard title="توزيع القضايا حسب النوع" bodyClassName="p-5">
                    <DonutChart data={mattersByType} centerLabel="ملف" />
                  </SectionCard>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <SectionCard title="حالة القضايا" bodyClassName="p-5">
                    <HBarList
                      data={mattersByStatus}
                      valueFormatter={(v) => `${v} قضية`}
                    />
                  </SectionCard>
                  <SectionCard title="الأتعاب حسب نوع الاتفاق" bodyClassName="p-5">
                    <HBarList
                      data={feesByType}
                      valueFormatter={(v) => formatCurrency(v, settings.currency)}
                    />
                  </SectionCard>
                </div>
              </div>
            )}

            {/* ------------------------- الإيرادات ------------------------- */}
            {tab === "revenue" && (
              <div className="space-y-5">
                <div className="grid gap-3.5 sm:grid-cols-3">
                  <StatCard label="إجمالي الأتعاب" value={formatCurrency(totalFees, settings.currency)} icon={Wallet} tone="accent" />
                  <StatCard label="المصاريف والرسوم" value={formatCurrency(totalExpenses, settings.currency)} icon={Percent} tone="warn" />
                  <StatCard label="صافي المحصّل" value={formatCurrency(netFees, settings.currency)} icon={TrendingUp} tone="ok" />
                </div>

                <SectionCard title="المقارنة الشهرية" subtitle="الأتعاب مقابل المصاريف" bodyClassName="p-5">
                  <BarChart
                    data={revenueByMonth.map((r) => ({ label: r.label, value: r.fees }))}
                    height={220}
                    valueFormatter={(v) => formatCurrency(v, settings.currency)}
                  />
                </SectionCard>

                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
                    <h3 className="text-[14.5px] font-bold text-ink">كشف التحصيل الشهري</h3>
                    <Badge tone="muted">{revenueByMonth.length} شهرًا</Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-line bg-surface-2/60 text-start text-muted">
                          <th className="px-4 py-3 text-start font-semibold">الشهر</th>
                          <th className="px-4 py-3 text-end font-semibold">الأتعاب</th>
                          <th className="px-4 py-3 text-end font-semibold">المصاريف</th>
                          <th className="px-4 py-3 text-end font-semibold">الصافي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...revenueByMonth].reverse().map((r) => (
                          <tr key={r.label} className="border-b border-line-soft last:border-0">
                            <td className="px-4 py-2.5 text-ink-soft">{r.label}</td>
                            <td className="num px-4 py-2.5 text-end font-semibold text-ok">
                              {formatCurrency(r.fees, settings.currency)}
                            </td>
                            <td className="num px-4 py-2.5 text-end text-danger">
                              {formatCurrency(r.expenses, settings.currency)}
                            </td>
                            <td className="num px-4 py-2.5 text-end font-semibold text-ink">
                              {formatCurrency(r.fees - r.expenses, settings.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------- القضايا ------------------------- */}
            {tab === "matters" && (
              <div className="space-y-5">
                <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard label="إجمالي القضايا" value={formatNumber(activeMatters.length)} icon={Scale} tone="accent" />
                  <StatCard label="قضايا منتهية" value={formatNumber(closedMatters.length)} icon={Trophy} tone="ok" />
                  <StatCard label="متوسط نسبة الإنجاز" value={`${avgProgress}%`} icon={Target} tone="info" />
                  <StatCard label="معدل الكسب" value={`${winRate}%`} icon={Percent} tone={winRate >= 70 ? "ok" : "warn"} />
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <SectionCard title="القضايا حسب النوع" bodyClassName="p-5">
                    <DonutChart data={mattersByType} centerLabel="ملف" />
                  </SectionCard>
                  <SectionCard title="حالة القضايا" bodyClassName="p-5">
                    <BarChart
                      data={mattersByStatus.map((s) => ({ label: s.label, value: s.value, color: s.color }))}
                      height={200}
                      valueFormatter={(v) => `${v} قضية`}
                    />
                  </SectionCard>
                </div>

                <SectionCard title="أعلى القضايا قيمة" subtitle="أكبر الأتعاب المتفق عليها" bodyClassName="p-0">
                  <div className="divide-y divide-line-soft">
                    {[...activeMatters]
                      .sort((a, b) => b.agreedFee - a.agreedFee)
                      .slice(0, 8)
                      .map((m) => (
                        <div key={m.id} className="flex items-center gap-4 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-semibold text-ink">{m.title}</div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
                              <span className="num">{m.number}</span>
                              <span>·</span>
                              <span>{MATTER_STATUS[m.status].label}</span>
                              <span>·</span>
                              <span>فُتحت {formatDateShort(m.openedAt)}</span>
                            </div>
                          </div>
                          <div className="hidden w-28 sm:block">
                            <Progress value={m.progress} tone={m.progress >= 80 ? "ok" : "accent"} size="sm" />
                          </div>
                          <span className="num w-28 shrink-0 text-end text-[13px] font-bold text-ink">
                            {formatCurrency(m.agreedFee, m.currency)}
                          </span>
                        </div>
                      ))}
                  </div>
                </SectionCard>
              </div>
            )}

            {/* ------------------------- الفريق ------------------------- */}
            {tab === "team" && (
              <div className="space-y-5">
                {team.length === 0 ? (
                  <div className="card">
                    <EmptyState icon={Users} title="لا توجد ملفات مُسندة" description="أسند القضايا إلى أعضاء الفريق لعرض أدائهم هنا." />
                  </div>
                ) : (
                  <>
                    <SectionCard title="أداء المحامين" subtitle="مؤشرات الملفات والقيمة والنسب" bodyClassName="p-5">
                      <HBarList
                        data={team.map((t) => ({
                          label: t.name,
                          value: t.total,
                          color: t.color,
                        }))}
                        valueFormatter={(v) => `${v} ملف`}
                      />
                    </SectionCard>

                    <div className="card overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-[13px]">
                          <thead>
                            <tr className="border-b border-line bg-surface-2/60 text-muted">
                              <th className="px-4 py-3 text-start font-semibold">المحامي</th>
                              <th className="px-4 py-3 text-end font-semibold">ملفات جارية</th>
                              <th className="px-4 py-3 text-end font-semibold">إجمالي الملفات</th>
                              <th className="px-4 py-3 text-end font-semibold">منتهية</th>
                              <th className="px-4 py-3 text-end font-semibold">معدل الكسب</th>
                              <th className="px-4 py-3 text-end font-semibold">قيمة الأتعاب</th>
                            </tr>
                          </thead>
                          <tbody>
                            {team.map((t) => (
                              <tr key={t.id} className="border-b border-line-soft last:border-0">
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-ink">{t.name}</div>
                                  <div className="text-[11.5px] text-muted">{t.title}</div>
                                </td>
                                <td className="num px-4 py-3 text-end">{t.open}</td>
                                <td className="num px-4 py-3 text-end">{t.total}</td>
                                <td className="num px-4 py-3 text-end">{t.closed}</td>
                                <td className="num px-4 py-3 text-end font-semibold">
                                  {t.win === null ? "—" : `${t.win}%`}
                                </td>
                                <td className="num px-4 py-3 text-end font-semibold text-ink">
                                  {formatCurrency(t.value, settings.currency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* نسخة الطباعة / التصدير */}
        <div id="reports-print-area" className="hidden">
          <div style={{ fontFamily: "Tahoma, sans-serif", direction: "rtl", padding: 8 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>تقرير أداء المكتب</h1>
            <p style={{ fontSize: 12, color: "#555", margin: "0 0 14px" }}>
              Generated on {formatDateShort(new Date().toISOString())}
            </p>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 16 }}>
              <tbody>
                <tr>
                  <td style={{ border: "1px solid #bbb", padding: 6, background: "#f3f4f7" }}>إجمالي الأتعاب</td>
                  <td style={{ border: "1px solid #bbb", padding: 6 }}>
                    {formatCurrency(totalFees, settings.currency)}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #bbb", padding: 6, background: "#f3f4f7" }}>المصاريف والرسوم</td>
                  <td style={{ border: "1px solid #bbb", padding: 6 }}>
                    {formatCurrency(totalExpenses, settings.currency)}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #bbb", padding: 6, background: "#f3f4f7" }}>صافي المحصّل</td>
                  <td style={{ border: "1px solid #bbb", padding: 6, fontWeight: 700 }}>
                    {formatCurrency(netFees, settings.currency)}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #bbb", padding: 6, background: "#f3f4f7" }}>عدد القضايا</td>
                  <td style={{ border: "1px solid #bbb", padding: 6 }}>{activeMatters.length}</td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #bbb", padding: 6, background: "#f3f4f7" }}>معدل الكسب</td>
                  <td style={{ border: "1px solid #bbb", padding: 6 }}>{winRate}%</td>
                </tr>
              </tbody>
            </table>

            <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>التحصيل الشهري</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  {["الشهر", "الأتعاب", "المصاريف", "الصافي"].map((h) => (
                    <th
                      key={h}
                      style={{ border: "1px solid #999", padding: 5, textAlign: "right", background: "#f0f0f0" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {revenueByMonth.map((r) => (
                  <tr key={r.label}>
                    <td style={{ border: "1px solid #ccc", padding: 5 }}>{r.label}</td>
                    <td style={{ border: "1px solid #ccc", padding: 5 }}>
                      {formatCurrency(r.fees, settings.currency)}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: 5 }}>
                      {formatCurrency(r.expenses, settings.currency)}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: 5 }}>
                      {formatCurrency(r.fees - r.expenses, settings.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PageBody>
    </>
  );
}
