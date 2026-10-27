# عدالة — منصة احترافية لإدارة أعمال المحاماة

نظام ويب كامل (Local-first) لإدارة قضايا المكتب: بورتفوليو، قضايا، موكلون، مواعيد، مهام،
مستندات، أرشيف، مكتبة قانونية، مستخدمون وصلاحيات، تقارير، ومركز طباعة.

---

## التشغيل

```bash
npm install
npm run dev        # http://localhost:5180
npm run build      # tsc -b && vite build  → dist/
npm run preview    # معاينة نسخة الإنتاج
```

> بيئة Windows: `npm.ps1` محجوب — استخدم **دائمًا** `npm.cmd` و `npx.cmd`.

**حسابات تجريبية** (كلمة المرور `Admin@2025`):
`admin` · `sara` · `fahad` · `noura` · `layan`

---

## البنية

```
src/
  App.tsx                    التوجيه + حرّاس الصلاحيات
  main.tsx                   الإقلاع + بذر البيانات + تسجيل Service Worker
  index.css                  رموز التصميم (Light/Dark) + قواعد @media print
  lib/
    db.ts                    Dexie/IndexedDB + نمط Repository (يسهّل التحويل لـ REST/Capacitor)
    print.ts                 الطباعة المباشرة + تجهيز مناطق الالتقاط
    pdf.ts                   تصدير PDF (jsPDF + html2canvas) + CSV
    permissions.ts           RBAC (7 أدوار) + تخصيص فردي
    auth.ts  format.ts  types.ts  cn.ts
  components/                layout/ · ui/ · forms/ · charts/
  pages/                     15 صفحة (Dashboard … PrintCenter)
  state/AppProvider.tsx      سياق المصادقة والإعدادات والثيم
```

**المسارات:** `/dashboard` `/matters` `/matters/:id` `/clients` `/tasks` `/calendar` `/documents`
`/archive` `/library` `/reports` `/users` `/settings` `/portfolio` `/portfolio/manage` `/print`

---

## نظام الطباعة والتصدير (الجزء الأكثر حساسية)

### طباعة مباشرة — `lib/print.ts` → `printElement(element, { header, footer, title })`
- تُنشئ نسخة داخل `#print-root` (مخفي على الشاشة، ظاهر في `@media print`).
- تفرض رموز النهار على النسخة ⇒ **نص داكن على ورق أبيض حتى في الوضع الليلي**.
- `@page { size: A4; margin: 16mm 14mm 18mm }` ⇒ عرض المحتوى ≈ **688px**.

### تصدير PDF — `lib/pdf.ts` → `exportElementToPdf(el, opts)` / `exportPrintArea(id, name, opts)`
- **html2canvas لا يقبل HTMLElement!** (يستخدم `parseDocumentSize` لحجم المستند لا حدود العنصر).
  الحل المعتمد: كل شيء داخل `onclone` مع تمرير `x/y/width/height` صريحة من قياس النسخة.
- `PRINT_CONTENT_WIDTH = 688` (A4 عمودي) · `PRINT_CONTENT_WIDTH_LANDSCAPE = 1016` (A4 أفقي).
- **Tailwind v4** يولّد `color-mix(in oklab, …)` و`linear-gradient(… in oklab, …)` →
  html2canvas يفشل بـ `unsupported color function "oklab"`.
  الحل: `normalizeElementColors()` في `print.ts` يحوّلها إلى `rgba()` عبر canvas 1×1 + `getImageData`
  (لأن `ctx.fillStyle` يُعيد oklab كما هو).
- التقاط متعدد الصفحات: ي slicing أفقي على ارتفاع الصفحة ثم `pdf.addImage` لكل شريحة.

### التحقّق من التصدير (برمجيًا — النموذج لا يقرأ صورًا)
```js
// داخل المتصفح: ترقيع toDataURL لحساب نسبة البكسلات غير البيضاء
const d = ctx.getImageData(0,0,w,h).data; // dark = r,g,b < 120
```
المعيار: **نتائج الوضع الليلي = النهاري تمامًا**، و`nonWhite` بين 4% و 31%.
> إن ظهر كانفس 300×150 فهو اختبار `testSVG` الداخلي في html2canvas — وليس الالتقاط الحقيقي.

---

## مصائد معروفة (لا تُعِد اكتشافها)

| المصيدة | القاعدة |
|---|---|
| `hidden` لا يعمل مع `inline-flex` | Tailwind v4: `.flex → .grid → .hidden → .inline-flex` — لفّ الزر في `<span className="hidden sm:inline-flex">` |
| `cn()` بلا tailwind-merge | تعارضات `display` تُحسم بترتيب CSS لا بترتيب الكلاسات |
| `useLiveQuery` بقيمة `[]` | يعرض بيانات فارغة لحظيًا قبل تحميل IndexedDB — انتظر أو استخدم fallback |
| `import type` | `isolatedModules` + `noUnusedLocals` مفعّلة — استيرادات الأنواع تحتاج `import type` |
| PowerShell + العربية | يعرض mojibake — اقرأ بـ `node` بملفات `.cjs` بترميز UTF-8 |
| توليد نص عربي طويل | قد يتشوّه — افحص المحارف بعد كل كتابة صفحة (لا محارف صينية/لاتينية/هولندية/كورية داخل النص العربي) |
| HMR أثناء القياس | يُفسد قياسات canvas — أعد تحميل الصفحة قبل القياس |

---

## المرحلة القادمة (جاهزة للتوسّع)

- **PWA / Local-first**: `public/sw.js` مسجّل في `main.tsx` + Dexie ⇒ العمل دون إنترنت.
- **ديسك توب / موبايل**: طبقة Repository في `db.ts` تفصل التخزين عن الواجهة — يكفي استبدالها بـ REST/Capacitor.
- **توسّع الصلاحيات**: `permissions.ts`RBAC جاهز لدورين إضافيين.
- **قوالب إضافية**: `PrintCenter.tsx` (5 قوالب) — يُضاف قالب كـ component مع `orientation` المناسب.
