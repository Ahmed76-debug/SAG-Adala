import { useId, useState } from "react";
import { cn } from "@/lib/cn";

/* =============================================================
   رسوم بيانية SVG خفيفة — بدون مكتبات خارجية
   ============================================================= */

export interface Slice {
  /** معرّف اختياري يضمن تفرّد المفاتيح حتى لو تكرّر الاسم المعروض */
  id?: string;
  label: string;
  value: number;
  color: string;
}

/** مفتاح React آمن لكل شريحة */
const sliceKey = (d: Slice, i: number) => d.id ?? (d.label + "#" + i);

export function DonutChart({
  data,
  size = 168,
  thickness = 20,
  centerLabel,
  centerValue,
  className,
}: {
  data: Slice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className={cn("flex flex-wrap items-center gap-5", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--surface-3)"
            strokeWidth={thickness}
          />
          {data.map((d, i) => {
            const len = (d.value / total) * c;
            const el = (
              <circle
                key={sliceKey(d, i)}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={hover === i ? thickness + 4 : thickness}
                strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                className="cursor-pointer transition-all duration-300"
                opacity={hover === null || hover === i ? 1 : 0.35}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[22px] font-bold leading-none text-ink">
            {hover !== null ? data[hover].value : (centerValue ?? total)}
          </span>
          <span className="mt-1 max-w-[90px] text-center text-[10.5px] leading-tight text-muted">
            {hover !== null ? data[hover].label : (centerLabel ?? "الإجمالي")}
          </span>
        </div>
      </div>
      <div className="min-w-[140px] flex-1 space-y-1.5">
        {data.map((d, i) => (
          <div
            key={sliceKey(d, i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-1.5 py-1 text-[12px] transition-colors",
              hover === i && "bg-surface-2",
            )}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="min-w-0 flex-1 truncate text-ink-soft">{d.label}</span>
            <span className="num shrink-0 font-semibold text-ink">{d.value}</span>
            <span className="num w-10 shrink-0 text-end text-[11px] text-muted">
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarChart({
  data,
  height = 180,
  className,
  valueFormatter,
}: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  className?: string;
  valueFormatter?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => (
          <div
            key={d.label + "#" + i}
            className="group relative flex h-full flex-1 flex-col justify-end"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            {hover === i && (
              <div className="pointer-events-none absolute -top-1 z-10 start-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-semibold text-ink shadow-lg">
                {valueFormatter ? valueFormatter(d.value) : d.value}
                <span className="ms-1 font-normal text-muted">· {d.label}</span>
              </div>
            )}
            <div
              className="w-full rounded-t-md transition-all duration-500"
              style={{
                height: `${Math.max(2, (d.value / max) * 100)}%`,
                background: d.color ?? "var(--accent)",
                opacity: hover === null || hover === i ? 0.9 : 0.4,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        {data.map((d, i) => (
          <div key={d.label + "#" + i} className="flex-1 truncate text-center text-[10.5px] text-muted">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AreaChart({
  data,
  height = 190,
  color = "var(--accent)",
  className,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  className?: string;
}) {
  const gid = useId().replace(/:/g, "");
  const w = 600;
  const h = 180;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;

  const pts = data.map((d, i) => {
    const x = (i / Math.max(1, data.length - 1)) * w;
    const y = h - ((d.value - min) / range) * (h - 24) - 12;
    return { x, y, ...d };
  });

  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height, width: "100%" }}>
        <defs>
          <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#g${gid})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--surface)" stroke={color} strokeWidth="2" />
        ))}
      </svg>
      <div className="mt-1 flex">
        {data.map((d, i) => (
          <div key={d.label + "#" + i} className="flex-1 truncate text-center text-[10px] text-muted">
            {i % 2 === 0 || data.length <= 8 ? d.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HBarList({
  data,
  className,
  valueFormatter,
}: {
  data: Slice[];
  className?: string;
  valueFormatter?: (v: number) => string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className={cn("space-y-2.5", className)}>
      {data.map((d, i) => (
        <div key={sliceKey(d, i)}>
          <div className="mb-1 flex items-center justify-between text-[12px]">
            <span className="truncate text-ink-soft">{d.label}</span>
            <span className="num font-semibold text-ink">
              {valueFormatter ? valueFormatter(d.value) : d.value}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(d.value / total) * 100}%`, background: d.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MiniSpark({ data, color = "var(--accent)" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * 100;
    const y = 28 - ((v - min) / range) * 24 - 2;
    return `${x},${y}`;
  });
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-full">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
