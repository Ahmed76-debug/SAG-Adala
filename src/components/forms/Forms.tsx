import React, { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Upload, FileText, X, Paperclip } from "lucide-react";
import { db, nowISO, saveFile, uid, logActivity } from "@/lib/db";
import { useApp } from "@/state/AppProvider";
import { Modal, useToast } from "@/components/ui/overlays";
import { Button, Field, Input, Select, Textarea, Checkbox, Badge } from "@/components/ui/primitives";
import { toDateInput, toDateTimeInput, fromDateInput } from "@/lib/format";
import type {
  Matter,
  Client,
  Task,
  LegalEvent,
  LegalDocument,
  DocumentCategory,
  EventType,
  MatterStatus,
  MatterPriority,
  FeeType,
  ClientType,
  TaskPriority,
  TaskStatus,
} from "@/lib/types";

/* =============================================================
   نماذج CRUD موحّدة
   ============================================================= */

function TagInput({
  value,
  onChange,
  placeholder = "أضف وسماً واضغط Enter",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface-2 p-2">
      {value.map((t) => (
        <Badge key={t} tone="accent" className="gap-1">
          {t}
          <button
            onClick={() => onChange(value.filter((x) => x !== t))}
            className="opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            e.preventDefault();
            onChange([...new Set([...value, draft.trim()])]);
            setDraft("");
          }
        }}
        placeholder={value.length ? "" : placeholder}
        className="min-w-[120px] flex-1 bg-transparent px-1 text-[13px] text-ink outline-none placeholder:text-faint"
      />
    </div>
  );
}

function FormGrid({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      {children}
    </div>
  );
}

/* ------------------------------ القضية ------------------------------ */

