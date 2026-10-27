import React, { useId } from "react";
import { cn } from "@/lib/cn";
import { Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* =============================================================
   عناصر الواجهة الأساسية — Justice UI Kit
   ============================================================= */

type BtnVariant = "primary" | "outline" | "soft" | "ghost" | "danger" | "gold" | "subtle";
type BtnSize = "xs" | "sm" | "md" | "lg";

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: "btn-primary",
  outline:
    "border border-line bg-surface text-ink hover:bg-surface-2 hover:border-accent/50 shadow-sm",
  soft: "bg-brand-soft text-brand-ink hover:brightness-105 border border-transparent",
  ghost: "text-ink-soft hover:bg-surface-2 hover:text-ink border border-transparent",
  danger: "bg-danger text-white hover:brightness-110 border border-transparent",
  gold: "bg-accent text-accent-ink hover:brightness-110 border border-transparent font-semibold",
  subtle: "bg-surface-2 text-ink-soft hover:bg-surface-3 border border-line",
};

const BTN_SIZE: Record<BtnSize, string> = {
  xs: "h-7 px-2.5 text-[12px] gap-1 rounded-lg",
  sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-xl",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[15px] gap-2.5 rounded-2xl",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  block?: boolean;
}

export function Button({
  variant = "outline",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  loading,
  block,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-200 select-none",
        "active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
        BTN_SIZE[size],
        BTN_VARIANT[variant],
        block && "w-full",
        className,
      )}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : Icon ? (
        <Icon className={cn(size === "xs" ? "size-3.5" : "size-4")} />
      ) : null}
      {children}
      {IconRight && !loading ? (
        <IconRight className={cn(size === "xs" ? "size-3.5" : "size-4")} />
      ) : null}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  label,
  size = "md",
  variant = "ghost",
  className,
  ...rest
}: Omit<ButtonProps, "children" | "icon"> & { icon: LucideIcon; label: string }) {
  const s = size === "xs" ? "size-7" : size === "sm" ? "size-9" : size === "lg" ? "size-12" : "size-10";
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-xl transition-all duration-200 active:scale-95",
        "disabled:opacity-50 disabled:pointer-events-none",
        s,
        BTN_VARIANT[variant],
        className,
      )}
    >
      <Icon className={size === "xs" ? "size-3.5" : "size-4"} />
    </button>
  );
}

/* ------------------------------ الحقول ------------------------------ */

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      {label && (
        <span className="flex items-center gap-1 text-[13px] font-medium text-ink-soft">
          {label}
          {required && <span className="text-danger">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="block text-[12px] text-danger">{error}</span>
      ) : hint ? (
        <span className="block text-[12px] text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className, invalid, ...rest }, ref) => (
  <input
    ref={ref}
    {...rest}
    className={cn("input-base", invalid && "border-danger focus:border-danger", className)}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, rows = 4, ...rest }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    {...rest}
    className={cn("input-base resize-y leading-relaxed", invalid && "border-danger", className)}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...rest }, ref) => (
  <select
    ref={ref}
    {...rest}
    className={cn("input-base appearance-none bg-no-repeat ltr:text-left", className)}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238b97b1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      backgroundPosition: "left 0.7rem center",
      backgroundSize: "16px",
      paddingInlineStart: "2rem",
    }}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-300",
          checked ? "bg-accent" : "bg-surface-3 border border-line",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4.5 rounded-full bg-white shadow transition-all duration-300",
            checked ? "start-0.5" : "start-5.5",
          )}
          style={{ width: 18, height: 18 }}
        />
      </button>
      {(label || description) && (
        <label htmlFor={id} className="cursor-pointer select-none">
          {label && <span className="block text-[13px] font-medium text-ink">{label}</span>}
          {description && <span className="block text-[12px] text-muted">{description}</span>}
        </label>
      )}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("inline-flex items-center gap-2 cursor-pointer select-none", className)}>
      <span
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
        className={cn(
          "flex size-[18px] items-center justify-center rounded-[6px] border transition-all",
          checked ? "bg-accent border-accent text-accent-ink" : "border-line bg-surface-2",
        )}
      >
        {checked && (
          <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3.5">
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label && <span className="text-[13px] text-ink-soft">{label}</span>}
    </label>
  );
}

/* ------------------------------ العرض ------------------------------ */

