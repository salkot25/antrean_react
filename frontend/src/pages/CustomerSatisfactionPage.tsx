import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  Home,
  History,
  ClipboardList,
  Info,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Send,
  Sparkles,
} from "lucide-react";
import { submitCustomerSatisfaction } from "../api";
import { useAuth } from "../context/AuthContext";

type SatisfactionOption = "Sangat Puas" | "Puas" | "Kurang Puas" | "Tidak Puas";

const SATISFACTION_OPTIONS: SatisfactionOption[] = [
  "Sangat Puas",
  "Puas",
  "Kurang Puas",
  "Tidak Puas",
];

const SAT_OPTION_THEME: Record<
  SatisfactionOption,
  {
    selected: string;
    radio: string;
  }
> = {
  "Sangat Puas": {
    selected: "border-emerald-400 bg-emerald-50 text-emerald-800",
    radio: "accent-emerald-600",
  },
  Puas: {
    selected: "border-cyan-400 bg-cyan-50 text-cyan-800",
    radio: "accent-cyan-600",
  },
  "Kurang Puas": {
    selected: "border-amber-400 bg-amber-50 text-amber-800",
    radio: "accent-amber-600",
  },
  "Tidak Puas": {
    selected: "border-rose-400 bg-rose-50 text-rose-800",
    radio: "accent-rose-600",
  },
};

const today = new Date().toISOString().slice(0, 10);

