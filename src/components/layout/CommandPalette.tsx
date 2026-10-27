import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Search,
  CornerDownLeft,
  Scale,
  Users,
  ListTodo,
  FolderOpen,
  CalendarDays,
  BookOpen,
  LayoutDashboard,
  Settings as SettingsIcon,
  Archive,
  BarChart3,
  Award,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { createPortal } from "react-dom";
import { db } from "@/lib/db";
import { cn } from "@/lib/cn";
import { MATTER_STATUS } from "@/lib/format";

interface Cmd {
  id: string;
  group: string;
  title: string;
  sub?: string;
  icon: typeof Scale;
  to: string;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const matters = useLiveQuery(() => db.matters.toArray(), [], []);
  const clients = useLiveQuery(() => db.clients.toArray(), [], []);
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], []);
  const docs = useLiveQuery(() => db.documents.toArray(), [], []);
  const library = useLiveQuery(() => db.library.toArray(), [], []);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  const commands = useMemo<Cmd[]>(() => {
    const nav: Cmd[] = [
      { id: "nav_dash", group: "التنقل", title: "لوحة التحكم", icon: LayoutDashboard, to: "/" },
      { id: "nav_matters", group: "التنقل", title: "القضايا والملفات", icon: Scale, to: "/matters" },
      { id: "nav_clients", group: "التنقل", title: "الموكلون", icon: Users, to: "/clients" },
      { id: "nav_tasks", group: "التنقل", title: "المهام", icon: ListTodo, to: "/tasks" },
      { id: "nav_calendar", group: "التنقل", title: "المواعيد والجلسات", icon: CalendarDays, to: "/calendar" },
      { id: "nav_docs", group: "التنقل", title: "الوثائق والأوراق", icon: FolderOpen, to: "/documents" },
      { id: "nav_lib", group: "التنقل", title: "المكتبة القانونية", icon: BookOpen, to: "/library" },
      { id: "nav_archive", group: "التنقل", title: "الأرشيف", icon: Archive, to: "/archive" },
      { id: "nav_reports", group: "التنقل", title: "التقارير", icon: BarChart3, to: "/reports" },
      { id: "nav_port", group: "التنقل", title: "البورتفوليو العام", icon: Award, to: "/portfolio" },
      { id: "nav_set", group: "التنقل", title: "الإعدادات", icon: SettingsIcon, to: "/settings" },
    ];

    const s = q.trim().toLowerCase();
    const matterCmds: Cmd[] = (matters ?? []).map((m) => ({
      id: "m_" + m.id,
      group: "القضايا",
      title: m.title,
      sub: `${m.number} — ${MATTER_STATUS[m.status]?.label ?? ""}`,
      icon: Scale,
      to: `/matters/${m.id}`,
    }));
    const clientCmds: Cmd[] = (clients ?? []).map((c) => ({
      id: "c_" + c.id,
      group: "الموكلون",
      title: c.name,
      sub: c.phone ?? c.email ?? "",
      icon: Users,
      to: `/clients/${c.id}`,
    }));
    const taskCmds: Cmd[] = (tasks ?? []).map((t) => ({
      id: "t_" + t.id,
      group: "المهام",
      title: t.title,
      sub: t.dueDate ? "موعد نهائي" : "",
      icon: ListTodo,
      to: "/tasks",
    }));
    const docCmds: Cmd[] = (docs ?? []).map((d) => ({
      id: "d_" + d.id,
      group: "الوثائق",
      title: d.title,
      sub: d.fileName ?? "",
      icon: FileText,
      to: "/documents",
    }));
    const libCmds: Cmd[] = (library ?? []).map((l) => ({
      id: "l_" + l.id,
      group: "المكتبة",
      title: l.title,
      sub: l.author ?? l.category,
      icon: BookOpen,
      to: "/library",
    }));

    const all = [...nav, ...matterCmds, ...clientCmds, ...taskCmds, ...docCmds, ...libCmds];
    if (!s) return all.slice(0, 40);
    return all
      .filter(
        (c) =>
          c.title.toLowerCase().includes(s) ||
          (c.sub ?? "").toLowerCase().includes(s) ||
          c.group.toLowerCase().includes(s),
      )
      .slice(0, 40);
  }, [q, matters, clients, tasks, docs, library]);

  useEffect(() => setIdx(0), [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIdx((i) => Math.min(i + 1, commands.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && commands[idx]) {
        e.preventDefault();
        navigate(commands[idx].to);
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, commands, idx, navigate, onClose]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  if (!open) return null;

  let lastGroup = "";

  return createPortal(
    <div className="no-print fixed inset-0 z-[120] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)] animate-scale-in">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Search className="size-5 text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث في القضايا، الموكلين، المهام، الوثائق، المكتبة…"
            className="flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-faint"
          />
          <kbd className="hidden rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[10.5px] text-muted sm:block">
            Esc
          </kbd>
        </div>
        <div ref={listRef} className="scroll-thin max-h-[52vh] overflow-y-auto py-1.5">
          {commands.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-muted">لا توجد نتائج مطابقة</div>
          ) : (
            commands.map((c, i) => {
              const showGroup = c.group !== lastGroup;
              lastGroup = c.group;
              return (
                <div key={c.id}>
                  {showGroup && (
                    <div className="px-4 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
                      {c.group}
                    </div>
                  )}
                  <button
                    data-idx={i}
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => {
                      navigate(c.to);
                      onClose();
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-start transition-colors",
                      i === idx ? "bg-accent-soft text-ink" : "hover:bg-surface-2",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg",
                        i === idx ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted",
                      )}
                    >
                      <c.icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-ink">{c.title}</span>
                      {c.sub && <span className="block truncate text-[11.5px] text-muted">{c.sub}</span>}
                    </span>
                    {i === idx && <CornerDownLeft className="size-3.5 text-accent" />}
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between border-t border-line bg-surface-2 px-4 py-2 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <ArrowLeft className="size-3" /> ↑↓ للتنقل · Enter للفتح
          </span>
          <span>بحث شامل في النظام</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
