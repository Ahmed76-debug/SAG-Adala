import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  BorderStyle
} from "docx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outPath = path.join(__dirname, "دليل المطور التقني - بنية ومسار تطوير منصة عدالة خطوة بخطوة.docx");

function H1(t){ return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing:{before:400,after:200}, children:[new TextRun({text:t,bold:true,size:32})]}); }
function H2(t){ return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing:{before:300,after:160}, children:[new TextRun({text:t,bold:true,size:28})]}); }
function H3(t){ return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing:{before:220,after:140}, children:[new TextRun({text:t,bold:true,size:26})]}); }
function P(t){ return new Paragraph({ spacing:{after:120}, children:[new TextRun({text:t,size:24})]}); }
function B(t){ return new Paragraph({ bullet:{level:0}, spacing:{after:80}, children:[new TextRun({text:t,size:24})]}); }
function SB(t){ return new Paragraph({ bullet:{level:1}, spacing:{after:60}, children:[new TextRun({text:t,size:23})]}); }
function CODE(t){ return new Paragraph({ spacing:{after:60}, shading:{type:ShadingType.CLEAR,fill:"F7F7F7"}, children:[new TextRun({text:t,font:"Courier New",size:20})]}); }

const children = [];

// COVER
children.push(new Paragraph({text:"",spacing:{after:600}}));
children.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:200},children:[new TextRun({text:"دليل المطور التقني",bold:true,size:56})]}));
children.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:250},children:[new TextRun({text:"بنية ومسار تطوير منصة عدالة خطوة بخطوة",bold:true,size:36})]}));
children.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:150},children:[new TextRun({text:"مبني على كود المشروع الفعلي",size:26})]}));
children.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:600},children:[new TextRun({text:"منصة عدالة لإدارة أعمال المحاماة",size:26})]}));
children.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:120},children:[new TextRun({text:"الإصدار: 1.0",size:24})]}));
children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:"أكتوبر 2026",size:24})]}));
children.push(new Paragraph({text:"",pageBreakBefore:true}));

// 1
children.push(H1("1. هدف الدليل"));
children.push(P("يهدف هذا الدليل إلى شرح بنية منصة عدالة برمجياً، وتوزيع الملفات، ونظام التوجيه، والمصادقة والصلاحيات، وطبقة البيانات، وكيفية إضافة ميزات جديدة خطوة بخطوة."));
children.push(P("هذا الدليل موجه للمطور التقني، ويعتمد بالكامل على الملفات الفعلية داخل المشروع."));

// 2
children.push(H1("2. نظرة عامة على المشروع"));
children.push(P("منصة عدالة نظام متكامل لإدارة أعمال المحاماة، يعمل بنمط Local-First باستخدام IndexedDB عبر Dexie. صُمم لسهولة التحويل إلى واجهة خلفية مستقبلاً بنمط Repository."));
children.push(H2("2.1. التقنيات المستخدمة"));
children.push(B("Vite 8 + React 19 + TypeScript 5.9"));
children.push(B("Tailwind CSS v4"));
children.push(B("React Router DOM v7"));
children.push(B("Dexie 4 + dexie-react-hooks"));
children.push(B("lucide-react"));
children.push(B("html2canvas + jspdf"));

// 3
children.push(H1("3. إعداد بيئة التطوير"));
children.push(H2("3.1. المتطلبات"));
children.push(B("Node.js 18 أو أحدث"));
children.push(B("npm"));
children.push(B("Visual Studio Code"));
children.push(H2("3.2. التشغيل"));
children.push(CODE("cd adala-platform"));
children.push(CODE("npm install"));
children.push(CODE("npm run dev"));
children.push(H2("3.3. الفحص والبناء"));
children.push(CODE("npx tsc --noEmit"));
children.push(CODE("npm run build"));
children.push(CODE("npm run preview"));

