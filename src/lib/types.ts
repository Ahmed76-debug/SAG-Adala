/* =============================================================
   عدالة — نماذج البيانات (Domain Model)
   مصممة لتغذية واجهة CRUD + نظام صلاحيات + أرشيف + مكتبة
   ============================================================= */

export type ID = string;
export type ISODate = string;

/* ------------------------------ المستخدمون ------------------------------ */

export type Role =
  | "admin"
  | "partner"
  | "senior"
  | "associate"
  | "paralegal"
  | "consultant"
  | "client";

export interface User {
  id: ID;
  name: string;
  username: string;
  email: string;
  phone?: string;
  role: Role;
  title: string;
  bio?: string;
  avatarColor: string;
  passwordHash: string;
  salt: string;
  isActive: boolean;
  permOverrides?: Partial<Record<Permission, boolean>>;
  createdAt: ISODate;
  lastLoginAt?: ISODate;
  notificationsEnabled?: boolean;
}

/* ------------------------------ الصلاحيات ------------------------------ */

export type Permission =
  | "dashboard.view"
  | "clients.view"
  | "clients.create"
  | "clients.edit"
  | "clients.delete"
  | "clients.archive"
  | "matters.view"
  | "matters.create"
  | "matters.edit"
  | "matters.delete"
  | "matters.archive"
  | "tasks.view"
  | "tasks.create"
  | "tasks.edit"
  | "tasks.delete"
  | "events.view"
  | "events.create"
  | "events.edit"
  | "events.delete"
  | "documents.view"
  | "documents.create"
  | "documents.edit"
  | "documents.delete"
  | "documents.export"
  | "documents.print"
  | "agreements.view"
  | "agreements.create"
  | "agreements.edit"
  | "agreements.delete"
  | "payments.view"
  | "payments.create"
  | "payments.edit"
  | "payments.delete"
  | "library.view"
  | "library.create"
  | "library.edit"
  | "library.delete"
  | "reports.view"
  | "reports.export"
  | "archive.view"
  | "archive.restore"
  | "archive.purge"
  | "users.view"
  | "users.create"
  | "users.edit"
  | "users.delete"
  | "portfolio.edit"
  | "settings.edit"
  | "activity.view";

/* ------------------------------ الموكلون ------------------------------ */

export type ClientType = "individual" | "company" | "entity" | "opponent";
export type ClientStatus = "active" | "dormant" | "closed";

export interface Client {
  id: ID;
  name: string;
  legalName?: string;
  type: ClientType;
  nationalId?: string;
  commercialId?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  profession?: string;
  notes?: string;
  tags: string[];
  priority: "normal" | "high" | "vip";
  assignedTo?: ID;
  status: ClientStatus;
  createdAt: ISODate;
  updatedAt: ISODate;
  archived: boolean;
  archivedAt?: ISODate;
  source?: string;
}

/* ------------------------------ أنواع القضايا ------------------------------ */

export interface MatterType {
  id: ID;
  name: string;
  color: string;
  icon: string;
  description?: string;
  defaultDurationDays?: number;
  defaultFee?: number;
}

/* ------------------------------ القضايا ------------------------------ */

export type MatterStatus =
  | "open"
  | "in_review"
  | "hearing"
  | "suspended"
  | "settled"
  | "judged"
  | "closed";
export type MatterPriority = "normal" | "high" | "critical";
export type FeeType = "fixed" | "percentage" | "hourly" | "retainer" | "pro_bono";

export interface Matter {
  id: ID;
  number: string;
  internalRef: string;
  title: string;
  typeId: ID;
  clientId: ID;
  opposingParty?: string;
  courtName?: string;
  caseNumber?: string;
  judge?: string;
  status: MatterStatus;
  priority: MatterPriority;
  stage?: string;
  description?: string;
  lawyerIds: ID[];
  feeType: FeeType;
  agreedFee: number;
  hourlyRate?: number;
  expenses: number;
  courtFees: number;
  currency: string;
  openedAt: ISODate;
  closedAt?: ISODate;
  nextAction?: string;
  nextActionDate?: ISODate;
  progress: number;
  confidential: boolean;
  tags: string[];
  createdAt: ISODate;
  updatedAt: ISODate;
  archived: boolean;
  archivedAt?: ISODate;
  archiveYear?: number;
  outcome?: string;
  winRate?: number;
}

