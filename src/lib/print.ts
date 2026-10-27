/* =============================================================
   نظام الطباعة المباشر + تجهيز مناطق الالتقاط
   منفصل تمامًا عن تصدير PDF (انظر lib/pdf.ts)
   ============================================================= */

/** عرض المحتوى الفعلي لصفحة A4 عمودية مع هوامش 14 مم لكل جانب (بالبكسل عند 96dpi) */
export const PRINT_CONTENT_WIDTH = 688;

/** عرض المحتوى في صفحة A4 أفقية — 269 مم ≈ 1016 بكسل */
export const PRINT_CONTENT_WIDTH_LANDSCAPE = 1016;

/**
 * رموز النهار — تُطبَّق مؤقتًا على العنصر أثناء الالتقاط
 * حتى يبقى النص مقروءًا في الملف المصدَّر عند اختيار الوضع الليلي.
 */
const LIGHT_TOKENS: Record<string, string> = {
  "--bg": "#ffffff",
  "--bg-elev": "#ffffff",
  "--surface": "#ffffff",
  "--surface-2": "#f7f9fc",
  "--surface-3": "#eef2f8",
  "--line": "#d5dbe6",
  "--line-soft": "#e6eaf1",
  "--ink": "#0a1020",
  "--ink-soft": "#2b3448",
  "--muted": "#5b6579",
  "--faint": "#8b94a7",
  "--brand": "#14213c",
  "--brand-2": "#0c162b",
  "--brand-ink": "#ffffff",
  "--brand-soft": "#eaeef6",
  "--accent": "#b08419",
  "--accent-ink": "#ffffff",
  "--accent-soft": "#fdf6e3",
  "--accent-2": "#d4a92c",
  "--ok": "#0f8a5f",
  "--ok-soft": "#e6f6ef",
  "--warn": "#b3720a",
  "--warn-soft": "#fdf2e0",
  "--danger": "#c02b3a",
  "--danger-soft": "#fdecee",
  "--info": "#2563c9",
  "--info-soft": "#e8f0fd",
  "--shadow-soft": "none",
  "--shadow-lift": "none",
  "--shadow-pop": "none",
  "--glass": "#ffffff",
  "--hairline": "rgba(10, 16, 32, 0.07)",
};

/** يطبّق رموز النهار على عنصر (أو نسخة منه) ليبقى مقروءًا على ورق أبيض */
export function applyLightTokens(element: HTMLElement): void {
  for (const [k, v] of Object.entries(LIGHT_TOKENS)) element.style.setProperty(k, v);
}

/**
 * يزيل آثار الوضع الليلي من مستند مستنسَخ
 * (الـ iframe الداخلي الذي ينشئه html2canvas).
 */
export function forceLightDocument(doc: Document): void {
  const root = doc.documentElement;
  if (!root) return;
  root.removeAttribute("data-theme");
  root.style.colorScheme = "light";
}

function isHidden(element: HTMLElement): boolean {
  const view = element.ownerDocument?.defaultView;
  if (!view) return false;
  return view.getComputedStyle(element).display === "none";
}

/* ---------------------------------------------------------------
   تحويل الألوان الحديثة (oklab/lab/lch) إلى rgb
   مكتبة html2canvas لا تفهم دوال الألوان في CSS Level 4،
   وتُلقي استثناءً عند encountering قيمة oklab() في النمط المحسوب.
   --------------------------------------------------------------- */

const COLOR_PROPERTIES = [
  "color",
  "background-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
  "fill",
  "stroke",
];

