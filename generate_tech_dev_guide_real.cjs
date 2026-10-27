const fs = require("fs");
const path = require("path");
const {
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
  BorderStyle,
  ShadingType
} = require("docx");

const outDir = __dirname;
const fileName = "دليل المطور التقني - بنية ومسار تطوير منصة عدالة خطوة بخطوة.docx";
const outPath = path.join(outDir, fileName);

const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 500, after: 250 },
  children: [new TextRun({ text, bold: true, size: 32 })],
});

const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 350, after: 200 },
  children: [new TextRun({ text, bold: true, size: 28 })],
});

const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 250, after: 150 },
  children: [new TextRun({ text, bold: true, size: 26 })],
});

const p = (text) => new Paragraph({
  spacing: { after: 140 },
  children: [new TextRun({ text, size: 24 })],
});

const b = (text) => new Paragraph({
  bullet: { level: 0 },
  spacing: { after: 90 },
  children: [new TextRun({ text, size: 24 })],
});

const sb = (text) => new Paragraph({
  bullet: { level: 1 },
  spacing: { after: 70 },
  children: [new TextRun({ text, size: 23 })],
});

const code = (text) => new Paragraph({
  spacing: { after: 70 },
  shading: { type: ShadingType.CLEAR, fill: "F6F6F6" },
  children: [new TextRun({ text, font: "Courier New", size: 20 })],
});

