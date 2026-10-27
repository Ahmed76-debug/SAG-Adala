import React from "react";
import { Link } from "react-router-dom";
import { Lock, Flame, Clock, CalendarClock, FileText } from "lucide-react";
import { Badge, Progress, Avatar } from "@/components/ui/primitives";
import {
  MATTER_STATUS,
  MATTER_PRIORITY,
  TASK_STATUS,
  TASK_PRIORITY,
  EVENT_TYPES,
  DOC_CATEGORIES,
  CLIENT_TYPES,
  formatCurrency,
  daysUntil,
} from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Matter, Task, LegalEvent, Client, LegalDocument } from "@/lib/types";

export function StatusBadge({ status }: { status: Matter["status"] }) {
  const s = MATTER_STATUS[status];
  return (
    <Badge
      tone={s.soft as never}
      dot
      style={{ color: s.color, borderColor: `${s.color}44`, backgroundColor: `${s.color}18` }}
    >
      {s.label}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: Matter["priority"] }) {
  const p = MATTER_PRIORITY[priority];
  if (priority === "normal") return null;
  return (
    <Badge
      icon={priority === "critical" ? Flame : Clock}
      style={{ color: p.color, borderColor: `${p.color}44`, backgroundColor: `${p.color}18` }}
    >
      {p.label}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: Task["status"] }) {
  const s = TASK_STATUS[status];
  return (
    <Badge
      dot
      style={{ color: s.color, borderColor: `${s.color}44`, backgroundColor: `${s.color}18` }}
    >
      {s.label}
    </Badge>
  );
}

export function TaskPriorityBadge({ priority }: { priority: Task["priority"] }) {
  const p = TASK_PRIORITY[priority];
  if (priority === "low" || priority === "normal") return null;
  return (
    <Badge style={{ color: p.color, borderColor: `${p.color}44`, backgroundColor: `${p.color}18` }}>
      {p.label}
    </Badge>
  );
}

export function EventTypeBadge({ type }: { type: LegalEvent["type"] }) {
  const t = EVENT_TYPES[type];
  return (
    <Badge style={{ color: t.color, borderColor: `${t.color}44`, backgroundColor: `${t.color}18` }}>
      {t.label}
    </Badge>
  );
}

export function DueBadge({ date }: { date?: string }) {
  if (!date) return null;
  const d = daysUntil(date);
  const tone = d < 0 ? "danger" : d <= 1 ? "danger" : d <= 3 ? "warn" : "muted";
  const label = d < 0 ? `متأخر ${Math.abs(d)} يوم` : d === 0 ? "اليوم" : d === 1 ? "غدًا" : `${d} يوم`;
  return (
    <Badge tone={tone} icon={CalendarClock}>
      {label}
    </Badge>
  );
}

export function ConfidentialBadge() {
  return (
    <Badge tone="danger" icon={Lock}>
      سري
    </Badge>
  );
}

export function ClientTypeBadge({ type }: { type: Client["type"] }) {
  return <Badge tone="muted">{CLIENT_TYPES[type]}</Badge>;
}

export function DocCategoryBadge({ category }: { category: LegalDocument["category"] }) {
  const c = DOC_CATEGORIES[category];
  return <Badge tone="muted" icon={FileText}>{c.label}</Badge>;
}

/* ------------------------------ بطاقة قضية ------------------------------ */

export function MatterCard({
  matter,
  clientName,
  lawyerNames = [],
  onClick,
}: {
  matter: Matter;
  clientName?: string;
  lawyerNames?: string[];
  onClick?: () => void;
}) {
  return (
    <Link
      to={`/matters/${matter.id}`}
      onClick={onClick}
      className="card card-hover group flex flex-col gap-3 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="num text-[11.5px] font-semibold text-accent">{matter.number}</span>
            {matter.confidential && <Lock className="size-3 text-danger" />}
          </div>
          <h3 className="mt-1 line-clamp-2 text-[14px] font-bold leading-snug text-ink group-hover:text-accent">
            {matter.title}
          </h3>
          {clientName && <p className="mt-1 truncate text-[12px] text-muted">{clientName}</p>}
        </div>
        <StatusBadge status={matter.status} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={matter.priority} />
        {matter.stage && <Badge tone="muted">{matter.stage}</Badge>}
        {matter.tags.slice(0, 2).map((t) => (
          <Badge key={t} tone="default">
            {t}
          </Badge>
        ))}
      </div>

      {matter.nextAction && (
        <div className="rounded-xl border border-line bg-surface-2 p-2.5">
          <div className="text-[11px] text-muted">الخطوة التالية</div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className="truncate text-[12.5px] font-medium text-ink">{matter.nextAction}</span>
            <DueBadge date={matter.nextActionDate} />
          </div>
        </div>
      )}

      <div>
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
          <span>نسبة الإنجاز</span>
          <span className="num font-semibold text-ink">{matter.progress}%</span>
        </div>
        <Progress
          value={matter.progress}
          tone={matter.progress >= 80 ? "ok" : matter.progress >= 40 ? "accent" : "warn"}
        />
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-line-soft pt-3">
        <div className="flex -space-x-2 space-x-reverse">
          {lawyerNames.slice(0, 3).map((n, i) => (
            <Avatar key={i} name={n} size={24} className="ring-2 ring-[var(--surface)]" />
          ))}
        </div>
        <span className="num text-[11.5px] text-muted">
          {formatCurrency(matter.agreedFee, matter.currency)}
        </span>
      </div>
    </Link>
  );
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("card flex flex-col overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
        <div>
          <h3 className="text-[14.5px] font-bold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[11.5px] text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className={cn("flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
