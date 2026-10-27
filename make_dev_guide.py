#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

DOC_NAME = "دليل المطور - مسار تطوير منصة عدالة خطوة بخطوة.docx"
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(OUT_DIR, DOC_NAME)

doc = Document()

# Cover
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = title.add_run("دليل المطور")
run.bold = True
run.font.size = Pt(28)
run.font.name = 'Arial'

subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = subtitle.add_run("مسار تطوير منصة عدالة خطوة بخطوة")
run.font.size = Pt(18)

info = doc.add_paragraph()
info.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = info.add_run("\n\nمنصة عدالة لإدارة أعمال المحاماة\n\nالإصدار: 1.0\nالتاريخ: أكتوبر 2026")
run.font.size = Pt(12)

doc.add_page_break()

# Table of Contents
doc.add_heading("فهرس المحتويات", level=1)
toc_items = [
    "1. مقدمة", "2. نظرة عامة على المشروع", "3. التقنيات المستخدمة", "4. إعداد بيئة التطوير",
    "5. فهم هيكل المشروع", "6. نظام البيانات المحلي (IndexedDB + Dexie)", "7. نظام المصادقة والصلاحيات",
    "8. التوجيه والمسارات العامة/المحمية", "9. نظام البورتفوليو العام والتحكم فيه",
    "10. تصدير PDF والطباعة المباشرة", "11. إضافة ميزة جديدة خطوة بخطوة", "12. قواعد التطوير وأفضل الممارسات",
    "13. البناء، الفحص، والنشر", "14. استكشاف الأخطاء الشائعة", "15. خارطة طريق مقترحة للتطوير المستقبلي", "16. ملحق"
]
for item in toc_items:
    p = doc.add_paragraph(item, style='List Number')
doc.add_page_break()

# 1. مقدمة
doc.add_heading("1. مقدمة", level=1)
doc.add_paragraph("الغرض من هذا الدليل هو توثيق مسار تطوير منصة عدالة بشكل واضح ومنهجي، ليتمكن أي مطور من فهم المشروع، والاطلاع على بنيته، وإضافة ميزات جديدة دون كسر ما هو موجود.")
doc.add_paragraph("يُفترض أن القارئ على دراية بـ JavaScript/TypeScript وReact، مع رغبة في تطوير أو صيانة هذه المنصة.")

# 2. نظرة عامة
doc.add_heading("2. نظرة عامة على المشروع", level=1)
doc.add_paragraph("منصة عدالة هي نظام متكامل لإدارة أعمال المحاماة، يعمل بنمط Local-First باستخدام IndexedDB. يهدف إلى إدارة القضايا، الموكلين، الاتفاقيات، الأتعاب، المهام، المواعيد، الوثائق، الأرشيف، المكتبة القانونية، وبورتفوليو احترافي للمحامي.")
doc.add_heading("2.1. طبيعة العمل", level=2)
doc.add_paragraph("• جميع البيانات محفوظة محليًا في متصفح المستخدم عبر Dexie (IndexedDB).")
doc.add_paragraph("• قابلية التحويل إلى خادم مركزي مستقبلاً عبر نمط Repository.")
doc.add_paragraph("• يعمل دون اتصال في أغلب الوظائف بعد التحميل الأول.")

# 3. التقنيات
doc.add_heading("3. التقنيات المستخدمة", level=1)
table = doc.add_table(rows=1, cols=3)
table.style = 'Table Grid'
hdr_cells = table.rows[0].cells
hdr_cells[0].text = 'التقنية'
hdr_cells[1].text = 'الإصدار'
hdr_cells[2].text = 'الغرض'
techs = [
    ('Vite', '8.x', 'أداة البناء والتطوير السريع'),
    ('React', '19.x', 'مكتبة واجهة المستخدم'),
    ('TypeScript', '5.x', 'النوعية الثابتة'),
    ('Tailwind CSS', '4.x', 'التنسيق والتصميم'),
    ('React Router DOM', '7.x', 'التوجيه'),
    ('Dexie', 'latest', 'IndexedDB abstraction'),
    ('dexie-react-hooks', 'latest', 'ربط Dexie بالـReact'),
    ('lucide-react', 'latest', 'الأيقونات'),
    ('jspdf + html2canvas', 'latest', 'تصدير PDF'),
]
for name, ver, purpose in techs:
    row_cells = table.add_row().cells
    row_cells[0].text = name
    row_cells[1].text = ver
    row_cells[2].text = purpose