export function MatterForm({
  open,
  onClose,
  matterId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  matterId?: string;
  onSaved?: (m: Matter) => void;
}) {
  const { user } = useApp();
  const toast = useToast();
  const types = useLiveQuery(() => db.matterTypes.toArray(), [], []);
  const clients = useLiveQuery(() => db.clients.filter((c) => !c.archived).toArray(), [], []);
  const users = useLiveQuery(() => db.users.toArray(), [], []);
  const existing = useLiveQuery(
    () => (matterId ? db.matters.get(matterId) : undefined),
    [matterId, open],
    undefined,
  );

  const [form, setForm] = useState<Partial<Matter>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setForm({ ...existing });
    } else {
      const year = new Date().getFullYear();
      setForm({
        number: `${year}/${String(Math.floor(Math.random() * 9000) + 1000)}`,
        internalRef: `AL-${year}-${String(Math.floor(Math.random() * 90) + 10)}`,
        status: "open",
        priority: "normal",
        feeType: "fixed",
        agreedFee: 0,
        expenses: 0,
        courtFees: 0,
        currency: "SAR",
        progress: 0,
        confidential: false,
        tags: [],
        lawyerIds: user ? [user.id] : [],
        openedAt: nowISO(),
        createdAt: nowISO(),
        updatedAt: nowISO(),
        archived: false,
      });
    }
  }, [open, existing, user]);

  const set = (patch: Partial<Matter>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    if (!form.title?.trim()) {
      toast.error("عنوان القضية مطلوب");
      return;
    }
    if (!form.clientId) {
      toast.error("اختر الموكّل");
      return;
    }
    setSaving(true);
    const id = existing?.id ?? uid("ma_");
    const payload: Matter = {
      id,
      number: form.number ?? "",
      internalRef: form.internalRef ?? "",
      title: form.title!.trim(),
      typeId: form.typeId ?? types[0]?.id ?? "mt_commercial",
      clientId: form.clientId!,
      opposingParty: form.opposingParty,
      courtName: form.courtName,
      caseNumber: form.caseNumber,
      judge: form.judge,
      status: (form.status as MatterStatus) ?? "open",
      priority: (form.priority as MatterPriority) ?? "normal",
      stage: form.stage,
      description: form.description,
      lawyerIds: form.lawyerIds ?? [],
      feeType: (form.feeType as FeeType) ?? "fixed",
      agreedFee: Number(form.agreedFee) || 0,
      hourlyRate: form.hourlyRate,
      expenses: Number(form.expenses) || 0,
      courtFees: Number(form.courtFees) || 0,
      currency: form.currency ?? "SAR",
      openedAt: form.openedAt ?? nowISO(),
      closedAt: form.closedAt,
      nextAction: form.nextAction,
      nextActionDate: form.nextActionDate,
      progress: Number(form.progress) || 0,
      confidential: !!form.confidential,
      tags: form.tags ?? [],
      createdAt: form.createdAt ?? nowISO(),
      updatedAt: nowISO(),
      archived: form.archived ?? false,
      outcome: form.outcome,
      winRate: form.winRate,
    };
    await db.matters.put(payload);
    await logActivity({
      userId: user?.id,
      userName: user?.name ?? "—",
      action: existing ? "تعديل" : "إضافة",
      entity: "قضية",
      entityId: id,
      meta: payload.title,
    });
    setSaving(false);
    toast.success(existing ? "تم تحديث القضية" : "تمت إضافة القضية بنجاح");
    onSaved?.(payload);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={existing ? "تعديل القضية" : "قضية جديدة"}
      description="املأ بيانات الملف الأساسية — يمكنك استكمال التفاصيل لاحقًا."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="primary" loading={saving} onClick={save}>
            {existing ? "حفظ التعديلات" : "إنشاء القضية"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="عنوان القضية" required>
          <Input
            value={form.title ?? ""}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="مثال: مطالبة حقوقية ضد مالك عقار"
          />
        </Field>

        <FormGrid>
          <Field label="رقم القضية">
            <Input value={form.number ?? ""} onChange={(e) => set({ number: e.target.value })} />
          </Field>
          <Field label="الرقم الداخلي">
            <Input value={form.internalRef ?? ""} onChange={(e) => set({ internalRef: e.target.value })} />
          </Field>
          <Field label="الموكّل" required>
            <Select value={form.clientId ?? ""} onChange={(e) => set({ clientId: e.target.value })}>
              <option value="">— اختر الموكّل —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="نوع القضية">
            <Select value={form.typeId ?? ""} onChange={(e) => set({ typeId: e.target.value })}>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="المحكمة / الجهة">
            <Input
              value={form.courtName ?? ""}
              onChange={(e) => set({ courtName: e.target.value })}
              placeholder="المحكمة التجارية بالرياض"
            />
          </Field>
          <Field label="رقم القضية بالمحكمة">
            <Input value={form.caseNumber ?? ""} onChange={(e) => set({ caseNumber: e.target.value })} />
          </Field>
          <Field label="الخصم">
            <Input
              value={form.opposingParty ?? ""}
              onChange={(e) => set({ opposingParty: e.target.value })}
            />
          </Field>
          <Field label="القاضي / الدائرة">
            <Input value={form.judge ?? ""} onChange={(e) => set({ judge: e.target.value })} />
          </Field>
          <Field label="الحالة">
            <Select value={form.status ?? "open"} onChange={(e) => set({ status: e.target.value as MatterStatus })}>
              <option value="open">مفتوحة</option>
              <option value="in_review">قيد المراجعة</option>
              <option value="hearing">مرفوعة للجلسة</option>
              <option value="suspended">معلّقة</option>
              <option value="settled">تمت التسوية</option>
              <option value="judged">صدر فيها حكم</option>
              <option value="closed">مغلقة</option>
            </Select>
          </Field>
          <Field label="الأولوية">
            <Select
              value={form.priority ?? "normal"}
              onChange={(e) => set({ priority: e.target.value as MatterPriority })}
            >
              <option value="normal">عادية</option>
              <option value="high">متصاعدة</option>
              <option value="critical">حرجة</option>
            </Select>
          </Field>
          <Field label="المرحلة الحالية">
            <Input
              value={form.stage ?? ""}
              onChange={(e) => set({ stage: e.target.value })}
              placeholder="مثال: مرحلة تقديم المذكرات"
            />
          </Field>
          <Field label="تاريخ الفتح">
            <Input
              type="date"
              value={toDateInput(form.openedAt)}
              onChange={(e) => set({ openedAt: fromDateInput(e.target.value) })}
            />
          </Field>
        </FormGrid>

        <Field label="وصف الملف / وقائع القضية">
          <Textarea
            value={form.description ?? ""}
            onChange={(e) => set({ description: e.target.value })}
            rows={3}
            placeholder="خلاصة الوقائع والمطلوب في القضية…"
          />
        </Field>

        <div className="rounded-2xl border border-line bg-surface-2 p-4">
          <h4 className="mb-3 text-[13px] font-bold text-ink">الأتعاب والمصاريف</h4>
          <FormGrid cols={3}>
            <Field label="نوع الأتعاب">
              <Select value={form.feeType ?? "fixed"} onChange={(e) => set({ feeType: e.target.value as FeeType })}>
                <option value="fixed">أتعاب ثابتة</option>
                <option value="percentage">نسبة من قيمة الدعوى</option>
                <option value="hourly">أتعاب بالساعة</option>
                <option value="retainer">اتفاق توكيل مسبق</option>
                <option value="pro_bono">قضية على سبيل التطوع</option>
              </Select>
            </Field>
            <Field label="الأتعاب المتفق عليها">
              <Input
                type="number"
                value={form.agreedFee ?? 0}
                onChange={(e) => set({ agreedFee: Number(e.target.value) })}
              />
            </Field>
            <Field label="المصاريف">
              <Input
                type="number"
                value={form.expenses ?? 0}
                onChange={(e) => set({ expenses: Number(e.target.value) })}
              />
            </Field>
            <Field label="الرسوم القضائية">
              <Input
                type="number"
                value={form.courtFees ?? 0}
                onChange={(e) => set({ courtFees: Number(e.target.value) })}
              />
            </Field>
            <Field label="العملة">
              <Select value={form.currency ?? "SAR"} onChange={(e) => set({ currency: e.target.value })}>
                <option value="SAR">ريال سعودي</option>
                <option value="AED">درهم إماراتي</option>
                <option value="KWD">دينار كويتي</option>
                <option value="QAR">ريال قطري</option>
                <option value="EGP">جنيه مصري</option>
                <option value="USD">دولار أمريكي</option>
              </Select>
            </Field>
            <Field label="نسبة الإنجاز %">
              <Input
                type="number"
                min={0}
                max={100}
                value={form.progress ?? 0}
                onChange={(e) => set({ progress: Number(e.target.value) })}
              />
            </Field>
          </FormGrid>
        </div>

        <FormGrid>
          <Field label="الخطوة التالية">
            <Input
              value={form.nextAction ?? ""}
              onChange={(e) => set({ nextAction: e.target.value })}
              placeholder="الإجراء المطلوب تنفيذه"
            />
          </Field>
          <Field label="موعد الخطوة التالية">
            <Input
              type="date"
              value={toDateInput(form.nextActionDate)}
              onChange={(e) => set({ nextActionDate: fromDateInput(e.target.value) })}
            />
          </Field>
        </FormGrid>

        <Field label="الوسوم">
          <TagInput value={form.tags ?? []} onChange={(v) => set({ tags: v })} />
        </Field>

        <Field label="فريق المحاماة">
          <div className="flex flex-wrap gap-2">
            {users.map((u) => {
              const on = (form.lawyerIds ?? []).includes(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() =>
                    set({
                      lawyerIds: on
                        ? (form.lawyerIds ?? []).filter((x) => x !== u.id)
                        : [...(form.lawyerIds ?? []), u.id],
                    })
                  }
                  className={`rounded-xl border px-3 py-1.5 text-[12.5px] transition-colors ${
                    on ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-soft hover:bg-surface-2"
                  }`}
                >
                  {u.name}
                </button>
              );
            })}
          </div>
        </Field>

        <Checkbox
          checked={!!form.confidential}
          onChange={(v) => set({ confidential: v })}
          label="ملف سري — لا يظهر في التقارير العامة"
        />
      </div>
    </Modal>
  );
}

