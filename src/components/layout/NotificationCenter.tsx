import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Trash2, AlarmClock, ListTodo, Wallet, Settings2, X } from "lucide-react";
import { useApp } from "@/state/AppProvider";
import { Button, IconButton, EmptyState } from "@/components/ui/primitives";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const KIND_ICON = {
  deadline: AlarmClock,
  task: ListTodo,
  payment: Wallet,
  system: Settings2,
};

const KIND_TONE = {
  deadline: "text-danger bg-danger-soft",
  task: "text-warn bg-warn-soft",
  payment: "text-ok bg-ok-soft",
  system: "text-info bg-info-soft",
};

export function NotificationCenter({ onClose }: { onClose: () => void }) {
  const { notifications, markNotificationRead, markAllRead, clearNotifications, notifyPermission, requestNotifyPermission } =
    useApp();
  const navigate = useNavigate();

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute end-0 top-12 z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)] animate-scale-in">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Bell className="size-4 text-accent" />
          <span className="text-[13.5px] font-bold text-ink">مركز الإشعارات</span>
          <div className="ms-auto flex items-center gap-1">
            <IconButton icon={CheckCheck} label="تعليم الكل كمقروء" size="xs" onClick={() => void markAllRead()} />
            <IconButton icon={Trash2} label="مسح الكل" size="xs" onClick={() => void clearNotifications()} />
            <IconButton icon={X} label="إغلاق" size="xs" onClick={onClose} />
          </div>
        </div>

        {notifyPermission === "default" && (
          <div className="border-b border-line bg-accent-soft/50 px-4 py-3">
            <p className="text-[12px] leading-relaxed text-ink-soft">
              فعّل إشعارات المتصفح لتصلك تذكيرات المواعيد والمهام قبل حلولها.
            </p>
            <Button size="xs" variant="gold" className="mt-2" onClick={() => void requestNotifyPermission()}>
              تفعيل التذكيرات
            </Button>
          </div>
        )}

        <div className="scroll-thin max-h-[380px] overflow-y-auto">
          {notifications.length === 0 ? (
            <EmptyState icon={Bell} title="لا توجد إشعارات" description="ستظهر هنا التذكيرات والمواعيد المستحقة." />
          ) : (
            notifications.map((n) => {
              const Icon = KIND_ICON[n.kind] ?? Bell;
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    void markNotificationRead(n.id);
                    if (n.link) navigate(n.link);
                    onClose();
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-line-soft px-4 py-3 text-start transition-colors last:border-0 hover:bg-surface-2",
                    !n.read && "bg-accent-soft/30",
                  )}
                >
                  <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", KIND_TONE[n.kind])}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-semibold text-ink">{n.title}</span>
                      {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-accent" />}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">{n.body}</span>
                    <span className="mt-1 block text-[10.5px] text-faint">{relativeTime(n.at)}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
