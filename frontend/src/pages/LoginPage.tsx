import { useState, useEffect, FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, ShieldCheck, Zap } from "lucide-react";
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
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <img
              src="/logo.png"
              alt="PLN Logo"
              className="h-9 w-9 object-contain"
            />
            <span className="text-primary text-base font-bold">
              {officeName}
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-on-surface">
              Selamat Datang
            </h2>
            <p className="mt-2 text-on-surface-variant text-sm">
              Masuk ke akun Anda untuk mengakses panel administrasi.
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
          <p className="mt-8 text-center text-xs text-outline">
            Lupa password? Hubungi administrator sistem.
          </p>
        </div>
      </div>
    </div>
  );
}