/* ------------------------------ الموكّل ------------------------------ */

export function ClientForm({
  open,
  onClose,
  clientId,
}: {
  open: boolean;
  onClose: () => void;
  clientId?: string;
}) {
  const { user } = useApp();
  const toast = useToast();
  const users = useLiveQuery(() => db.users.toArray(), [], []);
  const existing = useLiveQuery(
    () => (clientId ? db.clients.get(clientId) : undefined),
    [clientId, open],
    undefined,
  );
  const [form, setForm] = useState<Partial<Client>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      existing
        ? { ...existing }
        : {
            type: "individual",
            status: "active",
            priority: "normal",
            tags: [],
            createdAt: nowISO(),
            updatedAt: nowISO(),
            archived: false,
            assignedTo: user?.id,
          },
    );
  }, [open, existing, user]);

  const set = (patch: Partial<Client>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    if (!form.name?.trim()) {
      toast.error("اسم الموكّل مطلوب");
      return;
    }
    setSaving(true);
    const id = existing?.id ?? uid("cl_");
    const payload: Client = {
      id,
      name: form.name!.trim(),
      legalName: form.legalName,
      type: (form.type as ClientType) ?? "individual",
      nationalId: form.nationalId,
      commercialId: form.commercialId,
      phone: form.phone,
      email: form.email,
      address: form.address,
      city: form.city,
      profession: form.profession,
      notes: form.notes,
      tags: form.tags ?? [],
      priority: form.priority ?? "normal",
      assignedTo: form.assignedTo,
      status: form.status ?? "active",
      createdAt: form.createdAt ?? nowISO(),
      updatedAt: nowISO(),
      archived: form.archived ?? false,
      source: form.source,
    };
    await db.clients.put(payload);
    await logActivity({
      userId: user?.id,
      userName: user?.name ?? "—",
      action: existing ? "تعديل" : "إضافة",
      entity: "موكّل",
      entityId: id,
      meta: payload.name,
    });
    setSaving(false);
    toast.success(existing ? "تم تحديث بيانات الموكّل" : "تمت إضافة الموكّل");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={existing ? "تعديل بيانات الموكّل" : "إضافة موكّل جديد"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="primary" loading={saving} onClick={save}>
            {existing ? "حفظ" : "إضافة"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="الاسم" required>
          <Input value={form.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="الاسم الرسمي / النظامي">
          <Input value={form.legalName ?? ""} onChange={(e) => set({ legalName: e.target.value })} />
        </Field>
        <FormGrid>
          <Field label="النوع">
            <Select value={form.type ?? "individual"} onChange={(e) => set({ type: e.target.value as ClientType })}>
              <option value="individual">شخص طبيعي</option>
              <option value="company">شركة / مؤسسة</option>
              <option value="entity">جهة حكومية</option>
              <option value="opponent">الخصم</option>
            </Select>
          </Field>
          <Field label="الحالة">
            <Select value={form.status ?? "active"} onChange={(e) => set({ status: e.target.value as never })}>
              <option value="active">نشط</option>
              <option value="dormant">متوقف</option>
              <option value="closed">مغلق</option>
            </Select>
          </Field>
          <Field label="رقم الهوية / السجل">
            <Input value={form.nationalId ?? ""} onChange={(e) => set({ nationalId: e.target.value })} />
          </Field>
          <Field label="رقم السجل التجاري">
            <Input value={form.commercialId ?? ""} onChange={(e) => set({ commercialId: e.target.value })} />
          </Field>
          <Field label="الجوال">
            <Input value={form.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
          <Field label="البريد الإلكتروني">
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => set({ email: e.target.value })}
            />
          </Field>
          <Field label="المدينة">
            <Input value={form.city ?? ""} onChange={(e) => set({ city: e.target.value })} />
          </Field>
          <Field label="الأولوية">
            <Select value={form.priority ?? "normal"} onChange={(e) => set({ priority: e.target.value as never })}>
              <option value="normal">عادية</option>
              <option value="high">متصاعدة</option>
              <option value="vip">م VIP</option>
            </Select>
          </Field>
        </FormGrid>
        <Field label="العنوان">
          <Input value={form.address ?? ""} onChange={(e) => set({ address: e.target.value })} />
        </Field>
        <Field label="ملاحظات">
          <Textarea value={form.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} rows={3} />
        </Field>
        <Field label="المحامي المسؤول">
          <Select value={form.assignedTo ?? ""} onChange={(e) => set({ assignedTo: e.target.value })}>
            <option value="">— غير محدد —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="الوسوم">
          <TagInput value={form.tags ?? []} onChange={(v) => set({ tags: v })} />
        </Field>
      </div>
    </Modal>
  );
}

/* ------------------------------ المهمة ------------------------------ */

export function TaskForm({
  open,
  onClose,
  taskId,
  defaultMatterId,
}: {
  open: boolean;
  onClose: () => void;
  taskId?: string;
  defaultMatterId?: string;
}) {
  const { user } = useApp();
  const toast = useToast();
  const matters = useLiveQuery(() => db.matters.filter((m) => !m.archived).toArray(), [], []);
  const users = useLiveQuery(() => db.users.toArray(), [], []);
  const existing = useLiveQuery(
    () => (taskId ? db.tasks.get(taskId) : undefined),
    [taskId, open],
    undefined,
  );
  const [form, setForm] = useState<Partial<Task>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      existing
        ? { ...existing }
        : {
            status: "todo",
            priority: "normal",
            tags: [],
            checklist: [],
            matterId: defaultMatterId,
            assigneeId: user?.id,
            createdBy: user?.id,
            createdAt: nowISO(),
            updatedAt: nowISO(),
            archived: false,
          },
    );
  }, [open, existing, defaultMatterId, user]);

  const set = (patch: Partial<Task>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    if (!form.title?.trim()) {
      toast.error("عنوان المهمة مطلوب");
      return;
    }
    setSaving(true);
    const id = existing?.id ?? uid("tk_");
    const payload: Task = {
      id,
      title: form.title!.trim(),
      description: form.description,
      matterId: form.matterId || undefined,
      clientId: form.clientId || undefined,
      assigneeId: form.assigneeId,
      createdBy: form.createdBy ?? user?.id,
      dueDate: form.dueDate,
      remindAt: form.remindAt,
      priority: (form.priority as TaskPriority) ?? "normal",
      status: (form.status as TaskStatus) ?? "todo",
      tags: form.tags ?? [],
      checklist: form.checklist ?? [],
      estimatedHours: form.estimatedHours,
      createdAt: form.createdAt ?? nowISO(),
      updatedAt: nowISO(),
      completedAt: form.status === "done" ? (form.completedAt ?? nowISO()) : undefined,
      recurring: form.recurring,
      archived: false,
    };
    await db.tasks.put(payload);
    await logActivity({
      userId: user?.id,
      userName: user?.name ?? "—",
      action: existing ? "تعديل" : "إضافة",
      entity: "مهمة",
      entityId: id,
      meta: payload.title,
    });
    setSaving(false);
    toast.success(existing ? "تم تحديث المهمة" : "تمت إضافة المهمة");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={existing ? "تعديل المهمة" : "مهمة جديدة"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="primary" loading={saving} onClick={save}>
            حفظ
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="عنوان المهمة" required>
          <Input value={form.title ?? ""} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <Field label="الوصف / التفاصيل">
          <Textarea value={form.description ?? ""} onChange={(e) => set({ description: e.target.value })} rows={3} />
        </Field>
        <FormGrid>
          <Field label="القضية المرتبطة">
            <Select value={form.matterId ?? ""} onChange={(e) => set({ matterId: e.target.value })}>
              <option value="">— بدون —</option>
              {matters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.number} — {m.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="المكلَّف بها">
            <Select value={form.assigneeId ?? ""} onChange={(e) => set({ assigneeId: e.target.value })}>
              <option value="">— غير محدد —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="تاريخ الاستحقاق">
            <Input
              type="date"
              value={toDateInput(form.dueDate)}
              onChange={(e) => set({ dueDate: fromDateInput(e.target.value) })}
            />
          </Field>
          <Field label="وقت التذكير">
            <Input
              type="date"
              value={toDateInput(form.remindAt)}
              onChange={(e) => set({ remindAt: fromDateInput(e.target.value) })}
            />
          </Field>
          <Field label="الأولوية">
            <Select value={form.priority ?? "normal"} onChange={(e) => set({ priority: e.target.value as TaskPriority })}>
              <option value="low">منخفضة</option>
              <option value="normal">عادية</option>
              <option value="high">عالية</option>
              <option value="urgent">عاجلة</option>
            </Select>
          </Field>
          <Field label="الحالة">
            <Select value={form.status ?? "todo"} onChange={(e) => set({ status: e.target.value as TaskStatus })}>
              <option value="todo">قيد الانتظار</option>
              <option value="doing">قيد التنفيذ</option>
              <option value="done">مكتملة</option>
              <option value="cancelled">ملغاة</option>
            </Select>
          </Field>
        </FormGrid>
        <Field label="الوسوم">
          <TagInput value={form.tags ?? []} onChange={(v) => set({ tags: v })} />
        </Field>
      </div>
    </Modal>
  );
}

/* ------------------------------ الموعد ------------------------------ */

export function EventForm({
  open,
  onClose,
  eventId,
  defaultMatterId,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  eventId?: string;
  defaultMatterId?: string;
  defaultDate?: string;
}) {
  const { user } = useApp();
  const toast = useToast();
  const matters = useLiveQuery(() => db.matters.filter((m) => !m.archived).toArray(), [], []);
  const existing = useLiveQuery(
    () => (eventId ? db.events.get(eventId) : undefined),
    [eventId, open],
    undefined,
  );
  const [form, setForm] = useState<Partial<LegalEvent>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      existing
        ? { ...existing }
        : {
            type: "hearing",
            status: "scheduled",
            remindBeforeDays: 3,
            remindersSent: 0,
            date: defaultDate ?? nowISO(),
            matterId: defaultMatterId,
            createdAt: nowISO(),
            updatedAt: nowISO(),
            archived: false,
          },
    );
  }, [open, existing, defaultMatterId, defaultDate]);

  const set = (patch: Partial<LegalEvent>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    if (!form.title?.trim()) {
      toast.error("عنوان الموعد مطلوب");
      return;
    }
    setSaving(true);
    const id = existing?.id ?? uid("ev_");
    const payload: LegalEvent = {
      id,
      title: form.title!.trim(),
      type: (form.type as EventType) ?? "hearing",
      matterId: form.matterId || undefined,
      clientId: form.clientId || undefined,
      date: form.date ?? nowISO(),
      endTime: form.endTime,
      location: form.location,
      courtRoom: form.courtRoom,
      judge: form.judge,
      attendees: form.attendees,
      notes: form.notes,
      outcome: form.outcome,
      status: form.status ?? "scheduled",
      remindBeforeDays: Number(form.remindBeforeDays) || 3,
      remindersSent: form.remindersSent ?? 0,
      createdAt: form.createdAt ?? nowISO(),
      updatedAt: nowISO(),
      archived: false,
    };
    await db.events.put(payload);
    await logActivity({
      userId: user?.id,
      userName: user?.name ?? "—",
      action: existing ? "تعديل" : "إضافة",
      entity: "موعد",
      entityId: id,
      meta: payload.title,
    });
    setSaving(false);
    toast.success(existing ? "تم تحديث الموعد" : "تمت إضافة الموعد");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={existing ? "تعديل الموعد" : "موعد / جلسة جديدة"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="primary" loading={saving} onClick={save}>
            حفظ
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="عنوان الموعد" required>
          <Input value={form.title ?? ""} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <FormGrid>
          <Field label="النوع">
            <Select value={form.type ?? "hearing"} onChange={(e) => set({ type: e.target.value as EventType })}>
              <option value="hearing">جلسة قضائية</option>
              <option value="deadline">ميعاد نظامي</option>
              <option value="meeting">اجتماع</option>
              <option value="payment">تحصيل أتعاب</option>
              <option value="followup">متابعة</option>
              <option value="internal">عمل داخلي</option>
            </Select>
          </Field>
          <Field label="القضية المرتبطة">
            <Select value={form.matterId ?? ""} onChange={(e) => set({ matterId: e.target.value })}>
              <option value="">— بدون —</option>
              {matters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.number} — {m.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="التاريخ والوقت" required>
            <Input
              type="datetime-local"
              value={toDateTimeInput(form.date)}
              onChange={(e) => set({ date: fromDateInput(e.target.value) })}
            />
          </Field>
          <Field label="وقت الانتهاء">
            <Input value={form.endTime ?? ""} onChange={(e) => set({ endTime: e.target.value })} placeholder="10:30" />
          </Field>
          <Field label="المكان">
            <Input value={form.location ?? ""} onChange={(e) => set({ location: e.target.value })} />
          </Field>
          <Field label="القاعة / القاعة الجزئية">
            <Input value={form.courtRoom ?? ""} onChange={(e) => set({ courtRoom: e.target.value })} />
          </Field>
          <Field label="التذكير قبل (أيام)">
            <Input
              type="number"
              min={0}
              max={30}
              value={form.remindBeforeDays ?? 3}
              onChange={(e) => set({ remindBeforeDays: Number(e.target.value) })}
            />
          </Field>
          <Field label="الحالة">
            <Select value={form.status ?? "scheduled"} onChange={(e) => set({ status: e.target.value as never })}>
              <option value="scheduled">مجدول</option>
              <option value="done">تم</option>
              <option value="postponed">مؤجل</option>
              <option value="cancelled">ملغي</option>
            </Select>
          </Field>
        </FormGrid>
        <Field label="ملاحظات">
          <Textarea value={form.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} rows={3} />
        </Field>
      </div>
    </Modal>
  );
}

/* ------------------------------ الوثيقة ------------------------------ */

export function DocumentForm({
  open,
  onClose,
  docId,
  defaultMatterId,
}: {
  open: boolean;
  onClose: () => void;
  docId?: string;
  defaultMatterId?: string;
}) {
  const { user } = useApp();
  const toast = useToast();
  const matters = useLiveQuery(() => db.matters.filter((m) => !m.archived).toArray(), [], []);
  const clients = useLiveQuery(() => db.clients.filter((c) => !c.archived).toArray(), [], []);
  const existing = useLiveQuery(
    () => (docId ? db.documents.get(docId) : undefined),
    [docId, open],
    undefined,
  );
  const [form, setForm] = useState<Partial<LegalDocument>>({});
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setForm(
      existing
        ? { ...existing }
        : {
            category: "other",
            version: 1,
            tags: [],
            confidential: false,
            requiresSignature: false,
            printCount: 0,
            matterId: defaultMatterId,
            createdAt: nowISO(),
            updatedAt: nowISO(),
            archived: false,
            createdBy: user?.id,
          },
    );
  }, [open, existing, defaultMatterId, user]);

  const set = (patch: Partial<LegalDocument>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    if (!form.title?.trim()) {
      toast.error("عنوان الوثيقة مطلوب");
      return;
    }
    setSaving(true);
    let fileId = form.fileId;
    let fileName = form.fileName;
    let mime = form.mime;
    let size = form.size;

    if (file) {
      const stored = await saveFile(file, file.name);
      fileId = stored.id;
      fileName = file.name;
      mime = file.type;
      size = file.size;
    }

    const id = existing?.id ?? uid("doc_");
    const payload: LegalDocument = {
      id,
      title: form.title!.trim(),
      category: (form.category as DocumentCategory) ?? "other",
      matterId: form.matterId || undefined,
      clientId: form.clientId || undefined,
      eventId: form.eventId,
      fileId,
      fileName,
      mime,
      size,
      version: form.version ?? 1,
      parentId: form.parentId,
      tags: form.tags ?? [],
      notes: form.notes,
      confidential: !!form.confidential,
      requiresSignature: !!form.requiresSignature,
      signedAt: form.signedAt,
      printCount: form.printCount ?? 0,
      createdBy: form.createdBy ?? user?.id,
      createdAt: form.createdAt ?? nowISO(),
      updatedAt: nowISO(),
      archived: form.archived ?? false,
      archivedAt: form.archivedAt,
      retentionUntil: form.retentionUntil,
    };
    await db.documents.put(payload);
    await logActivity({
      userId: user?.id,
      userName: user?.name ?? "—",
      action: existing ? "تعديل" : "إضافة",
      entity: "وثيقة",
      entityId: id,
      meta: payload.title,
    });
    setSaving(false);
    toast.success(existing ? "تم تحديث الوثيقة" : "تمت إضافة الوثيقة");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={existing ? "تعديل الوثيقة" : "إضافة وثيقة"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="primary" loading={saving} onClick={save}>
            حفظ
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="عنوان الوثيقة" required>
          <Input value={form.title ?? ""} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <FormGrid>
          <Field label="التصنيف">
            <Select value={form.category ?? "other"} onChange={(e) => set({ category: e.target.value as DocumentCategory })}>
              <option value="contract">عقد</option>
              <option value="pleading">مذكرة / لوائح</option>
              <option value="evidence">دليل</option>
              <option value="power_of_attorney">توكيل</option>
              <option value="receipt">إيصال</option>
              <option value="id">هوية / مستند رسمي</option>
              <option value="correspondence">مراسلة</option>
              <option value="report">تقرير</option>
              <option value="memo">مذكرة داخلية</option>
              <option value="other">أخرى</option>
            </Select>
          </Field>
          <Field label="القضية">
            <Select value={form.matterId ?? ""} onChange={(e) => set({ matterId: e.target.value })}>
              <option value="">— بدون —</option>
              {matters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.number} — {m.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="الموكّل">
            <Select value={form.clientId ?? ""} onChange={(e) => set({ clientId: e.target.value })}>
              <option value="">— بدون —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="النسخة">
            <Input
              type="number"
              min={1}
              value={form.version ?? 1}
              onChange={(e) => set({ version: Number(e.target.value) })}
            />
          </Field>
        </FormGrid>

        <Field label="الملف" hint="PDF أو Word أو صور — يُحفظ داخل النظام بشكل آمن">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line bg-surface-2 p-4 transition-colors hover:border-accent/50">
            <span className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
              {file ? <FileText className="size-5" /> : <Upload className="size-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-ink">
                {file ? file.name : "اختر ملفًا من جهازك"}
              </span>
              <span className="block text-[11.5px] text-muted">
                {file ? `${(file.size / 1024).toFixed(0)} KB` : "اسحب الملف هنا أو اضغط للاختيار"}
              </span>
            </span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  if (!form.title) set({ title: f.name.replace(/\.[^.]+$/, "") });
                }
              }}
            />
          </label>
        </Field>

        {existing?.fileName && !file && (
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12.5px] text-muted">
            <Paperclip className="size-3.5" />
            الملف الحالي: {existing.fileName}
          </div>
        )}

        <Field label="ملاحظات">
          <Textarea value={form.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} rows={2} />
        </Field>
        <Field label="الوسوم">
          <TagInput value={form.tags ?? []} onChange={(v) => set({ tags: v })} />
        </Field>
        <div className="flex flex-wrap gap-4">
          <Checkbox
            checked={!!form.confidential}
            onChange={(v) => set({ confidential: v })}
            label="وثيقة سرية"
          />
          <Checkbox
            checked={!!form.requiresSignature}
            onChange={(v) => set({ requiresSignature: v })}
            label="تحتاج توقيع"
          />
        </div>
      </div>
    </Modal>
  );
}

export { TagInput, FormGrid };