const doc = new Document({
  sections: [{
    properties: {},
    children: [
      new Paragraph({ text: "", spacing: { after: 700 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 250 }, children: [new TextRun({ text: "دليل المطور التقني", bold: true, size: 58 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: "بنية ومسار تطوير منصة عدالة خطوة بخطوة", bold: true, size: 38 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: "مبني على كود المشروع الفعلي", size: 26 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 650 }, children: [new TextRun({ text: "منصة عدالة لإدارة أعمال المحاماة", size: 26 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 140 }, children: [new TextRun({ text: "الإصدار: 1.0", size: 24 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "أكتوبر 2026", size: 24 })] }),

      new Paragraph({ text: "", pageBreakBefore: true }),
      h1("1. هدف الدليل"),
      p("هذا الدليل موجه حصريًا للمطور التقني. يشرح بنية المشروع، توزيع الملفات، تدفق البيانات، نظام التوجيه، الصلاحيات، وكيفية التوسع وإضافة ميزات جديدة دون كسر البنية الحالية."),
      p("يعتمد هذا التوثيق على قراءة الملفات الفعلية للمشروع: package.json, src/App.tsx, src/main.tsx, src/lib/db.ts, src/state/AppProvider.tsx, src/components/layout/AppShell.tsx وغيرها."),

      h1("2. نظرة عامة على المشروع"),
      p("منصة عدالة هي نظام متكامل لإدارة أعمال المحاماة، يعمل بنمط Local-First. جميع البيانات تُخزن محليًا في IndexedDB عبر مكتبة Dexie. تم تصميمه لسهولة التحويل مستقبلاً إلى Backend عبر Repository Pattern."),
      h2("2.1. التقنيات المستخدمة"),
      b("Vite 8 + @vitejs/plugin-react"),
      b("React 19 + TypeScript 5.9"),
      b("Tailwind CSS v4"),
      b("React Router DOM v7"),
      b("Dexie 4 + dexie-react-hooks"),
      b("lucide-react"),
      b("jspdf + html2canvas"),

      h1("3. إعداد بيئة التطوير"),
      h2("3.1. المتطلبات"),
      b("Node.js >= 18"),
      b("npm"),
      b("محرر VS Code مع دعم TypeScript"),
      h2("3.2. تشغيل المشروع محليًا"),
      code("cd adala-platform"),
      code("npm install"),
      code("npm run dev"),
      h2("3.3. فحص وبناء"),
      code("npx tsc --noEmit"),
      code("npm run build"),
      code("npm run preview"),

      h1("4. هيكل المشروع الفعلي"),
      p("المسار الأساسي: adala-platform/src/"),
      h2("4.1. ملفات الجذر"),
      b("main.tsx: نقطة الدخول. يستدعي ensureSeed() لتهيئة البيانات، ويُسجّل Service Worker في الإنتاج."),
      b("App.tsx: تعريف الراوتر، الحمايات (RequireAuth / RequirePermission)، فصل المسارات العامة عن المحمية، تعريف AppRoutes."),
      b("index.css: متغيرات الثيم، CSS العام، أنماط Tailwind v4."),
      h2("4.2. المجلدات"),
      b("components/ : مكونات مشتركة وقابلة لإعادة الاستخدام"),
      sb("components/layout/AppShell.tsx : القالب الرئيسي، القائمة الجانبية (NAV)، رأس الصفحة، درج الجوال، ربط الصلاحيات بالقائمة."),
      sb("components/ui/ : عناصر واجهة موحدة (primitives, overlays)."),
      sb("components/common/ : مكونات مساعدة."),
      b("pages/ : صفحات التطبيق (Dashboard, Clients, Matters, Portfolio, PortfolioAdmin, ...)."),
      b("lib/ : طبقة المنطق والأدوات"),
      sb("lib/types.ts : تعريفات الأنواع المركزية لكافة الكيانات."),
      sb("lib/db.ts : فئة AdalaDB، الجداول، repo(), uid(), nowISO(), logActivity(), إدارة الملفات، Backup."),
      sb("lib/seed.ts : المستخدم الافتراضي، الإعدادات، بورتفوليو افتراضي، ensureSeed()."),
      sb("lib/permissions.ts : تعريف Permission، أدوار، ودالة التحقق."),
      sb("lib/auth.ts : منطق المصادقة."),
      sb("lib/pdf.ts : تصدير PDF باستخدام html2canvas + jsPDF."),
      sb("lib/print.ts : الطباعة المباشرة مع دعم رؤوس/تذييلات."),
      b("state/ : إدارة الحالة العامة"),
      sb("state/AppProvider.tsx : سياق التطبيق، جلسة المستخدم، theme، settings، login/logout، دالة can(), ready()."),
      b("hooks/ : هوكس مخصصة"),
      b("styles/ : أنماط إضافية"),

      h1("5. نقطة الدخول والتوجيه"),
      h2("5.1. src/main.tsx"),
      p("يقوم باستدعاء seedDatabase()/ensureSeed() قبل render. في وضع الإنتاج يُسجّل /sw.js. يُلف التطبيق بـ StrictMode ويُمرره لـ App()."),
      h2("5.2. src/App.tsx"),
      p("يستخدم BrowserRouter + Routes. أهم النقاط:"),
      b("RequireAuth: يتحقق من وجود user و ready. إن لم يوجد يُحوّل إلى /login مع state.from."),
      b("RequirePermission: يستخدم useApp().can(perm) ويعرض NoAccess عند عدم وجود صلاحية."),
      b("LoginRoute: إذا كان هناك جلسة يُحوّل إلى /."),
      b("ScrollToTop: يُعيد التمرير لأعلى عند تغيير pathname."),
      b("المسارات العامة: /login, /portfolio خارج RequireAuth."),
      b("المسارات المحمية: كلها داخل Route element={<RequireAuth><AppShell/></RequireAuth>}."),
      b("مسار خاص: /portfolio/manage محمي بـ RequirePermission perm=\"portfolio.edit\""),

      h1("6. إدارة الجلسة، الحالة، والصلاحيات"),
      h2("6.1. src/state/AppProvider.tsx"),
      p("يوفر السياق العام للتطبيق ويُدير:"),
      b("user: جلسة المستخدم الحالية"),
      b("ready: جاهزية التهيئة"),
      b("settings: إعدادات النظام"),
      b("theme: الوضع النهاري/الليلي"),
      b("login(username, password): يتحقق من المستخدم في IndexedDB ويُنشئ جلسة"),
      b("logout(): ينهي الجلسة"),
      b("updateSettings(): تحديث الإعدادات"),
      b("can(permission): التحقق من صلاحية المستخدم بناءً على role + permissions"),
      h2("6.2. src/lib/permissions.ts"),
      p("يُعرّف جميع الصلاحيات المتاحة ويُوزعها على الأدوار. عند إضافة صلاحية جديدة يجب إضافتها هنا وربطها بالأدوار المناسبة، ثم استخدامها في RequirePermission أو can()."),
      h2("6.3. بيانات الدخول الافتراضية"),
      code("اسم المستخدم: admin"),
      code("كلمة المرور: admin123"),

      h1("7. طبقة البيانات (Dexie + Types)"),
      h2("7.1. src/lib/types.ts"),
      p("مصدر الحقيقة لتعريفات الأنواع. يشمل: User, Client, Matter, Agreement, Payment, Task, LegalEvent, LegalDocument, StoredFile, LibraryItem, PortfolioContent, Settings وغيرها. أي كيان جديد يجب تعريفه هنا أولاً."),
      h2("7.2. src/lib/db.ts"),
      p("يُعرّف AdalaDB ويرث من Dexie مع schema الإصدار 1. الجداول الرئيسية: users, clients, matters, agreements, payments, tasks, events, documents, files, notes, library, templates, activity, notifications, settings, portfolio."),
      h2("7.3. نمط Repo"),
      p("يتم تصدير repo<T>(table) مع دوال: all(), get(id), create(item), update(id, patch), remove(id), bulkRemove(ids). كما يتم تصدير نسخ جاهزة مثل usersRepo, mattersRepo وغيرها للاستخدام الموحد."),
      h2("7.4. إدارة الملفات"),
      b("saveFile(blob, name): يحفظ الملف كـBlob داخل جدول files مع uid."),
      b("getFile(id): يجلب الملف."),
      b("deleteFile(id): يحذف الملف."),
      b("fileToDataUrl / blobFromDataUrl: للتحويل بين Blob وDataURL."),
      h2("7.5. النسخ الاحتياطي"),
      p("exportBackup() يجمع الجداول المحددة في BACKUP_TABLES مع ملفاتها (اختياري). importBackup() يدعم merge أو replace. wipeLocalData() يحذف قاعدة البيانات بالكامل ويعيد فتحها."),

      h1("8. التخطيط والقائمة الجانبية"),
      h2("8.1. src/components/layout/AppShell.tsx"),
      p("القالب العام للوحة التحكم. مسؤول عن:"),
      b("رأس التطبيق، عنوان الصفحة، إجراءات سريعة"),
      b("القائمة الجانبية (NAV) مع تصنيفات: الرئيسية، القضايا، العملاء، المواعيد، الوثائق، المكتبة، النظام"),
      b("قسم 'البورتفوليو': يحتوي على 'عرض البورتفوليو العام' و'تحرير البورتفوليو' ويظهر الثاني فقط لمن يملك صلاحية portfolio.edit"),
      b("درج الجوال المتجاوب"),
      b("فلترة العناصر حسب الصلاحيات عبر can()"),
      p("عند إضافة صفحة جديدة إلى لوحة التحكم يجب إضافتها هنا في NAV مع perm المناسب إن كانت محمية."),

      h1("9. البورتفوليو العام مقابل إدارة البورتفوليو"),
      h2("9.1. src/pages/Portfolio.tsx (عام، مفتوح)"),
      b("مسار: /portfolio خارج AppShell ولا يحتاج RequireAuth."),
      b("يقرأ portfolio من db.portfolio ويقرأ settings.profile لعرض اسم المحامي واسم المكتب."),
      b("يدعم avatarFileId لعرض صورة المحامي."),
      b("يعرض صورة بجوار اسم المحامي في الترويسة (مخفية على الموبايل) وككرت جانبي ثابت عند التمرير على lg فأكبر."),
      b("يحتوي على أزرار 'طباعة' و'PDF' للتصدير/الطباعة."),
      b("لا يحتوي على أزرار تعديل للجمهور."),

      h2("9.2. src/pages/PortfolioAdmin.tsx (إدارة داخل لوحة التحكم)"),
      b("مسار: /portfolio/manage داخل AppShell ومحمية بـ RequirePermission perm=\"portfolio.edit\"."),
      b("يحرر كامل محتوى PortfolioContent مع تبويبات: الواجهة، النبذة، الخدمات، الخبرة، المسار، المؤهلات، القضايا، الآراء، المقالات، اللغات/العضويات."),
      b("قسم 'صورة المحامي ورأس الصفحة': رفع صورة عبر saveFile، معاينة AvatarPreview، حذف الصورة، وتحديث headerLawyer/headerFirm في settings.profile مباشرةً عند الحفظ."),
      b("يستخدم useLiveQuery لقراءة/متابعة البيانات، ويُحدث db.portfolio.put مع updatedAt عند الحفظ."),
      b("يسجل النشاط عبر logActivity عند التعديل."),

      h1("10. تصدير PDF والطباعة المباشرة"),
      h2("10.1. src/lib/pdf.ts"),
      p("يستخدم html2canvas لالتقاط عنصر HTML وتحويله لصورة، ثم jsPDF لإنشاء ملف PDF. يدعم orientation، header/footer حسب الحاجة. يتم تصدير عنصر محدد مثل #portfolio-print-area أو العنصر المراد طباعته/تصديره."),
      h2("10.2. src/lib/print.ts"),
      p("يفتح نافذة طباعة مع استنساخ العناصر والتنسيق المناسب للطباعة. يمكن تمرير عنوان، رأس، تذييل. يهدف للحفاظ على قابلية القراءة حتى في الوضع الليلي عبر نسخ طباعة منفصلة."),
      h2("10.3. ملاحظات عملية"),
      b("يفضل استخدام عنصر مخفي مخصص للطباعة/PDF عند الحاجة لتنسيق مختلف عن العرض العام."),
      b("تأكد من أن الألوان والخطوط مناسبة للورق الأبيض."),
      b("الأزرار مستقلة: واحد لـ PDF وآخر للطباعة كما هو مطبق في Portfolio.tsx."),

      h1("11. إضافة ميزة جديدة خطوة بخطوة"),
      p("اتبع هذا التسلسل حرفيًا لضمان عدم كسر البنية."),
      h2("11.1. التخطيط"),
      b("حدد الكيان/الميزة، الحقول، العلاقات، هل تحتاج صلاحية؟ هل تظهر في القائمة الجانبية؟ هل محمية؟"),
      h2("11.2. التطبيق العملي"),
      b("1) src/lib/types.ts: أضف Interface/Type للكيان الجديد (مثال: Invoice)."),
      b("2) src/lib/db.ts: أضف جدولاً جديدًا في AdalaDB مع stores إن وُجد بحث/فهرسة، أضف repo إن رغبت بنمط موحد."),
      b("3) src/lib/permissions.ts: أضف صلاحيات module.view/create/edit/delete حسب الحاجة وربطها بالأدوار."),
      b("4) src/pages/Invoices.tsx: أنشئ الصفحة مع الالتزام بنمط الصفحات الموجودة (PageHeader, PageBody, جداول، نماذج)."),
      b("5) src/App.tsx: أضف import للصفحة، وأضف Route داخل المسارات المحمية مع RequirePermission المناسب."),
      b("6) src/components/layout/AppShell.tsx: أضف عنصر في NAV مع path، icon، perm إن لزم الأمر."),
      b("7) src/lib/seed.ts (اختياري): أضف بيانات تجريبية إن كانت ضرورية لعرض أولي."),
      b("8) الفحص: npx tsc --noEmit ثم npm run dev واختبر الصلاحيات والروابط."),
      h2("11.3. نصائح"),
      b("خذ صفحة مشابهة جدًا للميزة المطلوبة وانسخ بنيتها وعدّلها."),
      b("استخدم useLiveQuery لربط Dexie بالـUI."),
      b("سجّل الأحداث الحساسة عبر logActivity عند التعديل/الحذف."),
      b("لا تنسَ دعم RTL والتجاوب."),

      h1("12. قواعد التطوير وأفضل الممارسات"),
      b("التزم بمسارات الاستيراد الموجودة (@/...)"),
      b("لا تعيد هيكلة المجلدات الكبرى دون مبرر قوي"),
      b("كل ميزة محمية بصلاحية يجب التحقق منها في Route + UI"),
      b("استخدم مكونات UI الموحدة من components/ui/primitives"),
      b("حافظ على فصل المسارات العامة (/portfolio, /login) عن المحمية"),
      b("عند العمل مع ملفات (upload) استخدم saveFile/getFile من db.ts"),
      b("كن حذرًا جدًا عند تعديل src/lib/seed.ts"),
      b("نفذ npx tsc --noEmit قبل بناء الإنتاج"),
      b("احترم نمط الكود الموجود: مسافات، تسمية، بنية المكونات"),

      h1("13. البناء، الفحص، والنشر"),
      h2("13.1. محليًا"),
      code("npx tsc --noEmit"),
      code("npm run build"),
      code("npm run preview"),
      h2("13.2. النشر"),
      p("ارفع محتوى مجلد dist/ فقط إلى الاستضافة. يجب إعداد SPA Fallback لإعادة جميع المسارات إلى index.html."),
      h2("13.3. إعدادات Fallback"),
      h3("Apache (.htaccess)"),
      code("RewriteEngine On"),
      code("RewriteBase /"),
      code("RewriteRule ^index\\.html$ - [L]"),
      code("RewriteCond %{REQUEST_FILENAME} !-f"),
      code("RewriteCond %{REQUEST_FILENAME} !-d"),
      code("RewriteRule . /index.html [L]"),
      h3("Nginx"),
      code("location / {"),
      code("  try_files $uri $uri/ /index.html;"),
      code("}"),
      h3("Netlify (_redirects)"),
      code("/*    /index.html   200"),
      h3("Vercel (vercel.json)"),
      code("{ \"rewrites\": [{ \"source\": \"/(.*)\", \"destination\": \"/index.html\" }] }"),

      h1("14. استكشاف الأخطاء الشائعة"),
      b("شاشة بيضاء عند الفتح: غالبًا مشكلة في seed.ts أو استيراد خاطئ. تحقق من main.tsx وseed.ts."),
      b("أخطاء TypeScript: ركّز على أول خطأ يظهر، غالبًا ما يسبب الباقي."),
      b("لا يمكن الوصول لصفحة: تحقق من RequireAuth/RequirePermission والصلاحية في permissions.ts"),
      b("القائمة الجانبية لا تظهر عنصر جديد: تحقق من الإضافة في AppShell.tsx وفلترة الصلاحية"),
      b("صورة البورتفوليو لا تظهر: تحقق من avatarFileId ووجود الملف في db.files"),
      b("IndexedDB يبدو فارغًا: افتح في تبويب Private/جهاز آخر يظهر فارغًا طبيعيًا، البيانات محلية."),
      b("404 على مسارات بعد الرفع: تذكّر إعداد SPA Fallback"),

      h1("15. ملحق سريع"),
      h2("15.1. ملفات حرجة"),
      b("src/App.tsx"),
      b("src/main.tsx"),
      b("src/state/AppProvider.tsx"),
      b("src/components/layout/AppShell.tsx"),
      b("src/lib/db.ts"),
      b("src/lib/seed.ts"),
      b("src/lib/permissions.ts"),
      b("src/lib/types.ts"),
      h2("15.2. أوامر سريعة"),
      code("npm run dev"),
      code("npx tsc --noEmit"),
      code("npm run build"),
      code("npm run preview"),
      h2("15.3. قائمة تحقق قبل النشر"),
      b("[ ] tsc --noEmit خالٍ من الأخطاء"),
      b("[ ] build ينجح بنجاح"),
      b("[ ] اختبار المسارات العامة: /portfolio, /login"),
      b("[ ] اختبار المسارات المحمية + الصلاحيات"),
      b("[ ] فحص البورتفوليو العام والتحرير"),
      b("[ ] فحص تصدير PDF والطباعة"),
      b("[ ] إعداد SPA Fallback جاهز"),
      new Paragraph({ text: "", spacing: { before: 500 } }),
      p("نهاية دليل المطور التقني – منصة عدالة"),
    ]
  }]
});

Packer.toBuffer(doc)
  .then((buffer) => {
    fs.writeFileSync(outPath, buffer);
    console.log("CREATED:" + outPath);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
