import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { Options as CaptureOptions } from "html2canvas";
import {
  PRINT_CONTENT_WIDTH,
  PRINT_CONTENT_WIDTH_LANDSCAPE,
  forceLightDocument,
  prepareCaptureTarget,
} from "./print";

/* =============================================================
   نظام تصدير PDF — مستقل تمامًا عن نظام الطباعة
   يرسم العنصر ثم يبني ملف PDF متعدد الصفحات (A4)
   ============================================================= */

export interface PdfOptions {
  filename?: string;
  orientation?: "portrait" | "landscape";
  header?: string;
  footer?: string;
  marginTop?: number;
  marginBottom?: number;
  marginSide?: number;
  /** ملاءمة المحتوى في صفحة واحدة */
  fitToSinglePage?: boolean;
  quality?: number;
  /** عرض الالتقاط بالبكسل — يُحسب تلقائيًا حسب اتجاه الصفحة */
  width?: number;
  onProgress?: (pct: number) => void;
}

const A4 = { w: 210, h: 297 };

export async function exportElementToPdf(
  element: HTMLElement,
  options: PdfOptions = {},
): Promise<jsPDF> {
  const {
    orientation = "portrait",
    header,
    footer,
    marginTop = 16,
    marginBottom = 16,
    marginSide = 14,
    fitToSinglePage = false,
    quality = 0.96,
    onProgress,
  } = options;

  const captureWidth =
    options.width ?? (orientation === "landscape" ? PRINT_CONTENT_WIDTH_LANDSCAPE : PRINT_CONTENT_WIDTH);

  onProgress?.(10);
  if (document.fonts?.ready) await document.fonts.ready;

  /* ---------------------------------------------------------------
     html2canvas يقرأ إحداثيات القص بعد استنساخ المستند،
     لذلك نضبطها من داخل onclone حسب القياس الفعلي للنسخة.
     --------------------------------------------------------------- */
  const capture: Partial<CaptureOptions> = {
    backgroundColor: "#ffffff",
    useCORS: true,
    allowTaint: false,
    logging: false,
    scale: Math.min(2, (window.devicePixelRatio || 1) * 1.5),
    scrollX: 0,
    scrollY: 0,
    windowWidth: Math.max(window.innerWidth || 1024, captureWidth),
    windowHeight: Math.max(window.innerHeight || 768, 600),
    x: 0,
    y: 0,
    width: captureWidth,
    height: 600,
    onclone: (doc, cloned) => {
      forceLightDocument(doc);
      prepareCaptureTarget(cloned, captureWidth);
      const rect = cloned.getBoundingClientRect();
      capture.x = rect.left;
      capture.y = rect.top;
      capture.width = Math.max(1, Math.round(rect.width));
      capture.height = Math.max(1, Math.round(rect.height));
    },
  };

  const canvas = await html2canvas(element, capture);
  onProgress?.(45);

  const pageW = (orientation === "portrait" ? A4.w : A4.h) - marginSide * 2;
  const pageH = (orientation === "portrait" ? A4.h : A4.w) - marginTop - marginBottom;

  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const imgW = pageW;
  const scale = imgW / canvas.width;
  const fullH = canvas.height * scale;

  const drawHeaderFooter = (pageIndex: number, total: number) => {
    if (header) {
      pdf.setFontSize(9);
      pdf.setTextColor(120);
      pdf.text(header, pageW + marginSide, marginTop - 5, { align: "right" });
    }
    if (footer) {
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(footer, marginSide, A4.h - marginBottom + 8, { align: "left" });
      pdf.text(`صفحة ${pageIndex + 1} من ${total}`, pageW + marginSide, A4.h - marginBottom + 8, {
        align: "right",
      });
    }
  };

  if (fitToSinglePage || fullH <= pageH) {
    const factor = fitToSinglePage && fullH > pageH ? pageH / fullH : 1;
    const w = imgW * factor;
    const h = fullH * factor;
    const x = marginSide + (imgW - w) / 2;
    pdf.addImage(canvas.toDataURL("image/jpeg", quality), "JPEG", x, marginTop, w, h, undefined, "FAST");
    drawHeaderFooter(0, 1);
  } else {
    const slicePx = Math.floor(pageH / scale);
    const total = Math.ceil(canvas.height / slicePx);
    const sliceCanvas = document.createElement("canvas");
    const sctx = sliceCanvas.getContext("2d")!;

    for (let i = 0; i < total; i++) {
      const y = i * slicePx;
      const h = Math.min(slicePx, canvas.height - y);
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = h;
      sctx.fillStyle = "#ffffff";
      sctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      sctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, sliceCanvas.width, h);
      if (i > 0) pdf.addPage();
      pdf.addImage(
        sliceCanvas.toDataURL("image/jpeg", quality),
        "JPEG",
        marginSide,
        marginTop,
        imgW,
        h * scale,
        undefined,
        "FAST",
      );
      drawHeaderFooter(i, total);
      onProgress?.(45 + Math.round((i / total) * 45));
    }
  }

  onProgress?.(100);
  return pdf;
}

export async function downloadPdf(
  element: HTMLElement,
  filename: string,
  options: PdfOptions = {},
): Promise<void> {
  const pdf = await exportElementToPdf(element, { ...options, filename });
  const safe = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  pdf.save(safe);
}

/**
 * يصدّر منطقة طباعة مُعرَّفة بالمعرّف إلى ملف PDF.
 * يعيد true عند النجاح و false عند الفشل — لتيسير عرض رسالة مناسبة.
 */
export async function exportPrintArea(
  elementId: string,
  filename: string,
  options: PdfOptions = {},
): Promise<boolean> {
  const el = document.getElementById(elementId);
  if (!el) return false;
  try {
    await downloadPdf(el, filename, options);
    return true;
  } catch {
    return false;
  }
}

/** التاريخ الحالي بصيغة آمنة لأسماء الملفات */
export function fileDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ------------------------------ تصدير CSV ------------------------------ */

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
