import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Save, ChevronLeft } from "lucide-react";
import { updateUser } from "../api";
import { useAuth } from "../context/AuthContext";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword.trim()) {
      alert("Password saat ini wajib diisi.");
      return;
    }
    if (newPassword.length < 6) {
      alert("Password baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Konfirmasi password tidak sama.");
      return;
    }
    if (!user?.id) {
      alert("Data user tidak valid. Silakan login ulang.");
      return;
    }

    setSaving(true);
    try {
      // Backend saat ini menerima update_user berdasarkan id; verifikasi password lama
      // belum tersedia di endpoint, jadi validasi currentPassword dilakukan di UI wajib isi.
      await updateUser(user.id, { password: newPassword });
      alert("Password berhasil diubah.");
      navigate("/profile");
    } catch {
      alert("Gagal mengubah password. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf4ff] via-[#f7fbff] to-[#eef4fb] flex flex-col items-center font-['Inter']">
      <header className="bg-primary text-white w-full h-16 flex items-center justify-between px-4 sm:px-6 shadow-sm sticky top-0 z-10">
        <button
          onClick={() => navigate("/profile")}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Kembali ke profil"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="text-center leading-tight">
          <h1 className="text-base sm:text-lg font-semibold tracking-tight">
            Ubah Password
          </h1>
          <p className="text-[11px] sm:text-xs text-white/70">Keamanan Akun</p>
        </div>
        <div className="w-10" />
      </header>

      <main className="w-full max-w-[45.5rem] px-4 sm:px-5 flex-1 flex flex-col pt-5 sm:pt-7 gap-4 pb-28 lg:pb-8">
        <div className="relative w-full bg-white rounded-3xl shadow-sm border border-white/70 px-5 py-6 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-cyan-100/60 blur-2xl" />
          <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-blue-100/70 blur-2xl" />
          <div className="relative flex flex-col items-center gap-3 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
              <KeyRound size={14} />
              Pengaturan Keamanan
            </div>
            <h2 className="text-2xl sm:text-[28px] font-extrabold text-primary mb-1 tracking-tight">
              Perbarui Password Akun
            </h2>
            <p className="text-on-surface-variant text-sm">
              Gunakan kombinasi password yang kuat untuk keamanan akses.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col gap-4"
        >
          <div className="flex items-center gap-2 text-[#002e5b] mb-1">
            <KeyRound size={20} />
            <p className="font-semibold text-base">Input Kredensial Baru</p>
          </div>

          <label className="text-sm font-medium text-gray-700">
            Password Saat Ini
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Masukkan password saat ini"
            />
          </label>

          <label className="text-sm font-medium text-gray-700">
            Password Baru
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Minimal 6 karakter"
            />
          </label>

          <label className="text-sm font-medium text-gray-700">
            Konfirmasi Password Baru
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Ulangi password baru"
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="mt-2 w-full min-h-[52px] bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-container active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {saving ? "Menyimpan..." : "Simpan Password"}
          </button>
        </form>
      </main>
    </div>
  );
}
