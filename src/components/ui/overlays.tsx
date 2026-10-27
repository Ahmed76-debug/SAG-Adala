import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, AlertTriangle, Info, XCircle, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, IconButton } from "./primitives";

/* =============================================================
   الطبقات: Toast · Modal · Drawer · Confirm
   ============================================================= */

type ToastTone = "success" | "error" | "info" | "warning";
interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  duration: number;
}

interface ToastCtx {
  toast: (t: { title: string; description?: string; tone?: ToastTone; duration?: number }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast خارج ToastProvider");
  return c;
}

const TOAST_ICON: Record<ToastTone, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: TriangleAlert,
};

const TOAST_STYLE: Record<ToastTone, string> = {
  success: "text-ok",
  error: "text-danger",
  info: "text-info",
  warning: "text-warn",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, number>>({});

  const remove = useCallback((id: string) => {
    setItems((p) => p.filter((i) => i.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const toast = useCallback<ToastCtx["toast"]>(
    ({ title, description, tone = "info", duration = 4000 }) => {
      const id = Math.random().toString(36).slice(2);
      setItems((p) => [...p.slice(-4), { id, title, description, tone, duration }]);
      timers.current[id] = window.setTimeout(() => remove(id), duration);
    },
    [remove],
  );

  useEffect(() => {
    const t = timers.current;
    return () => Object.values(t).forEach((x) => clearTimeout(x));
  }, []);

  const value = useMemo<ToastCtx>(
    () => ({
      toast,
      success: (title, description) => toast({ title, description, tone: "success" }),
      error: (title, description) => toast({ title, description, tone: "error" }),
      info: (title, description) => toast({ title, description, tone: "info" }),
    }),
    [toast],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {createPortal(
        <div className="no-print pointer-events-none fixed bottom-5 end-5 z-[100] flex w-[calc(100vw-2.5rem)] max-w-[380px] flex-col gap-2.5">
          {items.map((i) => {
            const Icon = TOAST_ICON[i.tone];
            return (
              <div
                key={i.id}
                className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-[var(--shadow-pop)] animate-slide-up"
              >
                <Icon className={cn("mt-0.5 size-5 shrink-0", TOAST_STYLE[i.tone])} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-ink">{i.title}</div>
                  {i.description && (
                    <div className="mt-0.5 text-[12px] leading-relaxed text-muted">{i.description}</div>
                  )}
                </div>
                <IconButton
                  icon={X}
                  label="إغلاق"
                  size="xs"
                  onClick={() => remove(i.id)}
                  className="-me-1 -mt-1"
                />
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </Ctx.Provider>
  );
}

/* ------------------------------ Modal ------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  icon,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  icon?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const sizes = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
    full: "max-w-[96vw]",
  };

  return createPortal(
    <div className="no-print fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden border border-line bg-surface shadow-[var(--shadow-pop)] animate-scale-in",
          "rounded-t-3xl sm:rounded-3xl",
          sizes[size],
        )}
      >
        {(title || description) && (
          <div className="flex items-start gap-3 border-b border-line px-5 py-4">
            {icon}
            <div className="min-w-0 flex-1">
              {title && <h3 className="text-[16px] font-bold text-ink">{title}</h3>}
              {description && <p className="mt-0.5 text-[12.5px] text-muted">{description}</p>}
            </div>
            <IconButton icon={X} label="إغلاق" size="sm" onClick={onClose} className="-me-1" />
          </div>
        )}
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------ Drawer ------------------------------ */

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "md",
  icon,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
  icon?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" };

  return createPortal(
    <div className="no-print fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <aside
        className={cn(
          "absolute inset-y-0 end-0 flex w-full flex-col border-s border-line bg-surface shadow-[var(--shadow-pop)] animate-[slide-in-end_.28s_cubic-bezier(.22,1,.36,1)]",
          widths[width],
        )}
        style={{ animationName: "slide-in-end" }}
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          {icon}
          <div className="min-w-0 flex-1">
            {title && <h3 className="truncate text-[16px] font-bold text-ink">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>}
          </div>
          <IconButton icon={X} label="إغلاق" size="sm" onClick={onClose} className="-me-1" />
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3.5">
            {footer}
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}

/* ------------------------------ تأكيد ------------------------------ */

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  tone = "danger",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      icon={
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            tone === "danger" ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent",
          )}
        >
          <AlertTriangle className="size-5" />
        </span>
      }
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="text-[13.5px] leading-relaxed text-ink-soft">{message}</p>}
    </Modal>
  );
}
