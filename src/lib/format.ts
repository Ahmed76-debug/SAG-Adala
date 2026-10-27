import type {
  AgreementStatus,
  AgreementType,
  ClientStatus,
  ClientType,
  DocumentCategory,
  EventStatus,
  EventType,
  FeeType,
  LibraryStatus,
  LibraryType,
  MatterPriority,
  MatterStatus,
  NoteKind,
  PaymentKind,
  PaymentMethod,
  TaskPriority,
  TaskStatus,
} from "./types";

/* =============================================================
   الوسوم والعرض العربي (Labels, Colors, Formatters)
   ============================================================= */

export const MATTER_STATUS: Record<MatterStatus, { label: string; color: string; soft: string }> = {
  open: { label: "مفتوحة", color: "#2563c9", soft: "info" },
  in_review: { label: "قيد المراجعة", color: "#7c3aed", soft: "info" },
  hearing: { label: "مرفوعة للجلسة", color: "#b08419", soft: "warn" },
  suspended: { label: "معلّقة", color: "#64748b", soft: "info" },
  settled: { label: "تمت التسوية", color: "#0e7490", soft: "info" },
  judged: { label: "صدر فيها حكم", color: "#0f8a5f", soft: "ok" },
  closed: { label: "مغلقة", color: "#334155", soft: "info" },
};

export const MATTER_PRIORITY: Record<MatterPriority, { label: string; color: string }> = {
  normal: { label: "عادية", color: "#64748b" },
  high: { label: "متصاعدة", color: "#b3720a" },
  critical: { label: "حرجة", color: "#c02b3a" },
};

export const FEE_TYPES: Record<FeeType, string> = {
  fixed: "أتعاب ثابتة",
  percentage: "نسبة من قيمة الدعوى",
  hourly: "أتعاب بالساعة",
  retainer: "اتفاق توكيل مسبق",
  pro_bono: "قضية على سبيل التطوع",
};

export const CLIENT_TYPES: Record<ClientType, string> = {
  individual: "شخص طبيعي",
  company: "شركة / مؤسسة",
  entity: "جهة حكومية",
  opponent: "الخصم",
};

export const CLIENT_STATUS: Record<ClientStatus, { label: string; color: string }> = {
  active: { label: "نشط", color: "#0f8a5f" },
  dormant: { label: "متوقف", color: "#b3720a" },
  closed: { label: "مغلق", color: "#64748b" },
};

export const TASK_STATUS: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: "قيد الانتظار", color: "#64748b" },
  doing: { label: "قيد التنفيذ", color: "#2563c9" },
  done: { label: "مكتملة", color: "#0f8a5f" },
  cancelled: { label: "ملغاة", color: "#334155" },
};

export const TASK_PRIORITY: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: "منخفضة", color: "#64748b" },
  normal: { label: "عادية", color: "#2563c9" },
  high: { label: "عالية", color: "#b3720a" },
  urgent: { label: "عاجلة", color: "#c02b3a" },
};

export const EVENT_TYPES: Record<EventType, { label: string; color: string; icon: string }> = {
  hearing: { label: "جلسة قضائية", color: "#b08419", icon: "gavel" },
  deadline: { label: "ميعاد نظامي", color: "#c02b3a", icon: "alarm" },
  meeting: { label: "اجتماع", color: "#2563c9", icon: "users" },
  payment: { label: "تحصيل أتعاب", color: "#0f8a5f", icon: "wallet" },
  followup: { label: "متابعة", color: "#7c3aed", icon: "phone" },
  internal: { label: "عمل داخلي", color: "#64748b", icon: "briefcase" },
};

export const EVENT_STATUS: Record<EventStatus, { label: string; color: string }> = {
  scheduled: { label: "مجدول", color: "#2563c9" },
  done: { label: "تم", color: "#0f8a5f" },
  postponed: { label: "مؤجل", color: "#b3720a" },
  cancelled: { label: "ملغي", color: "#c02b3a" },
};

export const DOC_CATEGORIES: Record<DocumentCategory, { label: string; icon: string }> = {
  contract: { label: "عقد", icon: "file-signature" },
  pleading: { label: "مذكرة / لوائح", icon: "gavel" },
  evidence: { label: "دليل", icon: "paperclip" },
  power_of_attorney: { label: "توكيل", icon: "stamp" },
  receipt: { label: "إيصال", icon: "receipt" },
  id: { label: "هوية / مستند رسمي", icon: "id-card" },
  correspondence: { label: "مراسلة", icon: "mail" },
  report: { label: "تقرير", icon: "clipboard-list" },
  memo: { label: "مذكرة داخلية", icon: "notebook-pen" },
  other: { label: "أخرى", icon: "file" },
};