# 4. إعداد بيئة التطوير
doc.add_heading("4. إعداد بيئة التطوير", level=1)
doc.add_heading("4.1. المتطلبات", level=2)
doc.add_paragraph("• Node.js 18+ أو أحدث")
doc.add_paragraph("• npm أو pnpm")
doc.add_paragraph("• محرر مثل VS Code")
doc.add_heading("4.2. التثبيت والتشغيل", level=2)
p = doc.add_paragraph()
p.add_run("cd adala-platform\nnpm install\nnpm run dev\n").font.name = 'Courier New'

# 5. هيكل المشروع
doc.add_heading("5. فهم هيكل المشروع", level=1)
doc.add_paragraph("src/:")
doc.add_paragraph("├── App.tsx        // التوجيه الرئيسي وفصل المسارات العامة/المحمية", style='List Bullet')
doc.add_paragraph("├── main.tsx       // نقطة الدخول", style='List Bullet')
doc.add_paragraph("├── components/    // مكونات مشتركة", style='List Bullet')
doc.add_paragraph("├── pages/         // صفحات التطبيق", style='List Bullet')
doc.add_paragraph("├── lib/           // أدوات، db، types، pdf، print، permissions", style='List Bullet')
doc.add_paragraph("├── state/         // سياق التطبيق وإدارة الجلسة", style='List Bullet')
doc.add_paragraph("└── styles/        // ملفات CSS", style='List Bullet')

# 6. البيانات
doc.add_heading("6. نظام البيانات المحلي (IndexedDB + Dexie)", level=1)
doc.add_paragraph("• src/lib/types.ts: تعريفات الأنواع")
doc.add_paragraph("• src/lib/db.ts: تعريف قاعدة البيانات وجداولها ودوال مساعدة")
doc.add_paragraph("• src/lib/seed.ts: البيانات الأولية وضمان التهيئة")
doc.add_paragraph("يُفضل استخدام Repository Pattern عند إضافة مصادر بيانات جديدة.")

# 7. المصادقة والصلاحيات
doc.add_heading("7. نظام المصادقة والصلاحيات", level=1)
doc.add_paragraph("تُدار الجلسة عبر AppProvider مع حفظ في localStorage. تتحقق الصلاحيات عبر دالة can(permission) وRequirePermission.")
doc.add_paragraph("بيانات الدخول الافتراضية: admin / admin123")

# 8. التوجيه
doc.add_heading("8. التوجيه والمسارات العامة/المحمية", level=1)
doc.add_paragraph("المسارات العامة خارج RequireAuth: /login, /portfolio")
doc.add_paragraph("المسارات المحمية داخل AppShell وRequireAuth. يُحوّل غير المسجلين إلى /login.")
doc.add_paragraph("مسار البورتفوليو للتحرير: /portfolio/manage محمي بـ RequirePermission بصلاحية portfolio.edit")

# 9. البورتفوليو
doc.add_heading("9. نظام البورتفوليو العام والتحكم فيه", level=1)
doc.add_paragraph("• /portfolio: مفتوح للجميع لعرض البورتفوليو")
doc.add_paragraph("• /portfolio/manage: داخل لوحة التحكم، يتطلب صلاحية portfolio.edit")
doc.add_paragraph("• يمكن إضافة صورة المحامي وظهورها بجوار اسم المحامي أو ككرت جانبي ثابت عند التمرير")
doc.add_paragraph("• تعديل اسم المحامي واسم المكتب من محرر البورتفوليو يؤثر على البورتفوليو العام")

