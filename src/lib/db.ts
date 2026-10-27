import Dexie, { type Table } from "dexie";
import type {
  ActivityEntry,
  Agreement,
  AppNotification,
  Client,
  DocTemplate,
  LegalDocument,
  LegalEvent,
  LibraryItem,
  Matter,
  MatterNote,
  MatterType,
  Payment,
  PortfolioContent,
  Settings,
  StoredFile,
  Task,
  User,
} from "./types";
import { hashPassword, randomSalt } from "./auth";

/* =============================================================
   قاعدة البيانات المحلية (IndexedDB عبر Dexie)
   - تعمل بالكامل دون اتصال
   - قابلة للاستبدال بمصدر بيانات خادمي عبر Repository API
   ============================================================= */

export class AdalaDB extends Dexie {
  users!: Table<User, string>;
  clients!: Table<Client, string>;
  matterTypes!: Table<MatterType, string>;
  matters!: Table<Matter, string>;
  agreements!: Table<Agreement, string>;
  payments!: Table<Payment, string>;
  tasks!: Table<Task, string>;
  events!: Table<LegalEvent, string>;
  documents!: Table<LegalDocument, string>;
  files!: Table<StoredFile, string>;
  notes!: Table<MatterNote, string>;
  library!: Table<LibraryItem, string>;
  templates!: Table<DocTemplate, string>;
  activity!: Table<ActivityEntry, string>;
  notifications!: Table<AppNotification, string>;
  settings!: Table<Settings, string>;
  portfolio!: Table<PortfolioContent, string>;

  constructor() {
    super("adala_legal_suite");
    this.version(1).stores({
      users: "id, username, role, isActive, createdAt",
      clients: "id, name, type, status, assignedTo, createdAt",
      matterTypes: "id, name",
      matters:
        "id, number, clientId, typeId, status, priority, openedAt, nextActionDate, *lawyerIds, *tags",
      agreements: "id, matterId, status, type",
      payments: "id, matterId, date, kind",
      tasks: "id, matterId, assigneeId, status, dueDate, *tags",
      events: "id, matterId, date, type, status",
      documents: "id, matterId, clientId, category, parentId",
      files: "id, name, createdAt",
      notes: "id, matterId, kind, createdAt",
      library: "id, type, category, status, addedAt",
      templates: "id, category",
      activity: "id, at, userId, entity, entityId",
      notifications: "id, at, kind, refId",
      settings: "id",
      portfolio: "id",
    });

    // التحقق من وجود حساب الأدمن وإنشاؤه تلقائياً إذا لم يوجد
    this.on("ready", async () => {
      await ensureAdminExists();
    });
  }
}

export const db = new AdalaDB();

// إنشاء حساب الأدمن تلقائياً إذا لم يكن موجوداً
export async function ensureAdminExists(): Promise<void> {
  try {
    const adminCount = await db.users.where("role").equals("admin").count();
    if (adminCount > 0) return;

    const salt = randomSalt();
    const passwordHash = await hashPassword("admin123", salt);

    const adminUser: User = {
      id: uid("usr_"),
      name: "مدير النظام",
      username: "admin",
      email: "admin@adala.local",
      phone: "",
      role: "admin",
      title: "مدير النظام",
      bio: "",
      avatarColor: "#2563eb",
      passwordHash,
      salt,
      isActive: true,
      createdAt: nowISO(),
      notificationsEnabled: true,
    };

    await db.users.add(adminUser);
    console.log("✅ تم إنشاء حساب الأدمن تلقائياً | اسم المستخدم: admin | كلمة المرور: admin123");
  } catch (error) {
    console.error("❌ فشل في إنشاء حساب الأدمن تلقائياً:", error);
  }
}

/* ------------------------------ أدوات عامة ------------------------------ */

