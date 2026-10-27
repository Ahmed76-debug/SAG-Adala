import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import {
  Award,
  Briefcase,
  Building2,
  GraduationCap,
  Gavel,
  Scale,
  FileSignature,
  Landmark,
  Quote,
  Languages,
  Phone,
  Mail,
  MapPin,
  Globe,
  Sparkles,
  CalendarDays,
  ArrowLeft,
  Printer,
  Download,
  ShieldCheck,
} from "lucide-react";
import { db } from "@/lib/db";
import { useApp } from "@/state/AppProvider";
import { Badge, Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/overlays";
import { downloadPdf } from "@/lib/pdf";
import { printElement } from "@/lib/print";
import { cn } from "@/lib/cn";
import type { PortfolioContent } from "@/lib/types";

/* =============================================================
   البورتفوليو العام — صفحة تعريفية مفتوحة (بدون تسجيل دخول)
   ============================================================= */

const ICONS: Record<string, typeof Gavel> = {
  gavel: Gavel,
  scale: Scale,
  "file-signature": FileSignature,
  "building-2": Building2,
  briefcase: Briefcase,
  "graduation-cap": GraduationCap,
  landmark: Landmark,
};

const Section = ({
  id,
  title,
  subtitle,
  children,
  className,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <section id={id} className={cn("scroll-mt-24", className)}>
    <div className="mb-7 text-center sm:mb-9">
      <h2 className="text-[24px] font-bold text-ink sm:text-[28px]">{title}</h2>
      {subtitle && <p className="mx-auto mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted">{subtitle}</p>}
      <div className="gold-line mx-auto mt-4 h-px w-24" />
    </div>
    {children}
  </section>
);

function LawyerAvatar({ fileId }: { fileId?: string }) {
  const file = useLiveQuery(() => (fileId ? db.files.get(fileId) : undefined), [fileId], undefined);
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!file?.blob) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(file.blob);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file?.blob]);
  if (!src) return null;
  return (
    <div className="hidden shrink-0 md:block">
      <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-soft)] ring-2 ring-bg/70 lg:h-20 lg:w-20">
        <img src={src} alt="صورة المحامي" className="h-full w-full object-cover" />
      </div>
    </div>
  );
}

function LawyerAvatarSide({ fileId }: { fileId?: string }) {
  const file = useLiveQuery(() => (fileId ? db.files.get(fileId) : undefined), [fileId], undefined);
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!file?.blob) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(file.blob);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file?.blob]);
  if (!src) return null;
  return (
    <div className="relative h-28 w-28 overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-soft)] ring-1 ring-line/60 xl:h-32 xl:w-32">
      <img src={src} alt="صورة المحامي" className="h-full w-full object-cover" />
    </div>
  );
}

