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
} = require("docx");

const outDir = __dirname;
const fileName = "دليل المطور التقني - مسار تطوير منصة عدالة خطوة بخطوة.docx";
const outPath = path.join(outDir, fileName);

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32 })],
  });
}

function p(text, bold = false, size = 24) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, bold, size })],
  });
}

function codeLine(text) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text, font: "Courier New", size: 20 })],
  });
}

function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 24 })],
  });
}

function subBullet(text) {
  return new Paragraph({
    bullet: { level: 1 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 23 })],
  });
}

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({ text: "", spacing: { after: 600 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "دليل المطور التقني", bold: true, size: 56 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [new TextRun({ text: "مسار تطوير منصة عدالة خطوة بخطوة", bold: true, size: 36 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 150 },
          children: [new TextRun({ text: "موجه خصيصاً للمطورين القادمين لصيانة وتطوير المنصة", size: 26 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [new TextRun({ text: "منصة عدالة لإدارة أعمال المحاماة", size: 26 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 150 },
          children: [new TextRun({ text: "الإصدار: 1.0", size: 24 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "تاريخ التوثيق: أكتوبر 2026", size: 24 })],
        }),
        new Paragraph({ text: "", pageBreakBefore: true }),

        // 1
        heading("1. هدف الدليل"),
        p("يهدف هذا الدليل إلى توثيق بنية منصة عدالة ومسار تطويرها خطوة بخطوة، بحيث يستطيع أي مطور جديد فهم المشروع بسرعة، والبدء في إضافة الميزات أو إصلاح الأخطاء دون المساس بالبنية الحالية."),
        p("هذا الدليل تقني بحت، ويشرح 'كيف' يعمل المشروع داخلياً، عكس دليل المستخدم الذي يشرح 'كيف' يستخدمه."),

        // 2
        heading("2. نظرة عامة على المشروع"),
        p("منصة عدالة هي نظام متكامل لإدارة أعمال المحاماة، يركز على تبسيط العمل اليومي للمكتب من خلال إدارة القضايا، الموكلين، الاتفاقيات، الأتعاب، المهام، المواعيد، الوثائق، الأرشيف، المكتبة القانونية، وبورتفوليو احترافي للمحامي."),
        heading("2.1. طبيعة العمل Local-First", HeadingLevel.HEADING_2),
        bullet("يتم حفظ جميع البيانات محلياً في متصفح المستخدم عبر IndexedDB وباستخدام مكتبة Dexie."),
        bullet("يعمل التطبيق بالكامل تقريباً دون الحاجة لخادم في الوقت الحالي."),
        bullet("تم اعتماد نمط Repository لسهولة التحويل إلى API خلفي مستقبلاً."),
        bullet("فصل واضح بين البيانات، المنطق، وواجهة المستخدم."),

        // 3
        heading("3. التقنيات المستخدمة"),
        bullet("Vite 8 - أداة البناء والتطوير السريع"),
        bullet("React 19 - بناء واجهات المستخدم"),
        bullet("TypeScript 5 - تقييد الأنواع وضمان سلامة الكود"),
        bullet("Tailwind CSS v4 - تنسيق سريع ومتجاوب مع دعم RTL"),
        bullet("React Router DOM v7 - التوجيه وإدارة المسارات"),
        bullet("Dexie / dexie-react-hooks - التعامل مع IndexedDB والتحديث التلقائي"),
        bullet("lucide-react - مكتبة الأيقونات"),
        bullet("jspdf + html2canvas - تصدير ملفات PDF"),
        bullet("date-fns / dayjs - معالجة التواريخ (حسب الاستخدام الفعلي)"),

        // 4
        heading("4. إعداد بيئة التطوير"),
        heading("4.1. المتطلبات", HeadingLevel.HEADING_2),
        bullet("Node.js الإصدار 18 أو أحدث"),
        bullet("npm (أو pnpm/yarn)"),
        bullet("Visual Studio Code أو أي محرر مناسب"),
        heading("4.2. خطوات التثبيت والتشغيل", HeadingLevel.HEADING_2),
        codeLine("cd adala-platform"),
        codeLine("npm install"),
        codeLine("npm run dev"),
        heading("4.3. أوامر مفيدة", HeadingLevel.HEADING_2),
        codeLine("npx tsc --noEmit   # فحص TypeScript بدون توليد ملفات"),
        codeLine("npm run build      # بناء نسخة الإنتاج"),
        codeLine("npm run preview    # معاينة النسخة المبنية محلياً"),

        // 5
        heading("5. هيكل المشروع بالتفصيل"),
        p("المسار الرئيسي: adala-platform/src/"),
        heading("5.1. الجذور", HeadingLevel.HEADING_2),
        bullet("App.tsx : تعريف جميع المسارات، فصل المسارات العامة عن المحمية، وتطبيق الحمايات حسب الصلاحيات."),
        bullet("main.tsx : نقطة الدخول، استدعاء ensureSeed() لتهيئة البيانات، وتسجيل Service Worker في الإنتاج."),
        bullet("index.css : متغيرات CSS، ثيمات Dark/Light، وأنماط مشتركة."),
        heading("5.2. المجلدات الرئيسية", HeadingLevel.HEADING_2),
        bullet("components/ : مكونات عامة قابلة لإعادة الاستخدام (Layout, UI Primitives, Common)."),
        subBullet("components/layout/AppShell.tsx : القالب الرئيسي للوحة التحكم، القائمة الجانبية، رأس الصفحة، دروار الجوال."),
        subBullet("components/ui/ : عناصر واجهة موحدة (Button, Input, Card, Tabs...)."),
        bullet("pages/ : صفحات كل وحدة (Clients, Matters, Portfolio, PortfolioAdmin, Login, ...)."),
        bullet("lib/ : الأدوات الأساسية."),
        subBullet("lib/types.ts : جميع أنواع TypeScript المركزية."),
        subBullet("lib/db.ts : تعريف قاعدة Dexie، الجداول، وRepository helpers."),
        subBullet("lib/seed.ts : بيانات أولية + دالة ensureSeed()."),
        subBullet("lib/permissions.ts : تعريف الصلاحيات وتوزيعها على الأدوار."),
        subBullet("lib/auth.ts : منطق المصادقة."),
        subBullet("lib/pdf.ts : منطق تصدير PDF."),
        subBullet("lib/print.ts : منطق الطباعة المباشرة."),
        bullet("state/ : إدارة الحالة العامة."),
        subBullet("state/AppProvider.tsx : جلسة المستخدم، الثيم، الإعدادات، دالة login/logout/can()."),
        bullet("hooks/ : هوكس مخصصة إن وجدت."),
        bullet("utils/ : دوال مساعدة عامة."),

        // 6
        heading("6. طبقة البيانات (types.ts / db.ts / seed.ts)"),
        heading("6.1. src/lib/types.ts", HeadingLevel.HEADING_2),
        p("يجب تعريف كل كيان جديد هنا كـ interface أو type صريح. أمثلة: User, Client, Matter, PortfolioContent وغيرها."),
        p("عند إضافة حقول جديدة للكيانات الموجودة، تأكد من تحديث الاستخدامات في المشروع."),
        heading("6.2. src/lib/db.ts", HeadingLevel.HEADING_2),
        bullet("يُعرف كلاس AdalaDB يرث من Dexie ويحدد الجداول والـschema."),
        bullet("يتم تصدير instance واحد: export const db = new AdalaDB()"),
        bullet("يفضل استخدام نمط Repository لتفادي تكرار استدعاءات db مباشرة في أماكن كثيرة مستقبلاً."),
        heading("6.3. src/lib/seed.ts", HeadingLevel.HEADING_2),
        bullet("يحتوي على بيانات افتراضية لضمان تشغيل التطبيق لأول مرة."),
        bullet("دالة ensureSeed() تتحقق من وجود مستخدمين، وإذا لم يوجد تُضيف البيانات الأولية داخل db.transaction."),
        p("تنبيه: الحذر عند تعديل seed.ts، أي خطأ في ترميزه أو بناءه سيمنع فتح التطبيق."),

        // 7
        heading("7. المصادقة، الجلسة، والصلاحيات"),
        heading("7.1. الجلسة", HeadingLevel.HEADING_2),
        p("تتم إدارة الجلسة عبر AppProvider.tsx. يتم حفظ حالة الجلسة في localStorage مع التحقق من صلاحية المستخدم عند التحميل."),
        heading("7.2. الصلاحيات", HeadingLevel.HEADING_2),
        p("يتم تعريف جميع الصلاحيات في src/lib/permissions.ts، مع ربط كل دور (role) بمجموعة صلاحيات."),
        bullet("دالة can(permission: string): boolean تستخدم للتحقق داخل المكونات."),
        bullet("مكون RequirePermission يُستخدم لحماية المسارات/الأقسام حسب الصلاحية."),
        heading("7.3. بيانات الدخول الافتراضية", HeadingLevel.HEADING_2),
        codeLine("اسم المستخدم: admin"),
        codeLine("كلمة المرور: admin123"),

        // 8
        heading("8. التوجيه والمسارات العامة / المحمية"),
        heading("8.1. الفكرة العامة", HeadingLevel.HEADING_2),
        p("في src/App.tsx يتم فصل المسارات إلى مجموعتين:"),
        bullet("مسارات عامة: لا تحتاج تسجيل دخول (مثال: /login، /portfolio)"),
        bullet("مسارات محمية: تحتاج جلسة صالحة، وتكون داخل AppShell، وبعضها محمي بصلاحية إضافية عبر RequirePermission"),
        heading("8.2. قواعد هامة", HeadingLevel.HEADING_2),
        bullet("المسار هو الفاصل الحقيقي بين عام ومحمي، وليس وجود جلسة فقط."),
        bullet("عند فتح /portfolio مباشرة لا يؤثر على جلسة طاقم المكتب."),
        bullet("أي مسار داخل AppShell يعتبر محمياً ما لم يُستثنى صراحةً."),

        // 9
        heading("9. نظام البورتفوليو العام والتحكم فيه"),
        heading("9.1. العرض العام", HeadingLevel.HEADING_2),
        p("المسار: /portfolio"),
        bullet("مفتوح للجميع بدون تسجيل دخول."),
        bullet("يقرأ بيانات البورتفوليو من db.portfolio وجداول الإعدادات لعرض اسم المحامي واسم المكتب."),
        bullet("يعرض صورة المحامي إما بجوار اسم المحامي في الترويسة، أو ككرت جانبي ثابت عند التمرير على الشاشات الكبيرة."),
        heading("9.2. التحرير من لوحة التحكم", HeadingLevel.HEADING_2),
        p("المسار: /portfolio/manage داخل AppShell"),
        bullet("محمي بـ RequirePermission ويحتاج صلاحية portfolio.edit"),
        bullet("يتم تحرير المحتوى كاملًا من صفحات PortfolioAdmin.tsx"),
        bullet("يمكن رفع صورة المحامي، استبدالها، أو حذفها من تبويب 'الواجهة'"),
        bullet("تعديل 'اسم المحامي الظاهر' و'اسم المكتب' يحدّث settings.profile ويظهر مباشرةً في /portfolio"),
        bullet("لا تظهر أزرار التعديل للجمهور أبداً على /portfolio"),

        // 10
        heading("10. تصدير PDF والطباعة المباشرة"),
        heading("10.1. ملفات المعنية", HeadingLevel.HEADING_2),
        bullet("src/lib/pdf.ts : دالة downloadPdf تستخدم html2canvas لالتقاط العنصر وتحويله لصورة ثم تضمينه في jsPDF"),
        bullet("src/lib/print.ts : دالة printElement لفتح نافذة طباعة مع تنسيق مناسب"),
        heading("10.2. ملاحظات مهمة", HeadingLevel.HEADING_2),
        bullet("يوجد زر مستقل لـ 'PDF' وآخر لـ 'طباعة'."),
        bullet("يجب أن تعمل الطباعة والتصدير بشكل مقروء في الوضع الليلي (يتم استخدام نسخة طباعة مخصصة غالباً أو تنسيقات مناسبة)."),
        bullet("يتم استهداف عنصر محدد بالـid مثل portfolio-print-area عند الحاجة لنسخة طباعة منفصلة."),

        // 11
        heading("11. إضافة ميزة جديدة خطوة بخطوة (مثال عملي)"),
        p("لنفترض أننا نريد إضافة ميزة 'التقارير' أو أي وحدة جديدة. اتبع هذا التسلسل دائماً:"),
        heading("11.1. الخطوات", HeadingLevel.HEADING_2),
        bullet("الخطوة 1: تحليل الاحتياج – حدد الحقول، العلاقات، الصلاحيات اللازمة."),
        bullet("الخطوة 2: إضافة الأنواع – أضف interface للكيان في src/lib/types.ts"),
        bullet("الخطوة 3: تحديث قاعدة البيانات – أضف الجدول في src/lib/db.ts مع تحديث schema إن لزم الأمر"),
        bullet("الخطوة 4: إضافة الصلاحيات – أضف صلاحيات جديدة في src/lib/permissions.ts وربطها بالأدوار المناسبة"),
        bullet("الخطوة 5: إنشاء الصفحة – أنشئ ملفاً في src/pages/ExamplePage.tsx مع الالتزام بنمط الصفحات الموجودة"),
        bullet("الخطوة 6: إضافة المسار – أضف Route في src/App.tsx، وطبق RequireAuth و/أو RequirePermission حسب الحاجة"),
        bullet("الخطوة 7: إضافة للقائمة الجانبية – عدّل src/components/layout/AppShell.tsx لإضافة العنصر مع فلترة حسب الصلاحية"),
        bullet("الخطوة 8: التحقق – شغّل npx tsc --noEmit ثم اختبر المسار والصلاحيات"),
        heading("11.2. نصيحة سريعة", HeadingLevel.HEADING_2),
        p("اقرأ صفحة موجودة مشابهة للميزة المراد إضافتها، وانسخ النمط ثم عدّله. هذا أسرع وأضمن من الكتابة من الصفر."),

        // 12
        heading("12. إضافة صلاحية جديدة"),
        bullet("أضف اسم الصلاحية في src/lib/permissions.ts داخل قائمة الصلاحيات المتاحة."),
        bullet("أضفها إلى مصفوفة الصلاحيات لكل دور يحتاجها (admin غالباً يحصل على كل الصلاحيات)."),
        bullet("استخدم can('permission.name') في المكونات، أو RequirePermission في Routes."),
        bullet("يفضل استخدام أسماء واضحة بصيغة module.action مثل: portfolio.edit, clients.delete"),

        // 13
        heading("13. العمل مع IndexedDB وDexie"),
        heading("13.1. الاستعلام مع useLiveQuery", HeadingLevel.HEADING_2),
        codeLine("import { useLiveQuery } from 'dexie-react-hooks'"),
        codeLine("import { db } from '@/lib/db'"),
        codeLine("const items = useLiveQuery(() => db.clients.toArray(), [])"),
        heading("13.2. الإضافة/التحديث/الحذف", HeadingLevel.HEADING_2),
        bullet("إضافة: await db.table.add(item)"),
        bullet("تحديث أو إضافة: await db.table.put(item)"),
        bullet("حذف: await db.table.delete(id)"),
        bullet("معاملات: استخدم db.transaction('rw', [tables...], async () => {...}) عند عمليات متعددة مرتبطة"),
        heading("13.3. ملاحظات", HeadingLevel.HEADING_2),
        bullet("استخدم useLiveQuery لعرض البيانات المحدثة تلقائياً."),
        bullet("تفادي الاستعلامات الثقيلة داخل render دون داعٍ."),
        bullet("البيانات محلية، لذا الاختبار على متصفح مختلف يظهر قاعدة بيانات فارغة ما لم تُنسخ."),

        // 14
        heading("14. البناء، الفحص، والنشر"),
        heading("14.1. فحص الكود قبل البناء", HeadingLevel.HEADING_2),
        codeLine("npx tsc --noEmit"),
        heading("14.2. بناء المشروع", HeadingLevel.HEADING_2),
        codeLine("npm run build"),
        p("سيتم إنشاء مجلد dist/ يحتوي على ملفات جاهزة للنشر."),
        heading("14.3. إعداد SPA Fallback عند الرفع", HeadingLevel.HEADING_2),
        p("نظرًا لاستخدام React Router، يجب إعادة توجيه جميع الطلبات إلى index.html."),
        heading("Apache (.htaccess)", HeadingLevel.HEADING_3),
        codeLine("RewriteEngine On"),
        codeLine("RewriteBase /"),
        codeLine("RewriteRule ^index\\.html$ - [L]"),
        codeLine("RewriteCond %{REQUEST_FILENAME} !-f"),
        codeLine("RewriteCond %{REQUEST_FILENAME} !-d"),
        codeLine("RewriteRule . /index.html [L]"),
        heading("Nginx", HeadingLevel.HEADING_3),
        codeLine("try_files $uri $uri/ /index.html;"),
        heading("Netlify / Vercel", HeadingLevel.HEADING_3),
        codeLine("_redirects: /*    /index.html   200"),
        p("ارفع محتوى مجلد dist/ فقط، وليس ملفات المشروع كاملة."),

        // 15
        heading("15. قواعد التطوير وأفضل الممارسات"),
        bullet("التزم بالبنية الحالية ولا تعيد تنظيم المجلدات بدون ضرورة."),
        bullet("استخدم مسارات @/ عبر alias الموجود."),
        bullet("دعم كامل للـRTL، خاصةً في المسافات، المحاذاة، وأيقونات الاتجاه."),
        bullet("احترم نظام الصلاحيات في كل إجراء حساس (إنشاء/تعديل/حذف)."),
        bullet("لا تعدّل src/lib/seed.ts إلا إذا كنت تعرف تأثيره تمامًا."),
        bullet("حافظ على اتساق الألوان، المسافات، والمكونات مع ما هو موجود."),
        bullet("قبل كل بناء نفذ tsc للتأكد من خلو الأخطاء."),
        bullet("عند إضافة أي ميزة للمسارات العامة مثل /portfolio تأكد من عدم كسر حماية لوحة التحكم."),
        bullet("استخدم مكونات UI الموحدة بدلاً من إنشاء عناصر مكررة."),

        // 16
        heading("16. استكشاف الأخطاء الشائعة"),
        bullet("التطبيق لا يفتح / شاشة بيضاء: غالبًا خطأ في seed.ts. تأكد من أن الملف صحيح وخالٍ من رموز غريبة."),
        bullet("أخطاء TypeScript بعد التعديل: شغّل npx tsc --noEmit واقرأ الأخطاء من أعلى لأسفل."),
        bullet("صلاحية مفقودة: تحقق من وجود الصلاحية في permissions.ts وربطها بالدور."),
        bullet("صورة البورتفوليو لا تظهر: تأكد من حفظ avatarFileId في portfolio وأن الملف موجود في db.files."),
        bullet("مسار محمي يفتح للجميع: تحقق من وضع RequireAuth/RequirePermission في App.tsx."),
        bullet("بيانات فارغة بعد الفتح: تحقق من عمل ensureSeed() في main.tsx."),

        // 17
        heading("17. ملحق"),
        heading("17.1. ملفات حرجة لا تلمسها إلا بحذر", HeadingLevel.HEADING_2),
        bullet("src/App.tsx"),
        bullet("src/main.tsx"),
        bullet("src/state/AppProvider.tsx"),
        bullet("src/lib/db.ts"),
        bullet("src/lib/seed.ts"),
        bullet("src/lib/permissions.ts"),
        bullet("src/components/layout/AppShell.tsx"),
        heading("17.2. بيانات الدخول الافتراضية", HeadingLevel.HEADING_2),
        codeLine("المستخدم: admin"),
        codeLine("كلمة المرور: admin123"),
        heading("17.3. قائمة تحقق سريعة قبل أي PR/نشر", HeadingLevel.HEADING_2),
        bullet("[ ] يمر npx tsc --noEmit بدون أخطاء"),
        bullet("[ ] npm run build ينجح"),
        bullet("[ ] تم اختبار المسارات العامة والمحمية"),
        bullet("[ ] تم تطبيق الصلاحيات إن وجدت"),
        bullet("[ ] تم الحفاظ على دعم RTL والتجاوب"),
        bullet("[ ] لا توجد كائنات أو متغيرات غير مستخدمة تسبب تحذيرات مزعجة"),
        bullet("[ ] إعداد SPA Fallback جاهز للنشر"),
        new Paragraph({ text: "", spacing: { before: 400 } }),
        p("نهاية الدليل التقني – منصة عدالة", true, 26),
      ],
    },
  ],
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