/* ------------------------------ الاتفاقيات والأتعاب ------------------------------ */

export type AgreementType = "fee" | "retainer" | "settlement" | "mediation" | "counsel" | "nda";
export type AgreementStatus = "draft" | "signed" | "executed" | "terminated";

export interface Agreement {
  id: ID;
  matterId: ID;
  title: string;
  type: AgreementType;
  amount: number;
  currency: string;
  terms?: string;
  signedDate?: ISODate;
  expiresAt?: ISODate;
  status: AgreementStatus;
  installmentCount: number;
  installmentAmount: number;
  notes?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  archived: boolean;
}

/* ------------------------------ المدفوعات ------------------------------ */

export type PaymentKind = "fee" | "installment" | "expense" | "court_fee" | "other";
export type PaymentMethod = "cash" | "transfer" | "cheque" | "card" | "online";

export interface Payment {
  id: ID;
  matterId: ID;
  agreementId?: ID;
  kind: PaymentKind;
  amount: number;
  currency: string;
  date: ISODate;
  method: PaymentMethod;
  receiptNo?: string;
  notes?: string;
  recordedBy?: ID;
  createdAt: ISODate;
  archived: boolean;
}

/* ------------------------------ المهام ------------------------------ */

export type TaskStatus = "todo" | "doing" | "done" | "cancelled";
export type TaskPriority = "low" | "normal" | "high" | "urgent";

export interface ChecklistItem {
  id: ID;
  text: string;
  done: boolean;
}

export interface Task {
  id: ID;
  title: string;
  description?: string;
  matterId?: ID;
  clientId?: ID;
  assigneeId?: ID;
  createdBy?: ID;
  dueDate?: ISODate;
  remindAt?: ISODate;
  priority: TaskPriority;
  status: TaskStatus;
  tags: string[];
  checklist: ChecklistItem[];
  estimatedHours?: number;
  createdAt: ISODate;
  updatedAt: ISODate;
  completedAt?: ISODate;
  recurring?: "none" | "daily" | "weekly" | "monthly";
  archived: boolean;
}

/* ------------------------------ المواعيد والجلسات ------------------------------ */

export type EventType = "hearing" | "deadline" | "meeting" | "payment" | "followup" | "internal";
export type EventStatus = "scheduled" | "done" | "postponed" | "cancelled";

export interface LegalEvent {
  id: ID;
  title: string;
  type: EventType;
  matterId?: ID;
  clientId?: ID;
  date: ISODate;
  endTime?: string;
  location?: string;
  courtRoom?: string;
  judge?: string;
  attendees?: string[];
  notes?: string;
  outcome?: string;
  status: EventStatus;
  remindBeforeDays: number;
  remindersSent: number;
  createdAt: ISODate;
  updatedAt: ISODate;
  archived: boolean;
  archivedAt?: ISODate;
}

/* ------------------------------ الوثائق ------------------------------ */

export type DocumentCategory =
  | "contract"
  | "pleading"
  | "evidence"
  | "power_of_attorney"
  | "receipt"
  | "id"
  | "correspondence"
  | "report"
  | "memo"
  | "other";

export interface StoredFile {
  id: ID;
  blob: Blob;
  name: string;
  mime: string;
  size: number;
  createdAt: ISODate;
}

