import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, ShieldCheck, Zap, X } from "lucide-react";
import { getConfig } from "../api";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || "/admin/dashboard";

  const [officeName, setOfficeName] = useState("PLN ULP Salatiga");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");

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
      alert("Username dan pesan wajib diisi.");
      return;
    }
    const waNumber = "6281999386550";
    const text = `Halo Admin,\nSaya ingin meminta bantuan terkait akun saya.\n\nUsername: ${forgotUsername.trim()}\nPesan: ${forgotMessage.trim()}`;
    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
    setIsForgotModalOpen(false);
    setForgotUsername("");
    setForgotMessage("");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left panel — branding ── */}
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
            Sistem Manajemen Antrean
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
      <div className="flex-1 relative h-screen overflow-y-auto bg-slate-50 lg:bg-background flex flex-col">
        {/* Mobile colored hero background with sharp diagonal cut */}
        <div 
          className="absolute top-0 left-0 w-full h-[55%] bg-gradient-to-br from-[#002e5b] via-primary to-[#005BAC] lg:hidden z-0" 
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 80%, 0 100%)' }}
        />

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full px-5 pt-10 pb-6">
          {/* Mobile logo in Hero */}
          <div className="lg:hidden flex flex-col items-center justify-center gap-3 mb-8 w-full mt-2">
            <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white/10 backdrop-blur-md shadow-xl border border-white/20 flex items-center justify-center p-2.5">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-white text-2xl font-extrabold tracking-tight text-center drop-shadow-sm mt-1">
              Sistem Antrean Digital
            </span>
          </div>

          <div className="w-full max-w-md bg-white lg:bg-transparent rounded-3xl lg:rounded-none shadow-xl lg:shadow-none p-7 lg:p-0 border border-slate-100 lg:border-none">
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
            <div className="lg:hidden text-center mb-7">
              <h2 className="text-2xl font-bold text-slate-800">
                Selamat Datang
              </h2>
              <p className="mt-1.5 text-slate-500 text-sm">
                Silakan masuk untuk melanjutkan
              </p>
            </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-error-container border border-error/30 text-sm text-on-error-container">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5"
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
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors disabled:opacity-60"
                placeholder="Masukkan username"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5"
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
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 pr-11 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors disabled:opacity-60"
                  placeholder="Masukkan password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors p-1"
                  tabIndex={-1}
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
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
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-container text-white font-semibold py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
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
          <div className="mt-8 text-center text-xs text-outline">
            <p>
              Lupa password?{" "}
              <button
                onClick={() => setIsForgotModalOpen(true)}
                className="text-primary hover:underline font-medium"
              >
                Hubungi administrator sistem
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Footer Info pinned to bottom of right panel */}
      <div className="w-full flex items-center justify-center gap-3 text-xs mt-auto pt-6 pb-2 lg:hidden">
        <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md font-semibold">
          Versi 2.0.0
        </span>
        <button
          onClick={() => navigate("/about")}
          className="text-slate-500 hover:text-primary transition-colors font-medium flex items-center gap-1.5"
        >
          Tentang Aplikasi
        </button>
      </div>

      {/* Footer Info for Desktop pinned to bottom of right panel */}
      <div className="hidden lg:flex absolute bottom-8 right-8 items-center gap-3 text-xs">
        <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md font-semibold">
          Versi 2.0.0
        </span>
        <button
          onClick={() => navigate("/about")}
          className="text-slate-500 hover:text-primary transition-colors font-medium flex items-center gap-1.5"
        >
          Tentang Aplikasi
        </button>
      </div>
    </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
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
