const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = require('docx');

const doc = new Document({
  sections: [{
    properties: {},
    children: [
      new Paragraph({ text: "", spacing: { after: 200 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "دليل المطور", bold: true, size: 56 })],
        spacing: { after: 200 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "مسار تطوير منصة عدالة خطوة بخطوة", size: 32 })],
        spacing: { after: 400 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "منصة عدالة لإدارة أعمال المحاماة", size: 24 })],
        spacing: { after: 100 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "الإصدار: 1.0 | أكتوبر 2026", size: 22 })],
        spacing: { after: 800 }
      }),
      new Paragraph({ text: "", pageBreakBefore: true }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "1. مقدمة", bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: "يهدف هذا الدليل إلى توثيق مسار تطوير منصة عدالة بشكل واضح ومنسّق، ليتمكن أي مطور من فهم البنية، وإضافة ميزات جديدة بشكل صحيح دون إتلاف ما هو موجود.", size: 24 })] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "2. نظرة عامة على المشروع", bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: "منصة عدالة نظام متكامل لإدارة أعمال المحاماة، يعمل بنمط Local-First باستخدام IndexedDB. يدعم إدارة القضايا، الموكلين، Agreements، الأتعاب، المهام، المواعيد، الوثائق، الأرشيف، المكتبة القانونية، وبورتفوليو عام احترافي.", size: 24 })] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "3. التقنيات المستخدمة", bold: true })] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "4. إعداد بيئة التطوير", bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: "المتطلبات: Node.js 18+، npm، محرر VS Code", size: 24 })] }),
      new Paragraph({ children: [new TextRun({ text: "npm install", font: "Courier New", size: 22 })] }),
      new Paragraph({ children: [new TextRun({ text: "npm run dev", font: "Courier New", size: 22 })] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "5. فهم هيكل المشروع", bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: "src/App.tsx - التوجيه الرئيسي", size: 24 })] }),
      new Paragraph({ children: [new TextRun({ text: "src/lib/ - الأدوات، db.ts، types.ts، seed.ts، pdf.ts، print.ts", size: 24 })] }),
      new Paragraph({ children: [new TextRun({ text: "src/pages/ - صفحات التطبيق", size: 24 })] }),
      new Paragraph({ children: [new TextRun({ text: "src/components/ - المكونات المشتركة", size: 24 })] }),
      new Paragraph({ children: [new TextRun({ text: "src/state/ - إدارة الجلسة", size: 24 })] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "6. نظام البيانات المحلي", bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: "يستخدم Dexie للتعامل مع IndexedDB. جميع الجداول معرفة في db.ts والأنواع في types.ts.", size: 24 })] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "7. المصادقة والصلاحيات", bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: "يتم التحقق عبر can(permission). صلاحية portfolio.edit للتحكم في البورتفوليو.", size: 24 })] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "8. التوجيه العام/المحمي", bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: "/portfolio عام للجميع. /portfolio/manage محمي داخل لوحة التحكم.", size: 24 })] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "9. البورتفوليو العام والتحكم فيه", bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: "يمكن رفع صورة المحامي من محرر البورتفوليو، وتظهر بجوار الاسم أو ككرت جانبي ثابت عند التمرير.", size: 24 })] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "10. تصدير PDF والطباعة", bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: "أزرار مستقلة، تعمل في الوضع الليلي مع حفظ قابلية القراءة.", size: 24 })] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "11. إضافة ميزة جديدة خطوة بخطوة", bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: "1. types.ts 2. db.ts 3. permissions.ts 4. صفحة جديدة 5. App.tsx Route 6. قائمة جانبية 7. فحص tsc", size: 24 })] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "12. البناء والنشر", bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: "npx tsc --noEmit", font: "Courier New", size: 22 })] }),
      new Paragraph({ children: [new TextRun({ text: "npm run build", font: "Courier New", size: 22 })] }),
      new Paragraph({ children: [new TextRun({ text: "رفع محتوى dist/ مع SPA fallback", size: 24 })] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "13. ملحق - بيانات الدخول", bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: "اسم المستخدم: admin / كلمة المرور: admin123", size: 24 })] }),
    ]
  }]
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(path.join(__dirname, "دليل المطور - مسار تطوير منصة عدالة خطوة بخطوة.docx"), buffer);
  console.log("done");
});
