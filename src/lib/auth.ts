import type { User } from "./types";
import { db, nowISO, uid } from "./db";

/* =============================================================
   المصادقة — تشفير PBKDF2 + جلسات محلية آمنة
   ============================================================= */

const SESSION_KEY = "adala.session.v1";
const ITERATIONS = 120_000;

export function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(password: string, user: User): Promise<boolean> {
  const hash = await hashPassword(password, user.salt);
  return hash === user.passwordHash;
}

export interface Session {
  userId: string;
  token: string;
  issuedAt: string;
  expiresAt: string;
  device?: string;
}

const SESSION_TTL_HOURS = 24 * 14;

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (new Date(s.expiresAt).getTime() < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function writeSession(userId: string): Session {
  const now = Date.now();
  const session: Session = {
    userId,
    token: uid("tok_") + Math.random().toString(36).slice(2),
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_HOURS * 3600_000).toISOString(),
    device: navigator.userAgent.slice(0, 120),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function login(username: string, password: string): Promise<User | null> {
  const user = await db.users.where("username").equals(username.trim()).first();
  if (!user || !user.isActive) return null;
  const ok = await verifyPassword(password, user);
  if (!ok) return null;
  await db.users.update(user.id, { lastLoginAt: nowISO() });
  writeSession(user.id);
  return { ...user, lastLoginAt: nowISO() };
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = await db.users.get(userId);
  if (!user) throw new Error("المستخدم غير موجود");
  if (!(await verifyPassword(current, user))) throw new Error("كلمة المرور الحالية غير صحيحة");
  const salt = randomSalt();
  await db.users.update(userId, { salt, passwordHash: await hashPassword(next, salt) });
}

export async function setPassword(userId: string, next: string) {
  const salt = randomSalt();
  await db.users.update(userId, { salt, passwordHash: await hashPassword(next, salt) });
}

export function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["ضعيفة جدًا", "ضعيفة", "متوسطة", "قوية", "قوية جدًا", "ممتازة"];
  const colors = ["#c02b3a", "#c02b3a", "#b3720a", "#0f8a5f", "#0f8a5f", "#2563c9"];
  return { score, label: labels[score] ?? "ضعيفة", color: colors[score] ?? "#c02b3a" };
}