export type Tone = "default" | "ok" | "warn" | "danger" | "info" | "accent" | "muted";

const TONE: Record<Tone, string> = {
  default: "bg-surface-3 text-ink-soft border-line",
  ok: "bg-ok-soft text-ok border-ok/25",
  warn: "bg-warn-soft text-warn border-warn/25",
  danger: "bg-danger-soft text-danger border-danger/25",
  info: "bg-info-soft text-info border-info/25",
  accent: "bg-accent-soft text-accent border-accent/30",
  muted: "bg-surface-2 text-muted border-line",
};

export function Badge({
  children,
  tone = "default",
  icon: Icon,
  className,
  dot,
  style,
}: {
  children: React.ReactNode;
  tone?: Tone;
  icon?: LucideIcon;
  className?: string;
  dot?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <span className={cn("chip border", TONE[tone], className)} style={style}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  );
}

export function Avatar({
  name,
  color = "#B08419",
  size = 36,
  className,
  ring,
}: {
  name: string;
  color?: string;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  const ini = (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("");
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        ring && "ring-2 ring-accent/40 ring-offset-2 ring-offset-[var(--surface)]",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        fontSize: size * 0.36,
      }}
      aria-hidden
    >
      {ini}
    </span>
  );
}

export function Progress({
  value,
  tone = "accent",
  className,
  size = "md",
}: {
  value: number;
  tone?: "accent" | "ok" | "warn" | "danger" | "info";
  className?: string;
  size?: "sm" | "md";
}) {
  const colors: Record<string, string> = {
    accent: "var(--accent)",
    ok: "var(--ok)",
    warn: "var(--warn)",
    danger: "var(--danger)",
    info: "var(--info)",
  };
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-surface-3",
        size === "sm" ? "h-1" : "h-1.5",
        className,
      )}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: colors[tone] }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {Icon && (
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-line bg-surface-2 text-muted">
          <Icon className="size-6" />
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: LucideIcon }[];
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-line bg-surface-2 p-1",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg font-medium transition-all duration-200",
            size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-8 px-3 text-[13px]",
            value === o.value
              ? "bg-surface text-ink shadow-sm border border-line"
              : "text-muted hover:text-ink-soft border border-transparent",
          )}
        >
          {o.icon && <o.icon className="size-3.5" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  tabs: { value: T; label: string; count?: number; icon?: LucideIcon }[];
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-line", className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "relative inline-flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-[13px] font-medium transition-colors",
            value === t.value ? "text-accent" : "text-muted hover:text-ink-soft",
          )}
        >
          {t.icon && <t.icon className="size-4" />}
          {t.label}
          {t.count !== undefined && (
            <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
              {t.count}
            </span>
          )}
          {value === t.value && (
            <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
          )}
        </button>
      ))}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div>
        <h2 className="text-[17px] font-bold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

export function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full start-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2 py-1 text-[11px] text-ink-soft opacity-0 shadow-lg transition-opacity group-hover/tt:opacity-100 rtl:translate-x-1/2">
        {text}
      </span>
    </span>
  );
}

export function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  tone = "accent",
  trend,
  hint,
  onClick,
  className,
}: {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  icon?: LucideIcon;
  tone?: "accent" | "ok" | "warn" | "danger" | "info";
  trend?: { value: string; up?: boolean };
  hint?: string;
  onClick?: () => void;
  className?: string;
}) {
  const tones: Record<string, string> = {
    accent: "text-accent bg-accent-soft",
    ok: "text-ok bg-ok-soft",
    warn: "text-warn bg-warn-soft",
    danger: "text-danger bg-danger-soft",
    info: "text-info bg-info-soft",
  };
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "card card-hover flex items-center gap-4 p-4 text-start",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {Icon && (
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
          <Icon className="size-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] text-muted">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-[22px] font-bold leading-none text-ink">{value}</span>
          {suffix && <span className="text-[12px] text-muted">{suffix}</span>}
          {trend && (
            <span
              className={cn(
                "text-[11px] font-semibold",
                trend.up ? "text-ok" : "text-danger",
              )}
            >
              {trend.up ? "▲" : "▼"} {trend.value}
            </span>
          )}
        </div>
        {hint && <div className="mt-1 truncate text-[11px] text-faint">{hint}</div>}
      </div>
    </Comp>
  );
}
