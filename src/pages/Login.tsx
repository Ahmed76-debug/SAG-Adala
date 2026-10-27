import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Scale3D,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Lock,
  User2,
  Award,
  BarChart3,
  Library,
  AlarmClock,
} from "lucide-//react"; // تأكد من المسار الصحيح هنا
import { useApp } from "@/state/AppProvider";
import { Button, Input, Field, Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

const DEMO_ACCOUNTS = [
  { name: "مدير النظام", username: "admin", password: "admin123" },
];

const HIGHLIGHTS = [
  { icon: Scale3D, title: "إدارة القضايا والموكلين", text: "ملف واحد لكل قضية يجمع العقود والأتعاب والمذكرات والمواعيد." },
  { icon: AlarmClock, title: "تذكير بالمواعيد", text: "تنبيهات قبل المواعيد النظامية والجلسات بأيام، داخل التطبيق وعلى الجهاز." },
  { icon: Library, title: "مكتبة قانونية", text: "كتب ومقالات ودورات مصورة مع ملاحظاتك وتقدمك في القراءة." },
  { icon: Award, title: "بورتفوليو احترافي", text: "صفحة عامة تبرز خبرتك ونتائجك وإنجازاتك." },
  { icon: BarChart3, title: "تقارير وتحليلات", text: "أداء المكتب، الإيرادات، توزيع القضايا، ومعدل الكسب." },
];

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("123"); // تم التعديل ليتطابق مع MongoDB
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // تنبيه 1: للتأكد أن الزر يعمل
    alert("1. تم الضغط على زر الدخول.. جاري الاتصال بالسيرفر");
    
    setError("");
    setLoading(true);

    try {
      // إنشاء "موقت" لكي لا تدور الدائرة للأبد
      const loginPromise = login(username.trim(), password);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 10000)
      );

      // تنفيذ أيهما أسرع: الدخول أو انتهاء الوقت
      const ok = await Promise.race([loginPromise, timeoutPromise]);
      
      if (!ok) {
        setError("بيانات الدخول غير صحيحة. تحقّق من اسم المستخدم وكلمة المرور.");
      } else {
        alert("تم تسجيل الدخول بنجاح!");
        navigate("/");
      }
    } catch (err: any) {
      if (err.message === "Timeout") {
        setError("السيرفر استغرق وقتاً طويلاً للرد. يرجى المحاولة مرة أخرى.");
      } else {
        setError("حدث خطأ تقني: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const quick = async (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setLoading(true);
    setError("");
    try {
      const ok = await login(u, p);
      if (ok) navigate("/");
      else setError("تعذّر الدخول بالحساب التجريبي.");
    } catch (err) {
      setError("خطأ في الاتصال بالحساب التجريبي.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-bg">
      {/* الجانب الأيمن — الهوية */}
      <div className="relative hidden w-[54%] flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <div className="mesh absolute inset-0 opacity-90" />
        <div className="absolute -start-24 top-1/4 size-[420px] rounded-full bg-accent/12 blur-[100px]" />
        <div className="absolute -end-20 bottom-10 size-[380px] rounded-full bg-info/12 blur-[100px]" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-2 to-accent text-accent-ink shadow-xl">
              <Scale3D className="size-6" />
            </div>
            <div className="relative">
              <div className="font-display text-[20px] font-bold text-ink">عدالة</div>
              <div className="text-[12px] text-muted">منصة إدارة أعمال المحاماة</div>
            </div>
          </div>
        </div>

        <div className="relative max-w-xl">
          <Badge tone="accent" icon={Sparkles} className="mb-5">
            نظام متكامل لمكاتب المحاماة
          </Badge>
          <h1 className="text-[40px] font-black leading-[1.15] text-ink xl:text-[46px]">
            حيث يلتزم <span className="grad-text">المحاماة</span>
            <br />
            بالتفاصيل الصغيرة التي تصنع الفرق.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-muted">
            منصة واحدة تجمع ملفات القضايا والموكلين والاتفاقيات والأتعاب والوثائق والأرشيف والمكتبة
            القانونية — بتقنية تحليلية دقيقة أُنجزت لخدمة يوميات المحامٍ المحترف.
          </p>

          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            {HIGHLIGHTS.map((h) => (
              <div
                key={h.title}
                className="group rounded-2xl border border-line bg-surface/60 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-surface"
              >
                <h.icon className="mb-2.5 size-5 text-accent" />
                <div className="text-[13.5px] font-bold text-ink">{h.title}</div>
                <div className="mt-1 text-[12px] leading-relaxed text-muted">{h.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-[12px] text-faint">
          <ShieldCheck className="size-4" />
          بياناتك محفوظة سحابياً في MongoDB Atlas وتدار عبر Vercel
        </div>
      </div>

      {/* نموذج الدخول */}
      <div className="relative flex w-full flex-col justify-center px-5 py-10 sm:px-10 lg:w-[46%] xl:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-2 to-accent text-accent-ink">
              <Scale3D className="size-5" />
            </div>
            <div className="relative">
              <div className="font-display text-[17px] font-bold">عدالة</div>
              <div className="text-[11.5px] text-muted">إدارة أعمال المحاماة</div>
            </div>
          </div>

          <h2 className="text-[26px] font-bold text-ink">تسجيل الدخول</h2>
          <p className="mt-1.5 text-[13.5px] text-muted">
            أدخل بياناتك للوصول إلى مكتبك.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <Field label="اسم المستخدم" required>
              <div className="relative">
                <User2 className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="ps-10"
                  autoComplete="username"
                />
              </div>
            </Field>

            <Field label="كلمة المرور" required>
              <div className="relative">
                <Lock className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
                <Input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="ps-10 pe-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-faint transition-colors hover:text-ink"
                  aria-label={show ? "إخفاء" : "إظهار"}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            {error && (
              <div className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[12.5px] text-danger">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" block loading={loading} icon={ArrowLeft} className="!flex-row-reverse justify-center">
              دخول إلى المكتب
            </Button>
          </form>

          <div className="my-7 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-[11.5px] text-faint">حسابات تجريبية جاهزة</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.username}
                onClick={() => quick(a.username, a.password)}
                disabled={loading}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-start transition-all",
                  "hover:-translate-y-0.5 hover:border-accent/45 hover:bg-surface-2 disabled:opacity-60",
                )}
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <CheckCircle2 className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">{a.name}</span>
                  <span className="block text-[11px] text-muted">
                    {a.username} · {a.password}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <p className="mt-7 text-center text-[11.5px] leading-relaxed text-faint">
            بدخولك توافق على سياسة السرية الخاصة بالمكتب. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </div>
  );
}