// 4
children.push(H1("4. هيكل المشروع الفعلي"));
children.push(P("src/ هو قلب المشروع. إليك أهم الملفات والمجلدات:"));
children.push(H2("4.1. ملفات الجذر"));
children.push(B("src/main.tsx - نقطة الدخول، استدعاء ensureSeed()، تسجيل Service Worker في الإنتاج"));
children.push(B("src/App.tsx - Router، RequireAuth، RequirePermission، فصل المسارات العامة/المحمية"));
children.push(B("src/index.css - متغيرات الثيم وأسس التصميم"));
children.push(H2("4.2. مجلدات رئيسية"));
children.push(B("src/components/"));
children.push(SB("layout/AppShell.tsx - القالب العام، القائمة الجانبية، فلترة الصلاحيات، قسم البورتفوليو"));
children.push(SB("ui/ - مكونات موحدة"));
children.push(B("src/pages/ - صفحات التطبيق"));
children.push(B("src/lib/"));
children.push(SB("types.ts - أنواع الكيانات"));
children.push(SB("db.ts - Dexie، الجداول، repo، uid/nowISO، logActivity، saveFile/getFile، Backup"));
children.push(SB("seed.ts - بيانات أولية ودالة ensureSeed"));
children.push(SB("permissions.ts - الصلاحيات والأدوار"));
children.push(SB("auth.ts - منطق المصادقة"));
children.push(SB("pdf.ts - تصدير PDF"));
children.push(SB("print.ts - الطباعة المباشرة"));
children.push(B("src/state/"));
children.push(SB("AppProvider.tsx - الجلسة، الثيم، settings، login/logout، can()"));

// 5
children.push(H1("5. التوجيه، الحمايات، والمسارات"));
children.push(H2("5.1. في App.tsx"));
children.push(B("RequireAuth: يفحص user وready، ويحوّل ل /login إن غير مسجل"));
children.push(B("RequirePermission: يفحص can(perm) ويعرض صفحة منع الوصول إن لم يتوفر"));
children.push(B("LoginRoute: يحوّل للوحة إن كان مسجلاً"));
children.push(B("ScrollToTop: يعيد لأعلى عند تغيير المسار"));
children.push(H2("5.2. تقسيم المسارات"));
children.push(B("عامة: /login، /portfolio (خارج RequireAuth)"));
children.push(B("محمية: جميع ما داخل AppShell ومغلقة بـ RequireAuth"));
children.push(B("/portfolio/manage: داخل المحمية + RequirePermission('portfolio.edit')"));

// 6
children.push(H1("6. الجلسة، الصلاحيات، والأدوار"));
children.push(P("تدار عبر AppProvider. دالة can(permission) هي مفتاح التحقق. الصلاحيات معرفة في permissions.ts. بيانات الدخول الافتراضية: admin / admin123"));

// 7
children.push(H1("7. طبقة البيانات Dexie"));
children.push(H2("7.1. الجداول"));
children.push(P("users, clients, matters, matterTypes, agreements, payments, tasks, events, documents, files, notes, library, templates, activity, notifications, settings, portfolio"));
children.push(H2("7.2. أدوات مساعدة"));
children.push(B("uid(prefix): توليد معرف فريد"));
children.push(B("nowISO(): تاريخ ووقت بصيغة ISO"));
children.push(B("logActivity(): تسجيل نشاط مع تقليص السجل لأكثر من 500 إدخال"));
children.push(B("repo<T>(): CRUD موحد"));
children.push(B("saveFile/getFile/deleteFile: إدارة ملفات Blob داخل IndexedDB"));
children.push(B("exportBackup/importBackup/wipeLocalData: نسخ احتياطي واستعادة ومسح"));

// 8
children.push(H1("8. البورتفوليو العام وإدارته"));
children.push(H2("8.1. العرض العام /portfolio"));
children.push(B("مفتوح للجميع بدون تسجيل دخول"));
children.push(B("يعرض صورة المحامي بجوار الاسم أو ككرت جانبي ثابت على lg فأكبر"));
children.push(B("أزرار طباعة وPDF"));
children.push(B("لا أزرار تعديل"));
children.push(H2("8.2. الإدارة /portfolio/manage"));
children.push(B("داخل لوحة التحكم ويحتاج صلاحية portfolio.edit"));
children.push(B("تحرير كامل المحتوى، رفع/حذف صورة المحامي، تحديث اسم المحامي واسم المكتب في settings.profile"));
children.push(B("الحفظ يحدث في db.portfolio مع updatedAt"));

