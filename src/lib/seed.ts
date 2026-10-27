import { db, nowISO } from "./db";
import type { PortfolioContent } from "./types";

export const users = [
  {
    id: "usr_admin",
    name: "مدير النظام",
    username: "admin",
    role: "admin",
    email: "admin@adala.local",
    phone: "",
    status: "active",
    password: "admin123",
    permissions: [
      "dashboard.view","clients.view","clients.create","clients.edit","clients.delete",
      "matters.view","matters.create","matters.edit","matters.delete",
      "agreements.view","agreements.create","agreements.edit","agreements.delete",
      "payments.view","payments.create","payments.edit","payments.delete",
      "tasks.view","tasks.create","tasks.edit","tasks.delete",
      "events.view","events.create","events.edit","events.delete",
      "documents.view","documents.create","documents.edit","documents.delete",
      "files.view","files.upload","files.delete",
      "library.view","library.create","library.edit","library.delete",
      "users.view","users.create","users.edit","users.delete",
      "settings.view","settings.edit","reports.view",
      "archive.view","archive.manage","portfolio.edit",
    ],
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
];

export const matterTypes = [
  { id: "mt_civil", name: "مدني", code: "CIV", description: "القضايا المدنية" },
  { id: "mt_crim", name: "جنائي", code: "CR", description: "القضايا الجنائية" },
  { id: "mt_com", name: "تجاري", code: "COM", description: "القضايا التجارية" },
  { id: "mt_labor", name: "عمالي", code: "LAB", description: "القضايا العمالية" },
  { id: "mt_admin", name: "إداري", code: "ADM", description: "القضايا الإدارية" },
];

export const clients: any[] = [];
export const matters: any[] = [];
export const agreements: any[] = [];
export const payments: any[] = [];
export const tasks: any[] = [];
export const events: any[] = [];
export const documents: any[] = [];
export const notes: any[] = [];
export const library: any[] = [];
export const templates: any[] = [];
export const activity: any[] = [];
export const notifications: any[] = [];

export const settings = {
  id: "settings",
  profile: {
    firmName: "مكتب المحاماة",
    tagline: "استشارات قانونية وتمثيل أمام المحاكم",
    lawyerName: "المحامي المسؤول",
    licenseNumber: "",
    email: "",
    phone: "",
    address: "",
    website: "",
  },
  theme: "light",
  locale: "ar",
  printHeader: "مكتب المحاماة",
  printFooter: "جميع الحقوق محفوظة",
  updatedAt: nowISO(),
};

export const portfolio: PortfolioContent = {
  id: "portfolio",
  heroTitle: "المحامي / استشارات وقضايا",
  heroSubtitle: "نقدم الاستشارات القانونية والتمثيل أمام جميع درجات التقاضي بكفاءة واحترافية.",
  heroCta: "احجز استشارة",
  aboutTitle: "نبذة عن المكتب",
  aboutBody: "مكتب متخصص في تقديم الخدمات القانونية المتكاملة.",
  stats: [
    { label: "قضية", value: "500", suffix: "+" },
    { label: "موكل", value: "400", suffix: "+" },
    { label: "سنة خبرة", value: "20", suffix: "+" },
    { label: "نجاح", value: "95", suffix: "%" },
  ],
  services: [
    { title: "القضايا المدنية", description: "التمثيل في الدعاوى المدنية والتعويضات", icon: "scale" },
    { title: "القضايا الجنائية", description: "الدفاع الجنائي والجنح والجنايات", icon: "gavel" },
    { title: "القضايا التجارية", description: "المنازعات التجارية والعقود", icon: "briefcase" },
  ],
  expertise: [
    { title: "المدني والتجاري", description: "منازعات الملكية والعقود", items: ["دعاوى التعويض", "فسخ العقود"] },
    { title: "الجنائي", description: "الدفاع أمام المحاكم الجنائية", items: ["الجنح", "الجنايات"] },
  ],
  experience: [
    { period: "2003 — الآن", title: "مكتب المحاماة", org: "ممارسة مستقلة", description: "تمثيل ومرافعة" },
  ],
  credentials: [
    { title: "عضوية نقابة المحامين", org: "نقابة المحامين", year: "2003" },
  ],
  caseHighlights: [
    { title: "قضية مدنية", sector: "مدني", result: "فوز", description: "الحصول على تعويض" },
  ],
  testimonials: [
    { quote: "خدمة احترافية", name: "موكل", role: "تاجر" },
  ],
  articles: [
    { title: "أهمية صياغة العقود", excerpt: "كيف تحمي صياغة العقد حقوقك", tag: "عقود", date: "2026-01-10" },
  ],
  languages: ["العربية", "الإنجليزية"],
  memberships: ["نقابة المحامين"],
  ctaTitle: "هل لديك قضية قانونية؟",
  ctaBody: "يسعدني التحدث معك حول استشارتك القانونية.",
  updatedAt: nowISO(),
};

export async function ensureSeed() {
  const count = await db.users.count();
  if (count > 0) return;
  await db.transaction(
    "rw",
    [db.users, db.matterTypes, db.settings, db.portfolio],
    async () => {
      await db.users.bulkAdd(users as any);
      await db.matterTypes.bulkAdd(matterTypes as any);
      await db.settings.put(settings as any);
      await db.portfolio.put(portfolio as any);
    },
  );
}