# 10. PDF والطباعة
doc.add_heading("10. تصدير PDF والطباعة المباشرة", level=1)
doc.add_paragraph("• يوجد زر مستقل لـ PDF وآخر للطباعة")
doc.add_paragraph("• تعمل الطباعة/التصدير في الوضع الليلي مع الحفاظ على قراءة واضحة")
doc.add_paragraph("• تستخدم html2canvas + jspdf للتصدير، وprintElement للطباعة")

# 11. إضافة ميزة
doc.add_heading("11. إضافة ميزة جديدة خطوة بخطوة", level=1)
doc.add_paragraph("1. تحليل المتطلبات وتحديد الجداول/الأنواع")
doc.add_paragraph("2. إضافة الأنواع في types.ts")
doc.add_paragraph("3. إضافة الجدول في db.ts")
doc.add_paragraph("4. إضافة الصلاحيات في permissions.ts")
doc.add_paragraph("5. إنشاء صفحة في pages/")
doc.add_paragraph("6. إضافة Route في App.tsx")
doc.add_paragraph("7. إضافة عنصر في القائمة الجانبية إن لزم الأمر")
doc.add_paragraph("8. اختبار وفحص TypeScript")

# 12. قواعد التطوير
doc.add_heading("12. قواعد التطوير وأفضل الممارسات", level=1)
doc.add_paragraph("• الالتزام بنمط المشروع وأسماء الملفات")
doc.add_paragraph("• دعم RTL كامل")
doc.add_paragraph("• استخدام الصلاحيات لكل إجراء حساس")
doc.add_paragraph("• عدم تعديل seed.ts إلا بحذر شديد")
doc.add_paragraph("• فحص tsc قبل البناء")

# 13. البناء والنشر
doc.add_heading("13. البناء، الفحص، والنشر", level=1)
p = doc.add_paragraph()
p.add_run("npx tsc --noEmit\nnpm run build\n").font.name = 'Courier New'
doc.add_paragraph("عند النشر على الاستضافة، ارفع محتوى dist/ فقط مع إعداد SPA fallback:")
doc.add_paragraph("• Apache: .htaccess مع RewriteRule")
doc.add_paragraph("• Nginx: try_files $uri $uri/ /index.html")
doc.add_paragraph("• Netlify/Vercel: _redirects / /* /index.html 200")

# 14. أخطاء شائعة
doc.add_heading("14. استكشاف الأخطاء الشائعة", level=1)
doc.add_paragraph("• خطأ في seed.ts: غالبًا بسبب ترميز أو تعديل خاطئ → استبدال بملف نظيف")
doc.add_paragraph("• IndexedDB فارغ: تحقق من ensureSeed()")
doc.add_paragraph("• مسارات محمية: تحقق من الصلاحية")

# 15. خارطة طريق
doc.add_heading("15. خارطة طريق مقترحة للتطوير المستقبلي", level=1)
doc.add_paragraph("• ربط API خلفي")
doc.add_paragraph("• مزامنة بين الأجهزة")
doc.add_paragraph("• نسخة احتياطية/استعادة")
doc.add_paragraph("• إشعارات متقدمة")
doc.add_paragraph("• تقارير PDF متقدمة")

# 16. ملحق
doc.add_heading("16. ملحق", level=1)
doc.add_heading("16.1. بيانات الدخول الافتراضية", level=2)
table2 = doc.add_table(rows=2, cols=3)
table2.style = 'Table Grid'
h = table2.rows[0].cells
h[0].text = 'المستخدم'
h[1].text = 'اسم المستخدم'
h[2].text = 'كلمة المرور'
r = table2.rows[1].cells
r[0].text = 'مدير النظام'
r[1].text = 'admin'
r[2].text = 'admin123'

doc.add_heading("16.2. أوامر سريعة", level=2)
p = doc.add_paragraph()
p.add_run("npm run dev\nnpx tsc --noEmit\nnpm run build\nnpm run preview\n").font.name = 'Courier New'

doc.save(OUT_PATH)
print(OUT_PATH)