// 9
children.push(H1("9. تصدير PDF والطباعة"));
children.push(B("pdf.ts: html2canvas + jsPDF لتصدير عنصر محدد"));
children.push(B("print.ts: طباعة مباشرة مع تنسيق مناسب"));
children.push(P("يفضل استخدام عنصر مخصص للطباعة/PDF للحفاظ على شكل مقروء في الوضع الليلي."));

// 10
children.push(H1("10. إضافة ميزة جديدة خطوة بخطوة"));
children.push(H2("10.1. التسلسل"));
children.push(B("1. types.ts - تعريف النوع"));
children.push(B("2. db.ts - إضافة الجدول + repo إن لزم"));
children.push(B("3. permissions.ts - إضافة الصلاحيات وربطها"));
children.push(B("4. pages/ - إنشاء الصفحة باتباع نمط موجود"));
children.push(B("5. App.tsx - إضافة Route مع RequireAuth/RequirePermission"));
children.push(B("6. components/layout/AppShell.tsx - إضافة للقائمة الجانبية مع الصلاحية"));
children.push(B("7. فحص وتجربة: npx tsc --noEmit && npm run dev"));
children.push(H2("10.2. نصيحة"));
children.push(P("انسخ صفحة مشابهة جدًا وعدّلها، هذا أسرع وأقل عرضة للأخطاء."));

// 11
children.push(H1("11. البناء، النشر، وSPA Fallback"));
children.push(CODE("npx tsc --noEmit"));
children.push(CODE("npm run build"));
children.push(P("ارفع محتوى dist/ فقط. أضف إعادة توجيه لـ index.html:"));
children.push(P(".htaccess (Apache): RewriteRule . /index.html [L]"));
children.push(P("nginx: try_files $uri $uri/ /index.html;"));
children.push(P("Netlify: /* /index.html 200"));
children.push(P("Vercel: rewrites إلى /index.html"));

// 12
children.push(H1("12. قواعد وأفضل الممارسات"));
children.push(B("التزم بالبنية الحالية"));
children.push(B("استخدم @/ للمسارات"));
children.push(B("دعم RTL والتجاوب"));
children.push(B("تحقق من الصلاحيات في Route وUI"));
children.push(B("استخدم useLiveQuery مع Dexie"));
children.push(B("سجّل الأنشطة الحساسة بـ logActivity"));
children.push(B("لا تعدّل seed.ts إلا بحذر"));
children.push(B("نفذ tsc قبل build"));
children.push(B("حافظ على فصل المسارات العامة عن المحمية"));

// 13
children.push(H1("13. استكشاف الأخطاء الشائعة"));
children.push(B("شاشة بيضاء: غالبًا seed.ts أو خطأ استيراد"));
children.push(B("خطأ صلاحية: تأكد من permissions.ts وRequirePermission"));
children.push(B("لا يظهر عنصر بالقائمة: تحقق من AppShell.tsx"));
children.push(B("صورة لا تظهر: تأكد من avatarFileId وdb.files"));
children.push(B("404 بعد النشر: راجع SPA Fallback"));

// 14
children.push(H1("14. ملحق"));
children.push(H2("14.1. ملفات حرجة"));
children.push(B("src/App.tsx"));
children.push(B("src/main.tsx"));
children.push(B("src/state/AppProvider.tsx"));
children.push(B("src/components/layout/AppShell.tsx"));
children.push(B("src/lib/db.ts"));
children.push(B("src/lib/seed.ts"));
children.push(B("src/lib/permissions.ts"));
children.push(B("src/lib/types.ts"));
children.push(H2("14.2. أوامر سريعة"));
children.push(CODE("npm run dev"));
children.push(CODE("npx tsc --noEmit"));
children.push(CODE("npm run build"));
children.push(CODE("npm run preview"));
children.push(H2("14.3. بيانات الدخول"));
children.push(CODE("admin / admin123"));
children.push(new Paragraph({text:"",spacing:{before:400}}));
children.push(P("نهاية دليل المطور التقني - منصة عدالة"));

const doc = new Document({ sections: [{ properties: {}, children }] });

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outPath, buffer);
  console.log("DONE:", outPath);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