export default function CustomerSatisfactionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [inputDate, setInputDate] = useState(today);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [satisfaction, setSatisfaction] = useState<SatisfactionOption | "">("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [autoRedirectEnabled, setAutoRedirectEnabled] = useState(true);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  const sidebarNavItems = [
    { name: "Ambil Antrean", path: "/ambil", icon: Home },
    { name: "Riwayat Cetak", path: "/history", icon: History },
    {
      name: "Survey Kepuasan",
      path: "/survey-kepuasan",
      icon: ClipboardList,
    },
    { name: "About", path: "/about", icon: Info },
  ];

  const initials = (name?: string) =>
    (name || "U")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleLogout = () => {
    setIsSidebarOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (!isSubmitted || !autoRedirectEnabled) return;

    const timer = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/ambil");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted, autoRedirectEnabled, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputDate || !phoneNumber.trim() || !satisfaction) {
      alert("Tanggal, nomor HP, dan penilaian kepuasan wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        inputDate,
        phoneNumber: phoneNumber.trim(),
        satisfaction,
        feedback: feedback.trim(),
        source: "kiosk",
      };

      const result = await submitCustomerSatisfaction(payload);
      if (!result?.success) {
        throw new Error(result?.error || "Gagal menyimpan survey");
      }

      setIsSubmitted(true);
      setAutoRedirectEnabled(true);
      setRedirectCountdown(5);
      setPhoneNumber("");
      setSatisfaction("");
      setFeedback("");
      setInputDate(today);
    } catch {
      alert("Gagal menyimpan survey. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf4ff] via-[#f7fbff] to-[#eef4fb] flex flex-col items-center font-['Inter']">
      {isSidebarOpen && (
        <div
          className="sm:hidden fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-[280px] z-50 bg-white/95 backdrop-blur-sm border-r border-slate-200 transition-transform duration-200 flex flex-col sm:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="sm:hidden px-4 py-3 border-b border-slate-200 flex items-center justify-end">
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-600 hover:bg-slate-100"
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-200">
          <img
            src="/logo.png"
            alt="PLN Logo"
            className="h-10 w-10 object-contain"
          />
          <span className="text-sm font-bold text-[#002e5b] leading-tight">
            QMS PLN
            <br />
            <span className="text-xs font-medium text-slate-500">
              PLN ULP Salatiga
            </span>
          </span>
        </div>

        <div className="flex-1 flex flex-col gap-2 px-2 py-3">
          {sidebarNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.name}
                onClick={() => {
                  setIsSidebarOpen(false);
                  navigate(item.path);
                }}
                className={`mx-2 flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={20} />
                <span className="font-medium text-sm">{item.name}</span>
              </button>
            );
          })}
        </div>

        <div className="px-4 mt-auto border-t border-slate-200 pt-4 pb-4 bg-slate-50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsSidebarOpen(false);
                navigate("/profile");
              }}
              className="flex-1 px-2 py-2 flex items-center gap-3 rounded-xl hover:bg-slate-100 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                {initials(user?.fullName || user?.username)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#005BAC] truncate">
                  {user?.fullName || user?.username || "Operator"}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <ShieldCheck size={11} />
                  {user?.role
                    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                    : "User"}
                </p>
              </div>
            </button>

            <button
              onClick={handleLogout}
              className="w-10 h-10 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-600 transition-colors flex items-center justify-center"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <header className="bg-primary text-white w-full sm:w-[calc(100%-280px)] sm:ml-[280px] h-16 flex items-center justify-between px-4 sm:px-6 shadow-sm sticky top-0 z-10">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="sm:hidden p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Buka menu"
        >
          <Menu size={24} />
        </button>
        <div className="text-center leading-tight">
          <h1 className="text-base sm:text-lg font-semibold tracking-tight">
            Survey Kepuasan
          </h1>
          <p className="text-[11px] sm:text-xs text-white/70">
            Evaluasi Layanan Pelanggan
          </p>
        </div>
        <div className="w-10" />
      </header>

      <main className="w-full sm:w-[calc(100%-280px)] sm:ml-[280px] max-w-[45.5rem] px-4 sm:px-5 flex-1 flex flex-col pt-5 sm:pt-7 gap-4 pb-10">
        {isSubmitted ? (
          <section className="w-full">
            <div className="relative w-full bg-white rounded-3xl shadow-sm border border-white/70 px-5 py-8 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-emerald-100/70 blur-2xl" />
              <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-cyan-100/70 blur-2xl" />
              <div className="relative flex flex-col items-center gap-4 text-center">
                <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm">
                  <CheckCircle2 size={42} />
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide">
                  <Sparkles size={14} />
                  Survey Berhasil
                </div>

                <div>
                  <h2 className="text-2xl sm:text-[30px] font-extrabold text-primary mb-1 tracking-tight">
                    Terima Kasih
                  </h2>
                  <p className="text-on-surface-variant text-sm sm:text-base max-w-lg">
                    Survey kepuasan Anda berhasil dikirim. Masukan Anda sangat
                    berarti untuk meningkatkan kualitas pelayanan kami.
                  </p>
                </div>

                <div className="w-full pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setAutoRedirectEnabled(true);
                      setRedirectCountdown(5);
                    }}
                    className="w-full min-h-[52px] rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Isi Survey Lagi
                  </button>
                  <button
                    onClick={() => navigate("/ambil")}
                    className="w-full min-h-[52px] rounded-xl bg-primary text-white font-semibold hover:bg-primary-container transition-colors flex items-center justify-center gap-2"
                  >
                    <Home size={18} />
                    Kembali ke Ambil Antrean
                  </button>
                </div>

                <div className="w-full pt-1 text-center">
                  {autoRedirectEnabled ? (
                    <div className="inline-flex items-center gap-2 text-xs text-slate-500">
                      <span>
                        Otomatis kembali ke Ambil Antrean dalam{" "}
                        {redirectCountdown} detik
                      </span>
                      <button
                        onClick={() => setAutoRedirectEnabled(false)}
                        className="text-primary font-semibold hover:underline"
                      >
                        Cancel Redirect
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">
                      Auto-redirect dibatalkan.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <>
            <div className="relative w-full bg-white rounded-3xl shadow-sm border border-white/70 px-5 py-6 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-cyan-100/60 blur-2xl" />
              <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-blue-100/70 blur-2xl" />
              <div className="relative flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <img
                    src="/logo.png"
                    alt="Logo PLN"
                    className="h-10 w-10 object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-[28px] font-extrabold text-primary mb-1 tracking-tight">
                    Form Survey Kepuasan
                  </h2>
                  <p className="text-on-surface-variant text-sm">
                    Mohon bantu kami meningkatkan kualitas pelayanan loket.
                  </p>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="w-full bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col gap-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-sm font-medium text-gray-700">
                  Tanggal Input
                  <input
                    type="date"
                    value={inputDate}
                    onChange={(e) => setInputDate(e.target.value)}
                    className="mt-1 w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </label>

                <label className="text-sm font-medium text-gray-700">
                  Nomor HP Pelanggan
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="mt-1 w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800 mb-3">
                  Bagaimana perasaan anda setelah mendapatkan pelayanan dari
                  Petugas yang berada di Loket Pelayanan?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SATISFACTION_OPTIONS.map((option) => (
                    <label
                      key={option}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                        satisfaction === option
                          ? SAT_OPTION_THEME[option].selected
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="satisfaction"
                        value={option}
                        checked={satisfaction === option}
                        onChange={() => setSatisfaction(option)}
                        className={SAT_OPTION_THEME[option].radio}
                      />
                      <span className="text-sm font-medium">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="text-sm font-medium text-gray-700">
                Berikan saran dan kritik untuk meningkatkan pelayanan
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  placeholder="Tuliskan saran dan kritik Anda di sini..."
                  className="mt-1 w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full min-h-[52px] bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-container active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <CheckCircle2 size={18} />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Submit
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