export const AGREEMENT_TYPES: Record<AgreementType, string> = {
  fee: "اتفاقية أتعاب",
  retainer: "توكيل مسبق",
  settlement: "تسوية",
  mediation: "وساطة",
  counsel: "توكيل في قضية",
  nda: "اتفاقية سرية",
};

export const AGREEMENT_STATUS: Record<AgreementStatus, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "#64748b" },
  signed: { label: "موقّعة", color: "#2563c9" },
  executed: { label: "نافذة", color: "#0f8a5f" },
  terminated: { label: "منتهية", color: "#c02b3a" },
};

export const PAYMENT_KINDS: Record<PaymentKind, string> = {
  fee: "أتعاب",
  installment: "دفعة من الأتعاب",
  expense: "مصروف",
  court_fee: "رسوم قضائية",
  other: "أخرى",
};

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  cash: "نقدًا",
  transfer: "تحويل بنكي",
  cheque: "شيك",
  card: "بطاقة",
  online: "دفع إلكتروني",
};

export const LIBRARY_TYPES: Record<LibraryType, { label: string; icon: string }> = {
  book: { label: "كتاب", icon: "book-open" },
  article: { label: "مقال / بحث", icon: "file-text" },
  video: { label: "فيديو", icon: "video" },
  journal: { label: "نشرة قانونية", icon: "newspaper" },
  course: { label: "دورة تدريبية", icon: "graduation-cap" },
  template: { label: "نموذج", icon: "copy" },
  audio: { label: "صوتي", icon: "headphones" },
};

export const LIBRARY_STATUS: Record<LibraryStatus, { label: string; color: string }> = {
  to_read: { label: "في قائمة القراءة", color: "#64748b" },
  reading: { label: "قيد القراءة", color: "#2563c9" },
  finished: { label: "مكتمل", color: "#0f8a5f" },
  reference: { label: "مرجع دائم", color: "#b08419" },
};

export const NOTE_KINDS: Record<NoteKind, { label: string; color: string }> = {
  note: { label: "ملاحظة", color: "#64748b" },
  action: { label: "إجراء", color: "#b08419" },
  update: { label: "تحديث", color: "#2563c9" },
  call: { label: "مكالمة", color: "#7c3aed" },
  meeting: { label: "اجتماع", color: "#0e7490" },
  research: { label: "بحث قانوني", color: "#0f8a5f" },
};

/* ------------------------------ التنسيق ------------------------------ */

const AR = "ar-SA";

export function formatCurrency(amount: number, currency = "SAR"): string {
  try {
    return new Intl.NumberFormat(AR, {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount ?? 0);
  } catch {
    return `${amount?.toLocaleString("en-US")} ${currency}`;
  }
}

export function formatNumber(n: number, digits = 0): string {
  return new Intl.NumberFormat(AR, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(
    n ?? 0,
  );
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(AR, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatDateShort(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(AR, { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export function formatHijri(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return "—";
  }
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(AR, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat(AR, { hour: "2-digit", minute: "2-digit" }).format(d);
}

export function relativeTime(iso?: string): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const diff = then - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(AR, { numeric: "auto" });
  const mins = Math.round(diff / 60000);
  if (abs < 60_000) return rtf.format(mins, "minute");
  const hours = Math.round(diff / 3_600_000);
  if (abs < 86_400_000) return rtf.format(hours, "hour");
  const days = Math.round(diff / 86_400_000);
  if (abs < 2_592_000_000) return rtf.format(days, "day");
  const months = Math.round(diff / 2_592_000_000);
  if (abs < 31_536_000_000) return rtf.format(months, "month");
  return rtf.format(Math.round(diff / 31_536_000_000), "year");
}

export function daysUntil(iso?: string): number {
  if (!iso) return Infinity;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return Infinity;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

export function toDateInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function toDateTimeInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fromDateInput(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function formatBytes(bytes = 0): string {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("");
}

export function truncate(text: string, n = 120): string {
  if (!text) return "";
  return text.length > n ? text.slice(0, n) + "…" : text;
}
