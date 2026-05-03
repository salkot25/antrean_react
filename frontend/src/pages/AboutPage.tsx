import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  Home,
  History,
  ClipboardList,
  BarChart3,
  Info,
  LogOut,
  ShieldCheck,
  Zap,
  Monitor,
  Settings,
  Volume2,
  Bluetooth,
  Star,
  Code2,
  Layers,
  User,
  Calendar,
  Copyright,
  Building,
  Heart,
  MessageCircle,
  Mail,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AboutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waMessage, setWaMessage] = useState("");

  const handleSendWa = () => {
    const text = waMessage.trim();
    if (!text) return;
    const url = `https://wa.me/6281999386550?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setWaModalOpen(false);
    setWaMessage("");
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf4ff] via-[#f7fbff] to-[#eef4fb] flex flex-col items-center font-['Inter']">
      {/* ── WA Popup Modal ── */}
      {waModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/40 backdrop-blur-[2px]"
          onClick={() => setWaModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-200 p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <MessageCircle size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Kirim Pesan WhatsApp
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Kritik, saran, atau pertanyaan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWaModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
                aria-label="Tutup"
              >
                <X size={15} />
              </button>
            </div>

            <textarea
              value={waMessage}
              onChange={(e) => setWaMessage(e.target.value)}
              rows={5}
              placeholder="Tulis kritik, saran, atau pertanyaan Anda di sini..."
              autoFocus
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 resize-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setWaModalOpen(false)}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-300 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSendWa}
                disabled={!waMessage.trim()}
                className="flex-1 min-h-[44px] rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle size={15} />
                Kirim via WA
              </button>
            </div>
          </div>
        </div>
      )}
      {user && isSidebarOpen && (
        <div
          className="sm:hidden fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {user && (
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
              Sistem Antrean Digital
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
      )}

      <header
        className={`bg-primary text-white w-full ${
          user ? "sm:w-[calc(100%-280px)] sm:ml-[280px]" : ""
        } h-16 flex items-center justify-between px-4 sm:px-6 shadow-sm sticky top-0 z-10`}
      >
        {user ? (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="sm:hidden p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Buka menu"
          >
            <Menu size={24} />
          </button>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors text-sm font-medium flex items-center gap-1"
          >
            Kembali
          </button>
        )}
        <div className="text-center leading-tight">
          <h1 className="text-base sm:text-lg font-semibold tracking-tight">
            Tentang Aplikasi
          </h1>
          <p className="text-[11px] sm:text-xs text-white/70">
            Informasi Sistem
          </p>
        </div>
        <button
          type="button"
          onClick={() => setWaModalOpen(true)}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Kirim kritik, saran, atau pertanyaan via WhatsApp"
          title="Kritik, Saran & Pertanyaan"
        >
          <MessageCircle size={22} />
        </button>
      </header>

      <main
        className={`w-full ${
          user ? "sm:w-[calc(100%-280px)] sm:ml-[280px]" : "max-w-2xl mx-auto"
        } max-w-[45.5rem] px-4 sm:px-5 flex-1 flex flex-col pt-5 sm:pt-7 gap-5 pb-10`}
      >
        {/* ── Hero Banner ── */}
        <section className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-primary to-[#003f8a] text-white px-5 py-8 shadow-md">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md">
              <img
                src="/logo.png"
                alt="Logo PLN"
                className="h-10 w-10 object-contain"
              />
            </div>
            <div>
              <h2 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">
                Sistem Antrean Digital
              </h2>
              <p className="text-white/75 text-sm mt-1">
                PLN ULP Salatiga Kota
              </p>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap justify-center">
              <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 text-white text-xs font-semibold rounded-full px-3 py-1">
                <Code2 size={12} /> Versi 2.0.0
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 text-white text-xs font-semibold rounded-full px-3 py-1">
                <Calendar size={12} /> 2025
              </span>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="grid grid-cols-3 gap-3">
          {[
            {
              value: "7+",
              label: "Fitur",
              color: "text-amber-600",
              bg: "bg-amber-50",
              border: "border-amber-200",
            },
            {
              value: "9+",
              label: "Teknologi",
              color: "text-purple-600",
              bg: "bg-purple-50",
              border: "border-purple-200",
            },
            {
              value: "Multi",
              label: "Platform",
              color: "text-emerald-600",
              bg: "bg-emerald-50",
              border: "border-emerald-200",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`bg-white rounded-2xl border ${s.border} shadow-sm p-3 flex flex-col items-center text-center gap-1`}
            >
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] font-medium text-slate-500">
                {s.label}
              </p>
            </div>
          ))}
        </section>

        {/* ── About This App ── */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <Info size={16} />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Tentang Aplikasi Ini
            </h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Sistem Antrean Digital PLN ULP Salatiga merupakan solusi
            komprehensif untuk mengoptimalkan layanan manajemen antrean. Pantau
            antrean loket layanan secara real-time dengan sinkronisasi lintas
            perangkat.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              {
                icon: Zap,
                label: "Real-time",
                sub: "Pembaruan instan",
                bg: "bg-blue-50",
                color: "text-blue-700",
              },
              {
                icon: ShieldCheck,
                label: "Aman",
                sub: "Terproteksi cloud",
                bg: "bg-emerald-50",
                color: "text-emerald-700",
              },
              {
                icon: Monitor,
                label: "Modern",
                sub: "Ramah pengguna",
                bg: "bg-violet-50",
                color: "text-violet-700",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center text-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3"
              >
                <div
                  className={`w-9 h-9 rounded-xl ${item.bg} ${item.color} flex items-center justify-center`}
                >
                  <item.icon size={18} />
                </div>
                <p className="text-xs font-semibold text-slate-800">
                  {item.label}
                </p>
                <p className="text-[10px] text-slate-500">{item.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Core Features ── */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Star size={16} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Fitur Utama</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                icon: ClipboardList,
                label: "Antrean Digital",
                sub: "Ambil & cetak nomor antrean",
                bg: "bg-blue-50",
                color: "text-blue-700",
                border: "border-blue-100",
              },
              {
                icon: Monitor,
                label: "Tampilan Live",
                sub: "Tampilan antrean real-time",
                bg: "bg-emerald-50",
                color: "text-emerald-700",
                border: "border-emerald-100",
              },
              {
                icon: Settings,
                label: "Panel Admin",
                sub: "Sistem manajemen antrean",
                bg: "bg-violet-50",
                color: "text-violet-700",
                border: "border-violet-100",
              },
              {
                icon: BarChart3,
                label: "Pemanggilan Cerdas",
                sub: "Pengumuman antrean otomatis",
                bg: "bg-amber-50",
                color: "text-amber-700",
                border: "border-amber-100",
              },
              {
                icon: Volume2,
                label: "Sistem TTS",
                sub: "Pengumuman suara otomatis",
                bg: "bg-rose-50",
                color: "text-rose-700",
                border: "border-rose-100",
              },
              {
                icon: Bluetooth,
                label: "Cetak Bluetooth",
                sub: "Cetak antrean nirkabel",
                bg: "bg-cyan-50",
                color: "text-cyan-700",
                border: "border-cyan-100",
              },
            ].map((f) => (
              <div
                key={f.label}
                className={`flex items-start gap-3 rounded-2xl border ${f.border} bg-white p-3`}
              >
                <div
                  className={`w-9 h-9 rounded-xl ${f.bg} ${f.color} flex items-center justify-center shrink-0`}
                >
                  <f.icon size={17} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${f.color}`}>
                    {f.label}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tech Stack ── */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Code2 size={16} />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Teknologi yang Digunakan
            </h3>
          </div>
          <p className="text-sm text-slate-500 mb-3">
            Dibangun dengan teknologi modern untuk performa optimal.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              {
                label: "React",
                color: "bg-cyan-100 text-cyan-800 border-cyan-200",
              },
              {
                label: "TypeScript",
                color: "bg-blue-100 text-blue-800 border-blue-200",
              },
              {
                label: "Vite",
                color: "bg-purple-100 text-purple-800 border-purple-200",
              },
              {
                label: "Tailwind CSS",
                color: "bg-sky-100 text-sky-800 border-sky-200",
              },
              {
                label: "Google Apps Script",
                color: "bg-emerald-100 text-emerald-800 border-emerald-200",
              },
              {
                label: "Google Sheets",
                color: "bg-green-100 text-green-800 border-green-200",
              },
              {
                label: "TTS Engine",
                color: "bg-rose-100 text-rose-800 border-rose-200",
              },
              {
                label: "Cetak Bluetooth",
                color: "bg-amber-100 text-amber-800 border-amber-200",
              },
              {
                label: "Multi Platform",
                color: "bg-violet-100 text-violet-800 border-violet-200",
              },
            ].map((t) => (
              <span
                key={t.label}
                className={`text-xs font-semibold px-3 py-1 rounded-full border ${t.color}`}
              >
                {t.label}
              </span>
            ))}
          </div>
        </section>

        {/* ── Development Info ── */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Layers size={16} />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Informasi Pengembangan
            </h3>
          </div>
          <div className="flex flex-col gap-3">
            {[
              {
                icon: Building,
                label: "Organisasi",
                value: "PLN ULP Salatiga Kota",
                color: "text-blue-600",
              },
              {
                icon: User,
                label: "Pengembang",
                value: "Fathur",
                color: "text-violet-600",
              },
              {
                icon: Mail,
                label: "Email",
                value: "fathur.rohim@pln.co.id",
                color: "text-cyan-600",
              },
              {
                icon: Calendar,
                label: "Tahun",
                value: "2025",
                color: "text-amber-600",
              },
              {
                icon: Copyright,
                label: "Hak Cipta",
                value: "© 2025 Sistem Antrean Digital Salatiga",
                color: "text-emerald-600",
              },
            ].map((d) => (
              <div key={d.label} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center ${d.color}`}
                >
                  <d.icon size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">
                    {d.label}
                  </p>
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {d.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Thank You ── */}
        <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#e91e8c] to-[#c2185b] text-white px-5 py-8 shadow-md text-center">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
              <Heart size={22} className="fill-white text-white" />
            </div>
            <h3 className="text-lg font-extrabold">Terima Kasih!</h3>
            <p className="text-white/80 text-sm max-w-xs">
              Terima kasih telah menggunakan Sistem Antrean Digital PLN.
              Kepuasan Anda adalah prioritas kami.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