export const uid = (prefix = "") =>
  `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const nowISO = () => new Date().toISOString();

export async function logActivity(
  entry: Omit<ActivityEntry, "id" | "at"> & { at?: string },
): Promise<void> {
  try {
    await db.activity.add({
      id: uid("act_"),
      at: entry.at ?? nowISO(),
      userId: entry.userId,
      userName: entry.userName,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      meta: entry.meta,
    });
    // منع تضخم السجل
    const count = await db.activity.count();
    if (count > 600) {
      const old = await db.activity.orderBy("at").limit(count - 500).primaryKeys();
      await db.activity.bulkDelete(old as string[]);
    }
  } catch {
    /* السجل غير حرج */
  }
}

/* ------------------------------ CRUD عام ------------------------------ */

type Repo<T extends { id: string }> = {
  all(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  create(item: T): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<void>;
  remove(id: string): Promise<void>;
  bulkRemove(ids: string[]): Promise<void>;
};

export function repo<T extends { id: string }>(table: Table<T, string>): Repo<T> {
  return {
    all: () => table.toArray(),
    get: (id) => table.get(id),
    create: async (item) => {
      await table.add(item);
      return item;
    },
    update: async (id, patch) => {
      await table.update(id, patch as never);
    },
    remove: (id) => table.delete(id),
    bulkRemove: (ids) => table.bulkDelete(ids),
  };
}

export const usersRepo = repo(db.users);
export const clientsRepo = repo(db.clients);
export const mattersRepo = repo(db.matters);
export const agreementsRepo = repo(db.agreements);
export const paymentsRepo = repo(db.payments);
export const tasksRepo = repo(db.tasks);
export const eventsRepo = repo(db.events);
export const documentsRepo = repo(db.documents);
export const notesRepo = repo(db.notes);
export const libraryRepo = repo(db.library);
export const templatesRepo = repo(db.templates);
export const matterTypesRepo = repo(db.matterTypes);
export const notificationsRepo = repo(db.notifications);

/* ------------------------------ إدارة الملفات ------------------------------ */

export async function saveFile(blob: Blob, name: string): Promise<StoredFile> {
  const file: StoredFile = {
    id: uid("file_"),
    blob,
    name,
    mime: blob.type || "application/octet-stream",
    size: blob.size,
    createdAt: nowISO(),
  };
  await db.files.add(file);
  return file;
}

export async function getFile(id?: string): Promise<StoredFile | undefined> {
  if (!id) return undefined;
  return db.files.get(id);
}

export async function deleteFile(id?: string): Promise<void> {
  if (!id) return;
  await db.files.delete(id);
}

export function fileToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function blobFromDataUrl(dataUrl: string, name: string): Promise<StoredFile> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return saveFile(blob, name);
}

/* ------------------------------ النسخ الاحتياطي ------------------------------ */

export interface BackupPayload {
  version: number;
  createdAt: string;
  tables: Record<string, unknown[]>;
  files: { id: string; name: string; mime: string; dataUrl: string }[];
}

const BACKUP_TABLES = [
  "users",
  "clients",
  "matterTypes",
  "matters",
  "agreements",
  "payments",
  "tasks",
  "events",
  "documents",
  "notes",
  "library",
  "templates",
  "activity",
  "settings",
  "portfolio",
] as const;

export async function exportBackup(includeFiles = true): Promise<BackupPayload> {
  const tables: Record<string, unknown[]> = {};
  for (const t of BACKUP_TABLES) {
    tables[t] = await (db as unknown as Record<string, Table<unknown, string>>)[t].toArray();
  }
  const files: BackupPayload["files"] = [];
  if (includeFiles) {
    for (const f of await db.files.toArray()) {
      files.push({
        id: f.id,
        name: f.name,
        mime: f.mime,
        dataUrl: await fileToDataUrl(f.blob),
      });
    }
  }
  return { version: 1, createdAt: nowISO(), tables, files };
}

export async function importBackup(payload: BackupPayload, mode: "merge" | "replace" = "replace") {
  if (mode === "replace") {
    for (const t of BACKUP_TABLES) {
      await (db as unknown as Record<string, Table<unknown, string>>)[t].clear();
    }
    await db.files.clear();
  }
  for (const [name, rows] of Object.entries(payload.tables)) {
    const table = (db as unknown as Record<string, Table<unknown, string>>)[name];
    if (!table) continue;
    await table.bulkPut(rows as never[]);
  }
  for (const f of payload.files ?? []) {
    const stored = await blobFromDataUrl(f.dataUrl, f.name);
    await db.files.update(stored.id, { id: f.id });
  }
}

export async function storageEstimate(): Promise<{ usage: number; quota: number }> {
  if (navigator.storage?.estimate) {
    const e = await navigator.storage.estimate();
    return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
  }
  return { usage: 0, quota: 0 };
}

export async function wipeLocalData() {
  await db.delete();
  await db.open();
}
