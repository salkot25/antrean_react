import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, KeyRound, Save } from "lucide-react";
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
    <div className="min-h-screen bg-[#f9f9ff] flex flex-col font-['Inter']">
      <header className="bg-[#002e5b] text-white w-full h-16 flex items-center justify-between px-4 shadow-md sticky top-0 z-10">
        <button
          onClick={() => navigate("/profile")}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Kembali"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">Ubah Password</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-8 pb-12">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-surface-variant p-5 flex flex-col gap-4"
        >
          <div className="flex items-center gap-2 text-[#002e5b] mb-1">
            <KeyRound size={20} />
            <p className="font-semibold">Perbarui Password Akun</p>
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
            className="mt-2 w-full bg-[#002e5b] text-white py-3.5 rounded-xl font-semibold hover:bg-[#004482] active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {saving ? "Menyimpan..." : "Simpan Password"}
          </button>
        </form>
      </main>
    </div>
  );
}