export interface LegalDocument {
  id: ID;
  title: string;
  category: DocumentCategory;
  matterId?: ID;
  clientId?: ID;
  eventId?: ID;
  fileId?: ID;
  fileName?: string;
  mime?: string;
  size?: number;
  version: number;
  parentId?: ID;
  tags: string[];
  notes?: string;
  confidential: boolean;
  requiresSignature: boolean;
  signedAt?: ISODate;
  printCount: number;
  createdBy?: ID;
  createdAt: ISODate;
  updatedAt: ISODate;
  archived: boolean;
  archivedAt?: ISODate;
  retentionUntil?: ISODate;
}

/* ------------------------------ المذكرات والسجل ------------------------------ */

export type NoteKind = "note" | "action" | "update" | "call" | "meeting" | "research";

export interface MatterNote {
  id: ID;
  matterId: ID;
  body: string;
  kind: NoteKind;
  authorId?: ID;
  pinned: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
  archived: boolean;
}

/* ------------------------------ المكتبة القانونية ------------------------------ */

export type LibraryType = "book" | "article" | "video" | "journal" | "course" | "template" | "audio";
export type LibraryStatus = "to_read" | "reading" | "finished" | "reference";

export interface LibraryItem {
  id: ID;
  title: string;
  type: LibraryType;
  author?: string;
  publisher?: string;
  year?: number;
  category: string;
  description?: string;
  url?: string;
  fileId?: ID;
  coverColor: string;
  rating: number;
  status: LibraryStatus;
  progress: number;
  tags: string[];
  notes: LibraryNote[];
  isFavorite: boolean;
  addedAt: ISODate;
  lastOpenedAt?: ISODate;
  addedBy?: ID;
  archived: boolean;
}

export interface LibraryNote {
  id: ID;
  body: string;
  page?: number;
  createdAt: ISODate;
}

/* ------------------------------ النماذج (قوالب المستندات) ------------------------------ */

export interface DocTemplate {
  id: ID;
  name: string;
  category: DocumentCategory;
  body: string;
  variables: string[];
  usageCount: number;
  createdAt: ISODate;
  updatedAt: ISODate;
  archived: boolean;
}

/* ------------------------------ سجل النشاط ------------------------------ */

export interface ActivityEntry {
  id: ID;
  userId?: ID;
  userName: string;
  action: string;
  entity: string;
  entityId?: ID;
  meta?: string;
  at: ISODate;
}

/* ------------------------------ الإشعارات ------------------------------ */

export interface AppNotification {
  id: ID;
  title: string;
  body: string;
  kind: "deadline" | "task" | "payment" | "system";
  refType?: string;
  refId?: ID;
  read: boolean;
  at: ISODate;
  link?: string;
}

/* ------------------------------ الإعدادات ------------------------------ */

export type ThemeMode = "light" | "dark" | "system";

export interface FirmProfile {
  firmName: string;
  tagline: string;
  lawyerName: string;
  licenseNumber: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  logoFileId?: ID;
  accent?: string;
}

export interface Settings {
  id: "settings";
  profile: FirmProfile;
  theme: ThemeMode;
  density: "comfortable" | "compact";
  reminderLeadDays: number;
  dailyDigest: boolean;
  soundEnabled: boolean;
  currency: string;
  defaultFeeType: FeeType;
  archiveAfterMonths: number;
  autoArchiveClosed: boolean;
  printHeader: string;
  printFooter: string;
  confidentialityNotice: string;
  sidebarCollapsed: boolean;
}

export interface PortfolioContent {
  id: "portfolio";
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  aboutTitle: string;
  aboutBody: string;
  stats: { label: string; value: string; suffix?: string }[];
  services: { title: string; description: string; icon: string }[];
  expertise: { title: string; description: string; items: string[] }[];
  experience: { period: string; title: string; org: string; description: string }[];
  credentials: { title: string; org: string; year: string }[];
  caseHighlights: { title: string; sector: string; result: string; description: string }[];
  testimonials: { quote: string; name: string; role: string }[];
  articles: { title: string; excerpt: string; tag: string; date: string }[];
  languages: string[];
  memberships: string[];
  ctaTitle: string;
  ctaBody: string;
  avatarFileId?: ID;
  updatedAt: ISODate;
}
