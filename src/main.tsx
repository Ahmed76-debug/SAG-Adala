import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ensureSeed } from "./lib/seed";
const seedDatabase = ensureSeed;

/* =============================================================
   نقطة تشغيل التطبيق
   - تهيئة البيانات التجريبية عند أول تشغيل
   - تسجيل عامل الخدمة (Service Worker) للعمل دون اتصال
   ============================================================= */

async function bootstrap() {
  try {
    await seedDatabase();
  } catch (err) {
    console.error("تعذّر تجهيز البيانات الأولية:", err);
  }

  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* العمل دون اتصال غير متاح — لا يضرّ التشغيل */
      });
    });
  }
}

void bootstrap();

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