export default function Portfolio() {
  const { settings } = useApp();
  const toast = useToast();
  const portfolio = useLiveQuery(() => db.portfolio.get("portfolio"), [], undefined);

  if (!portfolio) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-2 to-accent text-accent-ink">
            <Scale className="size-7" />
          </div>
          <p className="mt-4 text-[14px] text-muted">جارٍ تحميل البورتفوليو…</p>
        </div>
      </div>
    );
  }

  const p: PortfolioContent = portfolio;
  const firm = settings?.profile;
  const contact = [firm?.email, firm?.phone, firm?.website].filter(Boolean).join(" · ");
  const avatarFileId = (p as any).avatarFileId as string | undefined;

  const exportPdf = async () => {
    const el = document.getElementById("portfolio-print-area");
    if (!el) return;
    try {
      await downloadPdf(el, `بورتفوليو-${firm?.lawyerName ?? "المحامي"}`, {
        orientation: "portrait",
        header: settings?.printHeader || firm?.firmName,
        footer: settings?.printFooter,
      });
      toast.success("تم تصدير البورتفوليو بصيغة PDF");
    } catch {
      toast.error("تعذّر تصدير الملف");
    }
  };

  const print = () => {
    const el = document.getElementById("portfolio-print-area");
    if (!el) return;
    printElement(el, {
      header: settings?.printHeader || firm?.firmName,
      footer: settings?.printFooter,
      title: p.aboutTitle,
    });
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* ------------------------------ الترويسة ------------------------------ */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <LawyerAvatar fileId={(p as any).avatarFileId} />
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-2 to-accent text-accent-ink md:hidden">
            <Scale className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[15px] font-bold text-ink">
              {firm?.lawyerName || "مكتب المحاماة"}
            </div>
            <div className="truncate text-[11px] text-muted">{firm?.firmName}</div>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {[
              { href: "#about", label: "نبذة" },
              { href: "#services", label: "الخدمات" },
              { href: "#expertise", label: "مجالات الخبرة" },
              { href: "#experience", label: "المسار المهني" },
              { href: "#cases", label: "نماذج القضايا" },
              { href: "#articles", label: "المقالات" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-surface-2 hover:text-accent"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm" icon={Printer} onClick={print}>
                طباعة
              </Button>
            </span>
            <Button variant="gold" size="sm" icon={Download} onClick={() => void exportPdf()}>
              PDF
            </Button>
          </div>
        </div>
      </header>

      {/* ------------------------------ صورة المحامي ثابتة على الجانب ------------------------------ */}
      {avatarFileId && (
        <aside className="pointer-events-none fixed end-6 top-28 z-30 hidden lg:block">
          <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-3xl border border-line bg-surface/90 px-5 py-6 text-center shadow-[var(--shadow-soft)] backdrop-blur-xl">
            <LawyerAvatarSide fileId={avatarFileId} />
            <div className="max-w-[200px]">
              <div className="font-display text-[15px] font-bold text-ink">{firm?.lawyerName || "المحامي"}</div>
              {firm?.firmName && <div className="mt-1 text-[12px] text-muted">{firm.firmName}</div>}
            </div>
          </div>
        </aside>
      )}

      {/* ------------------------------ البطل ------------------------------ */}
      <section className="mesh relative overflow-hidden border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-3xl">
            <Badge tone="accent" icon={Award} className="mb-5">
              استشارات وترافع — منذ 2003
            </Badge>
            <h1 className="text-[30px] font-bold leading-[1.25] text-ink sm:text-[46px]">
              {p.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-[14.5px] leading-[1.9] text-ink-soft sm:text-[16px]">
              {p.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button variant="gold" size="lg" icon={Sparkles}>
                {p.heroCta}
              </Button>
              <Button variant="outline" size="lg" icon={ArrowLeft}>
                تعرّف على المكتب
              </Button>
            </div>
            {contact && (
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-muted">
                {firm?.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-3.5" />
                    <span dir="ltr">{firm.email}</span>
                  </span>
                )}
                {firm?.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-3.5" />
                    <span dir="ltr">{firm.phone}</span>
                  </span>
                )}
                {firm?.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {firm.address}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* الإحصاءات */}
          <div className="mt-14 grid grid-cols-2 gap-3 sm:mt-20 sm:grid-cols-4 sm:gap-4">
            {p.stats.map((s) => (
              <div key={s.label} className="card p-4 text-center sm:p-5">
                <div className="text-[26px] font-bold leading-none text-accent sm:text-[32px]">
                  <span className="num">{s.value}</span>
                  {s.suffix && <span className="text-[15px] text-accent/80">{s.suffix}</span>}
                </div>
                <div className="mt-2 text-[12px] text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ نبذة ------------------------------ */}
      <Section id="about" title={p.aboutTitle} subtitle="المسار المهني والفلسفة في الممارسة">
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="card p-6 lg:col-span-2 sm:p-7">
            <p className="whitespace-pre-line text-[14px] leading-[2.1] text-ink-soft">{p.aboutBody}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {p.languages.map((l) => (
                <Badge key={l} tone="muted" icon={Languages}>
                  {l}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="flex items-center gap-2 text-[14px] font-bold text-ink">
                <ShieldCheck className="size-4 text-accent" />
                المؤهلات والاعتمادات
              </h3>
              <ul className="mt-3.5 space-y-3">
                {p.credentials.map((c) => (
                  <li key={c.title + c.org} className="flex items-start gap-2.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-ink">{c.title}</div>
                      <div className="text-[11.5px] text-muted">
                        {c.org} · <span className="num">{c.year}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-5">
              <h3 className="flex items-center gap-2 text-[14px] font-bold text-ink">
                <Landmark className="size-4 text-accent" />
                العضويات
              </h3>
              <ul className="mt-3.5 space-y-2">
                {p.memberships.map((m) => (
                  <li key={m} className="text-[12.5px] text-ink-soft">
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* ------------------------------ الخدمات ------------------------------ */}
      <Section id="services" title="خدمات المكتب" subtitle="نطاق العمل الذي يقدّمه المكتب" className="py-14 sm:py-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {p.services.map((s) => {
            const Icon = ICONS[s.icon] ?? Scale;
            return (
              <article key={s.title} className="card card-hover group p-5 sm:p-6">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent transition-transform duration-300 group-hover:scale-110">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-[15px] font-bold text-ink">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{s.description}</p>
              </article>
            );
          })}
        </div>
      </Section>

      {/* ------------------------------ مجالات الخبرة ------------------------------ */}
      <Section id="expertise" title="مجالات الخبرة" subtitle="تخصصات يتفوق فيها المكتب" className="py-14 sm:py-20">
        <div className="grid gap-4 lg:grid-cols-3">
          {p.expertise.map((e) => (
            <article key={e.title} className="card flex flex-col p-5 sm:p-6">
              <h3 className="text-[15px] font-bold text-ink">{e.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{e.description}</p>
              <ul className="mt-4 space-y-2 border-t border-line-soft pt-4">
                {e.items.map((i) => (
                  <li key={i} className="flex items-center gap-2 text-[12.5px] text-ink-soft">
                    <span className="size-1.5 rounded-full bg-accent/70" />
                    {i}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Section>

      {/* ------------------------------ المسار المهني ------------------------------ */}
      <Section id="experience" title="المسار المهني" subtitle="محطات التطوير المهني" className="py-14 sm:py-20">
        <div className="relative mx-auto max-w-3xl">
          <div className="absolute inset-y-0 start-[7px] w-px bg-line sm:start-1/2" />
          <div className="space-y-6">
            {p.experience.map((e) => (
              <div key={e.period + e.title} className="relative ps-8 sm:ps-0">
                <span className="absolute start-0 top-2 size-[15px] rounded-full border-[3px] border-bg bg-accent sm:start-1/2 sm:-translate-x-1/2" />
                <div className="sm:ml-[calc(50%+2rem)]">
                  <div className="num text-[11.5px] font-semibold text-accent">{e.period}</div>
                  <h3 className="mt-1 text-[15px] font-bold text-ink">{e.title}</h3>
                  <div className="text-[12.5px] text-muted">{e.org}</div>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{e.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ------------------------------ نماذج القضايا ------------------------------ */}
      <Section
        id="cases"
        title="نماذج من القضايا"
        subtitle="أمثلة مختارة من ملفات أُسندت إلى المكتب"
        className="py-14 sm:py-20"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {p.caseHighlights.map((c) => (
            <article key={c.title} className="card flex flex-col p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <Badge tone="muted">{c.sector}</Badge>
                <Badge tone="ok" icon={Award}>
                  {c.result}
                </Badge>
              </div>
              <h3 className="mt-3.5 text-[15px] font-bold leading-snug text-ink">{c.title}</h3>
              <p className="mt-2.5 text-[13px] leading-relaxed text-muted">{c.description}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* ------------------------------ آراء العملاء ------------------------------ */}
      <Section id="testimonials" title="آراء العملاء" subtitle="ما يقوله من تعاملوا مع المكتب" className="py-14 sm:py-20">
        <div className="grid gap-4 lg:grid-cols-3">
          {p.testimonials.map((t) => (
            <figure key={t.quote.slice(0, 20)} className="card flex flex-col p-5 sm:p-6">
              <Quote className="size-7 text-accent/40" />
              <blockquote className="mt-3 flex-1 text-[13.5px] leading-[2] text-ink-soft">
                {t.quote}
              </blockquote>
              <figcaption className="mt-4 border-t border-line-soft pt-3.5">
                <div className="text-[13px] font-semibold text-ink">{t.name}</div>
                <div className="text-[11.5px] text-muted">{t.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      {/* ------------------------------ المقالات ------------------------------ */}
      <Section id="articles" title="مقالات ومكتوبات" subtitle="نقاش قانوني موجز" className="py-14 sm:py-20">
        <div className="grid gap-4 lg:grid-cols-3">
          {p.articles.map((a) => (
            <article key={a.title} className="card card-hover flex flex-col p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Badge tone="accent">{a.tag}</Badge>
                <span className="flex items-center gap-1 text-[11.5px] text-muted">
                  <CalendarDays className="size-3.5" />
                  {a.date}
                </span>
              </div>
              <h3 className="mt-3.5 text-[15px] font-bold leading-snug text-ink">{a.title}</h3>
              <p className="mt-2.5 text-[13px] leading-relaxed text-muted">{a.excerpt}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* ------------------------------ دعوة للتواصل ------------------------------ */}
      <section className="mesh border-t border-line">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-[26px] font-bold text-ink sm:text-[32px]">{p.ctaTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-[14px] leading-[1.9] text-muted">{p.ctaBody}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button variant="gold" size="lg" icon={Mail}>
              {firm?.email || "تواصل معنا"}
            </Button>
            {firm?.phone && (
              <Button variant="outline" size="lg" icon={Phone}>
                <span dir="ltr">{firm.phone}</span>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------ التذييل ------------------------------ */}
      <footer className="border-t border-line bg-surface/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-8 text-center sm:px-6">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <Scale className="size-4 text-accent" />
            {firm?.firmName}
          </div>
          {firm?.tagline && <p className="text-[12px] text-muted">{firm.tagline}</p>}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-muted">
            {firm?.website && (
              <span className="flex items-center gap-1.5">
                <Globe className="size-3.5" />
                <span dir="ltr">{firm.website}</span>
              </span>
            )}
            {firm?.licenseNumber && <span>{firm.licenseNumber}</span>}
          </div>
          <p className="mt-1 text-[11.5px] text-faint">
            © {new Date().getFullYear()} {firm?.firmName}. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>

      {/* ------------------------------ نسخة الطباعة ------------------------------ */}
      <div id="portfolio-print-area" className="hidden">
        <div style={{ padding: 16, fontFamily: "Tahoma, Arial, sans-serif" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>{p.heroTitle}</h1>
          <p style={{ fontSize: 12, lineHeight: 1.9, margin: "0 0 14px" }}>{p.heroSubtitle}</p>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16, fontSize: 12 }}>
            <tbody>
              {p.stats.map((s) => (
                <tr key={s.label}>
                  <td style={{ border: "1px solid #ccc", padding: 6, fontWeight: 700 }}>
                    {s.value} {s.suffix}
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{s.label}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>{p.aboutTitle}</h2>
          <p style={{ fontSize: 12, lineHeight: 2, margin: "0 0 14px", textAlign: "justify" }}>
            {p.aboutBody}
          </p>

          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>الخدمات</h2>
          <ul style={{ fontSize: 12, lineHeight: 2, margin: "0 0 14px", paddingInlineStart: 18 }}>
            {p.services.map((s) => (
              <li key={s.title}>
                <strong>{s.title}</strong> — {s.description}
              </li>
            ))}
          </ul>

          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>المسار المهني</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, fontSize: 12 }}>
            <thead>
              <tr>
                {["الفترة", "المسمى", "الجهة", "الوصف"].map((h) => (
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
              {p.experience.map((e) => (
                <tr key={e.period + e.title}>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{e.period}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{e.title}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{e.org}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{e.description}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>نماذج من القضايا</h2>
          <ul style={{ fontSize: 12, lineHeight: 2, margin: "0 0 14px", paddingInlineStart: 18 }}>
            {p.caseHighlights.map((c) => (
              <li key={c.title}>
                <strong>{c.title}</strong> ({c.sector}) — {c.result}: {c.description}
              </li>
            ))}
          </ul>

          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>المؤهلات</h2>
          <ul style={{ fontSize: 12, lineHeight: 2, margin: "0 0 14px", paddingInlineStart: 18 }}>
            {p.credentials.map((c) => (
              <li key={c.title + c.org}>
                {c.title} — {c.org} ({c.year})
              </li>
            ))}
          </ul>

          <p style={{ fontSize: 12, margin: "16px 0 0" }}>
            {firm?.email} · {firm?.phone} · {firm?.address}
          </p>
        </div>
      </div>
    </div>
  );
}
