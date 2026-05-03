import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, ShieldCheck, Zap, X } from "lucide-react";
import { getConfig } from "../api";

export default function LoginPage() {
  const WHATSAPP_PHONE = "6281999386550";
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || "/admin/dashboard";
  const isSessionExpired =
    new URLSearchParams(location.search).get("session") === "expired";

  const [officeName, setOfficeName] = useState("PLN ULP Salatiga");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  useEffect(() => {
    getConfig()
      .then((data) => {
        if (data?.officeName) setOfficeName(data.officeName);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }

    setLoading(true);
    const result = await login(username.trim(), password);
    setLoading(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || "Login gagal.");
    }
  };

  const handleForgotSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!forgotUsername.trim() || !forgotMessage.trim()) {
      setForgotError("Username dan pesan wajib diisi.");
      return;
    }

    const sentAt = new Date().toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const accessView = /Android/i.test(navigator.userAgent || "")
      ? "Android"
      : /Mobi|iPhone|iPad|Mobile/i.test(navigator.userAgent || "")
        ? "Mobile Web"
        : "Web Desktop";
    const text = [
      "Halo tim administrator PLN ULP Salatiga,",
      "",
      "Saya ingin meminta bantuan terkait akun login saya.",
      `Username: ${forgotUsername.trim()}`,
      `Pesan: ${forgotMessage.trim()}`,
      "",
      "Sumber kirim: Halaman Login - Hubungi Administrator",
      `Tampilan akses: ${accessView}`,
      "Jenis pengirim: Pengunjung Umum",
      `Pengirim: ${forgotUsername.trim()}`,
      "Peran: Belum Login",
      `Waktu kirim: ${sentAt}`,
    ].join("\n");

    const encodedText = encodeURIComponent(text);
    const appUrl = `whatsapp://send?phone=${WHATSAPP_PHONE}&text=${encodedText}`;
    const intentWhatsapp = `intent://send?phone=${WHATSAPP_PHONE}&text=${encodedText}#Intent;scheme=whatsapp;package=com.whatsapp;end`;
    const intentWhatsappBusiness = `intent://send?phone=${WHATSAPP_PHONE}&text=${encodedText}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end`;
    const fallbackUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodedText}`;
    const isAndroid = /Android/i.test(navigator.userAgent || "");
    const isAndroidWebView =
      isAndroid &&
      (/(;\s?wv\))|\bwv\b/i.test(navigator.userAgent || "") ||
        (/Version\/\d+\.\d+/i.test(navigator.userAgent || "") &&
          !/Chrome\/\d+/i.test(navigator.userAgent || "")));

    if (isAndroidWebView) {
      // In Android WebView, intent/custom schemes often trigger a false offline error page.
      window.location.href = fallbackUrl;
    } else if (isAndroid) {
      [intentWhatsapp, intentWhatsappBusiness, appUrl, fallbackUrl].forEach(
        (url, index) => {
          window.setTimeout(() => {
            if (document.visibilityState === "visible") {
              window.location.href = url;
            }
          }, index * 700);
        },
      );
    } else {
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
    }

    setIsForgotModalOpen(false);
    setForgotUsername("");
    setForgotMessage("");
    setForgotError("");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left panel — branding (Desktop only) ── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-primary px-16 py-14">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Zap size={22} className="text-white" fill="white" />
          </div>
          <span className="text-white text-lg font-bold tracking-tight">
            {officeName}
          </span>
        </div>

        {/* Center copy */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-semibold uppercase tracking-widest">
            <ShieldCheck size={14} />
            Sistem Antrean Digital
          </div>
          <h1 className="text-white text-5xl font-extrabold leading-tight">
            Kelola Antrean
            <br />
            Lebih Efisien
          </h1>
          <p className="text-white/70 text-base leading-relaxed max-w-md">
            Sistem antrean digital terpadu untuk {officeName}. Pantau status
            layanan, kelola antrean, dan tingkatkan kepuasan pelanggan secara
            real-time.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3 pt-2">
            {[
              "Dashboard Live",
              "Notifikasi TTS",
              "Laporan Harian",
              "Multi Loket",
            ].map((f) => (
              <span
                key={f}
                className="px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium"
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-white/40 text-xs">
          © 2025 {officeName}. Hak cipta dilindungi.
        </p>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="flex-1 flex flex-col min-h-screen bg-white lg:bg-background">
        {/* Centered content */}
        <div className="flex-1 flex items-center justify-center px-5 py-8">
          <div className="w-full max-w-md">
            {/* ── Mobile branding — clean minimal ── */}
            <div className="lg:hidden flex flex-col items-center gap-4 mb-10 pt-4">
              <div className="w-20 h-20 rounded-2xl bg-white shadow-[0_2px_24px_rgba(0,46,91,0.10)] border border-slate-100 flex items-center justify-center p-3">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-center">
                <h1 className="text-[#002e5b] text-xl font-extrabold tracking-tight">
                  Sistem Antrean Digital
                </h1>
                <p className="text-slate-400 text-xs font-medium mt-1">
                  {officeName}
                </p>
              </div>
            </div>

            {/* Desktop Title */}
            <div className="hidden lg:block mb-8">
              <h2 className="text-3xl font-extrabold text-on-surface">
                Selamat Datang
              </h2>
              <p className="mt-2 text-on-surface-variant text-sm">
                Masuk ke akun Anda untuk mengakses panel administrasi.
              </p>
            </div>

            {/* Mobile Title */}
            <div className="lg:hidden mb-6">
              <h2 className="text-xl font-bold text-slate-800 text-center">
                Masuk ke Akun
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Sesi berakhir banner */}
              {isSessionExpired && !error && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                  <span className="shrink-0 mt-0.5">⏱️</span>
                  <span>
                    Sesi login Anda telah berakhir. Silakan login kembali.
                  </span>
                </div>
              )}

              {/* Error banner */}
              {error && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 lg:rounded-lg lg:bg-error-container lg:border-error/30 lg:text-on-error-container">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-xs font-semibold text-slate-500 lg:text-on-surface-variant uppercase tracking-wider mb-1.5"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-50 lg:bg-surface-container-low border border-slate-200 lg:border-outline-variant rounded-xl lg:rounded-lg px-4 py-3.5 lg:py-3 text-sm text-slate-800 lg:text-on-surface placeholder:text-slate-400 lg:placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-60"
                  placeholder="Masukkan username"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-500 lg:text-on-surface-variant uppercase tracking-wider mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full bg-slate-50 lg:bg-surface-container-low border border-slate-200 lg:border-outline-variant rounded-xl lg:rounded-lg px-4 py-3.5 lg:py-3 pr-11 text-sm text-slate-800 lg:text-on-surface placeholder:text-slate-400 lg:placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-60"
                    placeholder="Masukkan password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 lg:text-outline hover:text-slate-600 lg:hover:text-on-surface transition-colors p-1"
                    tabIndex={-1}
                    aria-label={
                      showPassword
                        ? "Sembunyikan password"
                        : "Tampilkan password"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#002e5b] lg:bg-primary hover:bg-[#003f7a] lg:hover:bg-primary-container text-white font-semibold py-3.5 lg:py-3 rounded-xl lg:rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  "Masuk"
                )}
              </button>
            </form>

            {/* Hint */}
            <div className="mt-6 text-center text-xs text-slate-400 lg:text-outline">
              <p>
                Lupa password?{" "}
                <button
                  onClick={() => {
                    setForgotError("");
                    setIsForgotModalOpen(true);
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  Hubungi administrator
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Footer — version & about */}
        <div className="w-full flex items-center justify-center gap-3 text-xs pb-5 pt-2">
          <span className="bg-slate-100 text-slate-400 px-2.5 py-1 rounded-md font-semibold">
            v2.0.0
          </span>
          <span className="text-slate-300">•</span>
          <button
            onClick={() => navigate("/about")}
            className="text-slate-400 hover:text-primary transition-colors font-medium"
          >
            Tentang Aplikasi
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Lupa Password</h3>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleForgotSubmit} className="p-5 space-y-4">
              {forgotError && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {forgotError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  placeholder="Masukkan username Anda"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Pesan
                </label>
                <textarea
                  value={forgotMessage}
                  onChange={(e) => setForgotMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none h-24"
                  placeholder="Contoh: Tolong reset password saya karena lupa..."
                />
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Pesan akan dikirim dengan format yang sama di mobile maupun web,
                termasuk sumber kirim dan waktu kirim.
              </p>
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  Kirim via WhatsApp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
