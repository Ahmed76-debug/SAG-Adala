import { db } from "./db";

export async function login(username: string, password: string): Promise<any | null> {
  // --- تنبيه 1: هل تم استدعاء الدالة أصلاً؟ ---
  alert("1. تم الضغط على الزر واستدعاء دالة login");

  try {
    alert("2. جاري محاولة إرسال البيانات إلى السيرفر...");
    
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    // --- تنبيه 2: هل رد السيرفر؟ ---
    alert("3. السيرفر رد على الطلب!");

    const data = await response.json();

    if (response.ok && data.success) {
      alert("4. نجاح! البيانات صحيحة وسأقوم بإدخالك الآن");
      const user = data.user;
      const userId = user._id || user.id;
      localStorage.setItem('session_userId', userId);
      await db.users.put({ id: userId, ...user });
      return { id: userId, ...user };
    } else {
      alert("خطأ من السيرفر: " + (data.message || "بيانات خاطئة"));
      return null;
    }
  } catch (error) {
    alert("حدث خطأ تقني: " + error);
    return null;
  }
}

export function readSession() {
  const userId = localStorage.getItem('session_userId');
  return userId ? { userId } : null;
}

export function clearSession() {
  localStorage.removeItem('session_userId');
}