const MODERN_COLOR = /oklab\(|lab\(|lch\(|color\(/i;
const SENTINEL = "#010203";

let colorContext: CanvasRenderingContext2D | null = null;

/** يحوّل قيمة لون حديثة إلى صيغة rgb قابلة للقراءة — أو null إن تعذّر */
function normalizeColor(value: string): string | null {
  if (!value || value === "none" || value === "currentcolor") return null;
  if (!MODERN_COLOR.test(value)) return null;
  if (!colorContext) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    colorContext = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!colorContext) return null;
  colorContext.clearRect(0, 0, 1, 1);
  colorContext.fillStyle = SENTINEL;
  colorContext.fillStyle = value;
  // تعذّر على المتصفح تحليل القيمة إن بقيت الشاهدة كما هي
  if (colorContext.fillStyle.toLowerCase() === SENTINEL) return null;
  colorContext.fillRect(0, 0, 1, 1);
  const data = colorContext.getImageData(0, 0, 1, 1).data;
  const alpha = Math.round((data[3] / 255) * 1000) / 1000;
  return `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${alpha})`;
}

/** يستبدل دوال الألوان الحديثة داخل قيمة مركّبة (ظلال، تدرّجات) */
function normalizeComposite(value: string): string {
  return value
    .replace(/ in (oklab|lab|lch|oklch)/gi, " in srgb")
    .replace(/[a-z-]+\([^()]*\)/gi, (match) => {
      if (/^(rgba?|hsla?)\(/i.test(match)) return match;
      return normalizeColor(match) ?? "rgba(0, 0, 0, 0)";
    });
}

/** يوحّد ألوان العنصر وشجرة أبنائه لتصبح قابلة للرسم */
function normalizeElementColors(root: HTMLElement): void {
  const view = root.ownerDocument?.defaultView;
  if (!view) return;
  const elements: HTMLElement[] = [root, ...root.querySelectorAll<HTMLElement>("*")];
  for (const element of elements) {
    const computed = view.getComputedStyle(element);
    for (const property of COLOR_PROPERTIES) {
      const value = computed.getPropertyValue(property);
      const fixed = normalizeColor(value);
      if (fixed) element.style.setProperty(property, fixed);
    }
    for (const property of ["box-shadow", "text-shadow", "background-image"]) {
      const value = computed.getPropertyValue(property);
      if (!value || value === "none") continue;
      if (!MODERN_COLOR.test(value)) continue;
      const fixed = normalizeComposite(value);
      if (fixed !== value) element.style.setProperty(property, fixed);
    }
  }
}


/**
 * يجهّز العنصر داخل المستند المستنسَخ ليكون قابلًا للالتقاط:
 * يكشفه إن كان مخفيًا، يفرض مقاس الصفحة، ويثبّته في زاوية الإطار.
 */
export function prepareCaptureTarget(target: HTMLElement, width = PRINT_CONTENT_WIDTH): void {
  target.classList.remove("hidden");
  target.removeAttribute("hidden");

  if (isHidden(target)) {
    // سلف مخفي يحجب منطقة الطباعة — نكشفه حتى تظهر
    let ancestor = target.parentElement;
    while (ancestor && ancestor !== target.ownerDocument.body && isHidden(ancestor)) {
      ancestor.classList.remove("hidden");
      ancestor.removeAttribute("hidden");
      ancestor = ancestor.parentElement;
    }
    if (isHidden(target)) target.style.display = "block";
  }

  target.style.position = "fixed";
  target.style.left = "0px";
  target.style.top = "0px";
  target.style.width = `${width}px`;
  target.style.maxWidth = "none";
  target.style.margin = "0";
  target.style.padding = "0";
  target.style.background = "#ffffff";
  target.style.opacity = "1";
  target.style.visibility = "visible";
  target.style.overflow = "visible";
  target.style.zIndex = "2147483647";
  applyLightTokens(target);

  // ألوان CSS Level 4 (oklab) لا يفهمها html2canvas — نوحّدها قبل الرسم
  normalizeElementColors(target);
}

export interface PrintOptions {
  header?: string;
  footer?: string;
  title?: string;
  /** ترويسة ثابتة على كل صفحة */
  repeatHeader?: boolean;
}

function ensureRoot(): HTMLElement {
  let root = document.getElementById("print-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "print-root";
    root.className = "print-root";
    document.body.appendChild(root);
  }
  return root;
}

export function printElement(element: HTMLElement, options: PrintOptions = {}): void {
  const root = ensureRoot();
  root.innerHTML = "";

  const header = options.header
    ? `<div class="print-only" style="border-bottom:1px solid #000;padding-bottom:6px;margin-bottom:14px;display:flex;justify-content:space-between;font-size:11px;">
         <span>${escapeHtml(options.header)}</span>
         <span>${escapeHtml(options.title ?? "")}</span>
       </div>`
    : "";

  const footer = options.footer
    ? `<div class="print-only" style="border-top:1px solid #000;padding-top:6px;margin-top:16px;font-size:10px;color:#333;">
         ${escapeHtml(options.footer)}
       </div>`
    : "";

  const clone = element.cloneNode(true) as HTMLElement;
  clone.classList.add("print-document");
  // منطقة الطباعة مخفية على الشاشة — نكشفها داخل حاوية الطباعة
  clone.classList.remove("hidden");
  delete clone.dataset.printCapture;
  applyLightTokens(clone);
  clone.style.background = "#ffffff";
  clone.style.color = "#000000";
  clone.style.boxShadow = "none";
  clone.style.border = "none";
  clone.style.padding = "0";
  clone.style.maxWidth = "none";
  clone.style.width = "100%";
  clone.style.position = "static";
  clone.style.left = "auto";
  clone.style.top = "auto";
  clone.style.opacity = "1";
  clone.style.pointerEvents = "none";

  root.innerHTML = header;
  root.appendChild(clone);
  root.appendChild(document.createElement("div")).innerHTML = footer;

  const cleanup = () => {
    root.innerHTML = "";
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  setTimeout(() => {
    window.print();
    setTimeout(cleanup, 1500);
  }, 120);
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
